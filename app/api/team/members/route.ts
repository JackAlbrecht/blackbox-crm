import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function requireTenantAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };
  const { data: me } = await supabase
    .from('profiles')
    .select('user_id, tenant_id, is_tenant_admin, is_super_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!me) return { error: 'Forbidden', status: 403 as const };
  if (!me.is_super_admin && !me.is_tenant_admin) {
    return { error: 'Forbidden — you must be a workspace owner', status: 403 as const };
  }
  if (!me.is_super_admin && !me.tenant_id) {
    return { error: 'No workspace assigned', status: 403 as const };
  }
  return { user, me };
}

export async function GET(req: Request) {
  const auth = await requireTenantAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const url = new URL(req.url);
  // Super admin may pass ?tenant_id= explicitly; tenant admins are pinned to their tenant.
  const tenantId = auth.me.is_super_admin
    ? (url.searchParams.get('tenant_id') || auth.me.tenant_id)
    : auth.me.tenant_id;

  if (!tenantId) return NextResponse.json({ members: [] });

  const { data, error } = await admin
    .from('profiles')
    .select('user_id, email, full_name, active, is_tenant_admin, is_super_admin, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [], tenant_id: tenantId });
}

export async function POST(req: Request) {
  const auth = await requireTenantAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const fullName = body.full_name ? String(body.full_name).trim() : null;
  const wantsAdmin = !!body.is_tenant_admin;

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Tenant admins are ALWAYS locked to their own tenant.
  const tenantId = auth.me.is_super_admin
    ? (body.tenant_id || auth.me.tenant_id)
    : auth.me.tenant_id;
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const admin = createAdminClient();

  // Allowlist (so handle_new_user trigger places them in the right tenant).
  const { error: allowErr } = await admin
    .from('allowed_members')
    .upsert({ email, tenant_id: tenantId }, { onConflict: 'email' });
  if (allowErr) return NextResponse.json({ error: `Allowlist failed: ${allowErr.message}` }, { status: 500 });

  // Find or create the auth user.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find(u => (u.email || '').toLowerCase() === email);

  if (existing) {
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updErr) return NextResponse.json({ error: `Update failed: ${updErr.message}` }, { status: 500 });
  } else {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (createErr) return NextResponse.json({ error: `Create failed: ${createErr.message}` }, { status: 500 });
  }

  // Push profile into tenant + flags. Tenant admins CANNOT promote to super admin.
  const profileUpdate: any = {
    tenant_id: tenantId,
    active: true,
  };
  if (fullName) profileUpdate.full_name = fullName;
  if (wantsAdmin) profileUpdate.is_tenant_admin = true;

  await admin.from('profiles').update(profileUpdate).eq('email', email);

  return NextResponse.json({
    status: 'ok',
    email,
    tenant_id: tenantId,
    is_tenant_admin: wantsAdmin,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireTenantAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const userId = body.user_id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch target and verify tenant
  const { data: target } = await admin
    .from('profiles')
    .select('user_id, tenant_id, is_super_admin')
    .eq('user_id', userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!auth.me.is_super_admin && target.tenant_id !== auth.me.tenant_id) {
    return NextResponse.json({ error: 'Cannot modify member in another workspace' }, { status: 403 });
  }
  if (target.is_super_admin) {
    return NextResponse.json({ error: 'Cannot modify super admin' }, { status: 403 });
  }

  const patch: any = {};
  if (typeof body.is_tenant_admin === 'boolean') patch.is_tenant_admin = body.is_tenant_admin;
  if (typeof body.active === 'boolean') patch.active = body.active;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(target.user_id, {
      password: body.password,
      email_confirm: true,
    });
    if (pwErr) return NextResponse.json({ error: `Password update failed: ${pwErr.message}` }, { status: 500 });
  }

  if (Object.keys(patch).length) {
    const { error } = await admin.from('profiles').update(patch).eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireTenantAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = new URL(req.url).searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from('profiles')
    .select('user_id, email, tenant_id, is_super_admin')
    .eq('user_id', userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!auth.me.is_super_admin && target.tenant_id !== auth.me.tenant_id) {
    return NextResponse.json({ error: 'Cannot remove member from another workspace' }, { status: 403 });
  }
  if (target.is_super_admin) {
    return NextResponse.json({ error: 'Cannot remove super admin' }, { status: 403 });
  }

  // Deactivate profile + remove allowlist. We don't delete the auth user to
  // preserve audit history; they just lose access.
  await admin.from('profiles')
    .update({ active: false, is_tenant_admin: false, tenant_id: null })
    .eq('user_id', userId);
  if (target.email) {
    await admin.from('allowed_members').delete().eq('email', target.email);
  }
  return NextResponse.json({ ok: true });
}
