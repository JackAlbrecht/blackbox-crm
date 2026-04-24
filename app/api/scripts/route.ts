import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('call_scripts').select('*').order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scripts: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const b = await req.json();
  const title = (b.title || '').trim();
  const body  = (b.body  || '').trim();
  if (!title || !body) return NextResponse.json({ error: 'title and body required' }, { status: 400 });

  const row: any = { tenant_id: profile.tenant_id, title, body, created_by: user.id };
  if (b.id) {
    const { error } = await supabase.from('call_scripts').update({ title, body, updated_at: new Date().toISOString() }).eq('id', b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: b.id });
  }
  const { data, error } = await supabase.from('call_scripts').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ script: data });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('call_scripts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
