import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const URL_RE = /^https?:\/\/.+/i;

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('tenant_id, is_super_admin, is_tenant_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!me.is_super_admin && !me.is_tenant_admin) {
    return NextResponse.json({ error: 'Only workspace owners can edit branding' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetTenantId = me.is_super_admin && body.tenant_id ? body.tenant_id : me.tenant_id;
  if (!targetTenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const display_name   = clean(body.display_name);
  const tagline        = clean(body.tagline);
  const primary_color  = clean(body.primary_color);
  const accent_color   = clean(body.accent_color);
  const logo_url       = clean(body.logo_url);
  const logo_wide_url  = clean(body.logo_wide_url);
  const favicon_url    = clean(body.favicon_url);
  const login_bg_url   = clean(body.login_bg_url);
  const meeting_location    = clean(body.meeting_location);
  const meeting_phone       = clean(body.meeting_phone);
  const meeting_description = clean(body.meeting_description);

  if (primary_color && !HEX.test(primary_color)) {
    return NextResponse.json({ error: 'Primary color must be a hex like #8b5cf6' }, { status: 400 });
  }
  if (accent_color && !HEX.test(accent_color)) {
    return NextResponse.json({ error: 'Accent color must be a hex like #22d3ee' }, { status: 400 });
  }
  for (const [k, v] of [['logo_url', logo_url], ['logo_wide_url', logo_wide_url], ['favicon_url', favicon_url], ['login_bg_url', login_bg_url]] as const) {
    if (v && !URL_RE.test(v)) {
      return NextResponse.json({ error: `${k} must be a full http(s) URL` }, { status: 400 });
    }
  }

  // Use admin client so this write bypasses any missing RLS edge case — we've
  // already checked permissions above.
  const admin = createAdminClient();
  const patch: Record<string, string | null> = {};
  if (body.display_name   !== undefined) patch.display_name   = display_name;
  if (body.tagline        !== undefined) patch.tagline        = tagline;
  if (body.primary_color  !== undefined) patch.primary_color  = primary_color;
  if (body.accent_color   !== undefined) patch.accent_color   = accent_color;
  if (body.logo_url       !== undefined) patch.logo_url       = logo_url;
  if (body.logo_wide_url  !== undefined) patch.logo_wide_url  = logo_wide_url;
  if (body.favicon_url    !== undefined) patch.favicon_url    = favicon_url;
  if (body.login_bg_url   !== undefined) patch.login_bg_url   = login_bg_url;
  if (body.meeting_location    !== undefined) patch.meeting_location    = meeting_location;
  if (body.meeting_phone       !== undefined) patch.meeting_phone       = meeting_phone;
  if (body.meeting_description !== undefined) patch.meeting_description = meeting_description;

  const { data, error } = await admin
    .from('tenants')
    .update(patch)
    .eq('id', targetTenantId)
    .select('id, name, display_name, tagline, primary_color, accent_color, logo_url, logo_wide_url, favicon_url, login_bg_url, meeting_location, meeting_phone, meeting_description')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant: data });
}
