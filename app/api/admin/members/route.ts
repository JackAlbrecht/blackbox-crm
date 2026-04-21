import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };
  const { data: me } = await supabase
    .from('profiles').select('is_super_admin').eq('user_id', user.id).maybeSingle();
  if (!me?.is_super_admin) return { error: 'Forbidden', status: 403 as const };
  return { user };
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { email, tenant_id } = await req.json();
  if (!email || !tenant_id) {
    return NextResponse.json({ error: 'Email and tenant_id required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalized = String(email).trim().toLowerCase();

  // Upsert allowlist row
  const { data: row, error } = await admin
    .from('allowed_members')
    .upsert({ email: normalized, tenant_id }, { onConflict: 'email' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If a profile already exists for this email (user has signed in before),
  // activate them and bind them to the new tenant.
  await admin.from('profiles')
    .update({ tenant_id, active: true })
    .eq('email', normalized);

  return NextResponse.json({ member: row });
}

export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  // Find the row first so we can revoke the corresponding profile
  const { data: row } = await admin.from('allowed_members')
    .select('email').eq('id', id).maybeSingle();

  const { error } = await admin.from('allowed_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.email) {
    // Revoke access: deactivate profile (keeps the auth user + history intact).
    await admin.from('profiles')
      .update({ active: false, tenant_id: null })
      .eq('email', row.email);
  }

  return NextResponse.json({ ok: true });
}
