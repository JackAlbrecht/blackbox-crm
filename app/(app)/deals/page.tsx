import { createClient } from '@/lib/supabase/server';
import { DealBoard } from './DealBoard';

export const metadata = { title: 'Deals · Blackbox CRM' };

export default async function DealsPage() {
  const supabase = createClient();
  const [{ data: stages }, { data: deals }, { data: contacts }] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position', { ascending: true }),
    supabase.from('deals').select('*').order('position', { ascending: true }),
    supabase.from('contacts').select('id, first_name, last_name, company'),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Deals</h1>
        <p className="mt-1 text-sm text-gray-400">Drag cards between stages. Click a deal to edit it.</p>
      </header>
      <DealBoard initialStages={stages || []} initialDeals={deals || []} contacts={contacts || []} />
    </div>
  );
}
