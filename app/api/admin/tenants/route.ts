import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    || `workspace-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('is_super_admin').eq('user_id', user.id).maybeSingle();
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const admin = createAdminClient();
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (true) {
    const { data: exists } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${++n}`;
  }

  const { data: tenant, error } = await admin.from('tenants').insert({ name, slug }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.rpc('seed_default_pipeline', { p_tenant: tenant.id });

  return NextResponse.json({ tenant });
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('is_super_admin').eq('user_id', user.id).maybeSingle();
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, display_name, logo_url, primary_color } = body || {};
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, any> = {};
  if (display_name !== undefined) patch.display_name = display_name || null;
  if (logo_url !== undefined) patch.logo_url = logo_url || null;
  if (primary_color !== undefined) patch.primary_color = primary_color || null;

  const admin = createAdminClient();
  const { data: tenant, error } = await admin
    .from('tenants')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tenant });
}
