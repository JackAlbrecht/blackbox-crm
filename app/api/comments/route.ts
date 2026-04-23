import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const body = await req.json();
  const row: any = {
    tenant_id: profile.tenant_id,
    user_id: user.id,
    body: (body.body || '').trim(),
    contact_id: body.contact_id || null,
    company_id: body.company_id || null,
    deal_id: body.deal_id || null,
  };
  if (!row.body) return NextResponse.json({ error: 'body required' }, { status: 400 });
  const { data, error } = await supabase.from('record_comments').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comment: data });
}
