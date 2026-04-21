import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminClient } from './AdminClient';

export const metadata = { title: 'Members · Blackbox CRM' };

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('is_super_admin').eq('user_id', user.id).maybeSingle();
  if (!me?.is_super_admin) redirect('/dashboard');

  // Use a server API to list (requires service role to bypass RLS on all tenants)
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Members</h1>
        <p className="mt-1 text-sm text-gray-400">Add emails to grant access. One tenant per customer.</p>
      </header>
      <AdminClient />
    </div>
  );
}
