import { createClient } from '@/lib/supabase/server';
import { CampaignForm } from '../CampaignForm';

export const metadata = { title: 'New campaign · Blackbox CRM' };

export default async function NewCampaign() {
  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('email, full_name').maybeSingle();

  return (
    <div className="max-w-3xl animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New campaign</h1>
        <p className="mt-1 text-sm text-gray-400">Write it, test it, send it.</p>
      </header>
      <div className="card p-6">
        <CampaignForm
          defaultFromEmail={profile?.email || ''}
          defaultFromName={profile?.full_name || ''}
        />
      </div>
    </div>
  );
}
