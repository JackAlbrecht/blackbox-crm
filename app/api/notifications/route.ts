import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });
  const { data } = await supabase.from('notifications')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(25);
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, all } = await req.json();
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id);
  if (id) q = q.eq('id', id);
  if (all) q = q.is('read_at', null);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
