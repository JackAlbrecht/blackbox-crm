import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles').select('is_super_admin')
    .eq('user_id', user.id).maybeSingle();
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();

  const [{ data: tenants, error: tErr }, { data: members, error: mErr }] = await Promise.all([
    admin.from('tenants').select('id, name, slug, display_name, logo_url, primary_color, paused, paused_at, paused_reason').order('created_at', { ascending: true }),
    admin.from('allowed_members')
      .select('id, email, tenant_id, created_at, tenants(name)')
      .order('created_at', { ascending: false }),
  ]);

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const flat = (members || []).map((m: any) => ({
    id: m.id,
    email: m.email,
    tenant_id: m.tenant_id,
    tenant_name: m.tenants?.name || null,
    created_at: m.created_at,
  }));

  return NextResponse.json({ tenants: tenants || [], members: flat });
}
