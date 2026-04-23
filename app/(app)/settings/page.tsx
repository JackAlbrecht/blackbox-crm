import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { BrandingEditor } from '@/components/branding/BrandingEditor';

export const metadata = { title: 'Settings · Blackbox CRM' };
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
  const { data: tenant } = profile?.tenant_id
    ? await supabase.from('tenants').select('*').eq('id', profile.tenant_id).maybeSingle()
    : { data: null };
  const { data: stages } = await supabase.from('deal_stages').select('*').order('position', { ascending: true });

  const canEditBranding = !!(profile?.is_super_admin || profile?.is_tenant_admin);

  return (
    <div className="animate-fade-in max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Your profile, workspace, and branding.</p>
      </header>

      {canEditBranding && tenant && <BrandingEditor tenant={tenant as any} canEditLogo={!!profile?.is_super_admin} />}

      <SettingsClient profile={profile!} tenant={tenant} stages={stages || []} />
    </div>
  );
}
