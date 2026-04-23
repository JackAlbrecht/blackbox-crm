import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TeamClient } from './TeamClient';

export const metadata = { title: 'Team · Blackbox CRM' };
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('user_id, tenant_id, is_tenant_admin, is_super_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!me?.is_super_admin && !me?.is_tenant_admin) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="mt-3 text-sm text-gray-400">
          Only workspace owners can manage team members. Ask your admin for access.
        </p>
      </div>
    );
  }

  const { data: tenant } = me?.tenant_id
    ? await supabase.from('tenants').select('name').eq('id', me.tenant_id).maybeSingle()
    : { data: null };

  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, active, is_tenant_admin, is_super_admin, created_at')
    .eq('tenant_id', me.tenant_id || '')
    .order('created_at', { ascending: true });

  return (
    <TeamClient
      me={me}
      tenantName={tenant?.name || 'Your workspace'}
      initialMembers={members || []}
    />
  );
}
