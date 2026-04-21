import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

/**
 * POST /api/campaigns/send
 * body: { campaign_id: string }
 *
 * Sends campaign.body to every contact in the tenant with a non-null email.
 * Uses RESEND_API_KEY from env. If unset, returns a helpful error.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaign_id } = await req.json().catch(() => ({ campaign_id: null }));
  if (!campaign_id) return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });

  // Load campaign (RLS ensures this is the user's tenant)
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns').select('*').eq('id', campaign_id).maybeSingle();
  if (cErr || !campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Load contacts with emails for this tenant (RLS-scoped)
  const { data: contacts } = await supabase
    .from('contacts').select('id, first_name, last_name, email, company')
    .not('email', 'is', null);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error:
        'Email sending is not configured yet. Add RESEND_API_KEY in your Vercel env vars and redeploy. See README for setup.',
    }, { status: 500 });
  }

  const admin = createAdminClient();
  await admin.from('campaigns').update({ status: 'sending' }).eq('id', campaign_id);

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of contacts || []) {
    const html = (campaign.body || '')
      .replaceAll('{{first_name}}', c.first_name || '')
      .replaceAll('{{last_name}}', c.last_name || '')
      .replaceAll('{{company}}', c.company || '');

    try {
      const { error } = await resend.emails.send({
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: c.email!,
        subject: campaign.subject,
        html,
      });
      if (error) { failed++; errors.push(error.message); }
      else sent++;
    } catch (e: any) {
      failed++;
      errors.push(e?.message || 'unknown error');
    }
  }

  await admin.from('campaigns').update({
    status: failed > 0 && sent === 0 ? 'failed' : 'sent',
    sent_count: sent,
    sent_at: new Date().toISOString(),
  }).eq('id', campaign_id);

  return NextResponse.json({ count: sent, failed, errors: errors.slice(0, 5) });
}
