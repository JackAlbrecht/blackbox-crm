import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, tenant_id, is_super_admin, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || !profile.active || !profile.tenant_id) {
    redirect('/denied');
  }

  const { data: tenant } = await supabase
    .from('tenants').select('name, slug').eq('id', profile.tenant_id).maybeSingle();

  return (
    <div className="flex min-h-screen">
      <Sidebar isSuperAdmin={!!profile.is_super_admin} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          tenantName={tenant?.name || 'Workspace'}
          userEmail={profile.email}
          fullName={profile.full_name}
        />
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
