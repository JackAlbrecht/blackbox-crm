import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await supabase
    .from('lead_lists')
    .insert({
      tenant_id: profile.tenant_id,
      name,
      description: body.description?.trim() || null,
      source: body.source?.trim() || null,
      created_by: user.id,
    })
    .select('id, name')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ list: data });
}
