import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, is_super_admin, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) redirect('/denied');

  // Super admin with no tenant → go run the platform from /admin.
  if (profile.is_super_admin && !profile.tenant_id) redirect('/admin');

  // Must be active and bound to a tenant.
  if (!profile.active || !profile.tenant_id) redirect('/denied');

  redirect('/dashboard');
}
