import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  const tenantId = (profile as any)?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const sig = crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(tenantId).digest('hex').slice(0, 24);
  const origin = process.env.VERCEL_URL ? `https://crm.blackboxadvancements.com` : '';
  const url = `${origin}/api/calendar/feed.ics?token=${tenantId}.${sig}`;
  return NextResponse.json({ url });
}
