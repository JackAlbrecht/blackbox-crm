import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';

export const metadata = { title: 'Settings · Blackbox CRM' };

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
  const { data: tenant } = profile?.tenant_id
    ? await supabase.from('tenants').select('*').eq('id', profile.tenant_id).maybeSingle()
    : { data: null };
  const { data: stages } = await supabase.from('deal_stages').select('*').order('position', { ascending: true });

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Your profile and workspace.</p>
      </header>
      <SettingsClient profile={profile!} tenant={tenant} stages={stages || []} />
    </div>
  );
}
