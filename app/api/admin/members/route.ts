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

function getOrigin(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const host = req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : 'https://crm.blackboxadvancements.com';
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
  const origin = getOrigin(req);
  const redirectTo = `${origin}/auth-callback?next=/set-password`;

  // 1) Upsert allowlist row so handle_new_user trigger can bind them to this tenant.
  const { data: row, error } = await admin
    .from('allowed_members')
    .upsert({ email: normalized, tenant_id }, { onConflict: 'email' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2) If a profile already exists (user has signed in before), activate them
  //    and bind them to the new tenant. Then send them a password-reset email
  //    so they can re-set if they want.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('user_id, email')
    .eq('email', normalized)
    .maybeSingle();

  if (existingProfile) {
    await admin.from('profiles')
      .update({ tenant_id, active: true })
      .eq('email', normalized);

    // Send them a recovery (set-password) email.
    const { error: rErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalized,
      options: { redirectTo },
    });

    return NextResponse.json({
      member: row,
      status: rErr ? 'existing_user_reset_failed' : 'existing_user_reset_sent',
      message: rErr?.message,
    });
  }

  // 3) Brand-new user: send them an invite email (Supabase sends the mail via SMTP).
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(normalized, {
    redirectTo,
  });

  if (invErr) {
    return NextResponse.json({
      member: row,
      status: 'invite_failed',
      message: invErr.message,
    });
  }

  return NextResponse.json({
    member: row,
    status: 'invite_sent',
  });
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
