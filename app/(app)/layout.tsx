import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

// Very light color helpers so a tenant's primary color themes the whole app.
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const v = m[1].length === 3
    ? m[1].split('').map(c => c + c).join('')
    : m[1];
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
function rgbString(hex: string, fallback: string) {
  const rgb = hexToRgb(hex) || hexToRgb(fallback)!;
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}
function softRgba(hex: string, fallback: string, alpha: number) {
  const rgb = hexToRgb(hex) || hexToRgb(fallback)!;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, tenant_id, is_super_admin, is_tenant_admin, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/denied');
  }

  if (!profile.is_super_admin && (!profile.active || !profile.tenant_id)) {
    redirect('/denied');
  }

  const tenant = profile.tenant_id
    ? (await supabase
        .from('tenants')
        .select('name, slug, display_name, logo_url, logo_wide_url, primary_color, accent_color, tagline')
        .eq('id', profile.tenant_id)
        .maybeSingle()).data
    : null;

  const FALLBACK_PRIMARY = '#8b5cf6';
  const FALLBACK_ACCENT  = '#22d3ee';

  const primary = tenant?.primary_color || FALLBACK_PRIMARY;
  const accent  = tenant?.accent_color  || FALLBACK_ACCENT;

  const brandName = tenant?.display_name || tenant?.name || (profile.is_super_admin ? 'Super Admin' : 'Workspace');
  const brandLogo = tenant?.logo_url || null;
  const brandLogoWide = tenant?.logo_wide_url || null;
  const tagline = tenant?.tagline || null;

  // Build theme style — these CSS vars override globals.css where the app
  // already uses var(--primary), var(--primary-rgb), var(--accent), etc.
  const themeStyle: React.CSSProperties & Record<string, string> = {
    ['--primary' as any]: primary,
    ['--primary-rgb' as any]: rgbString(primary, FALLBACK_PRIMARY),
    ['--primary-soft' as any]: softRgba(primary, FALLBACK_PRIMARY, 0.15),
    ['--primary-soft-hover' as any]: softRgba(primary, FALLBACK_PRIMARY, 0.25),
    ['--primary-glow' as any]: softRgba(primary, FALLBACK_PRIMARY, 0.35),
    ['--accent' as any]: accent,
    ['--accent-rgb' as any]: rgbString(accent, FALLBACK_ACCENT),
    ['--accent-soft' as any]: softRgba(accent, FALLBACK_ACCENT, 0.15),
    // Back-compat for any existing `--brand` references.
    ['--brand' as any]: primary,
  };

  return (
    <div className="flex min-h-screen" style={themeStyle}>
      <Sidebar
        isSuperAdmin={!!profile.is_super_admin}
        isTenantAdmin={!!profile.is_tenant_admin}
        brandName={brandName}
        brandLogo={brandLogo}
        brandLogoWide={brandLogoWide}
        tagline={tagline}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          tenantName={brandName}
          userEmail={profile.email}
          fullName={profile.full_name}
        />
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
