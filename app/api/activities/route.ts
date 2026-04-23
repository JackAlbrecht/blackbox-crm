import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/activities { activity_type, subject?, body?, contact_id?, deal_id?, company_id?, duration_sec?, outcome?, occurred_at? }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const body = await req.json();
  const allowed = ['call','email','meeting','note','task','stage_change','status_change','file','sms'];
  if (!allowed.includes(body.activity_type)) {
    return NextResponse.json({ error: 'invalid activity_type' }, { status: 400 });
  }

  const row = {
    tenant_id: profile.tenant_id,
    user_id: user.id,
    activity_type: body.activity_type,
    subject: body.subject || null,
    body: body.body || null,
    contact_id: body.contact_id || null,
    deal_id: body.deal_id || null,
    company_id: body.company_id || null,
    duration_sec: body.duration_sec ?? null,
    outcome: body.outcome || null,
    occurred_at: body.occurred_at || new Date().toISOString(),
  };

  const { data, error } = await supabase.from('activities').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ activity: data });
}
