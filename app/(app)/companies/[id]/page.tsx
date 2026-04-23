import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Globe, Phone, Mail, MapPin, Users, Kanban } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !company) notFound();

  const [{ data: contacts }, { data: deals }, { data: activities }] = await Promise.all([
    supabase.from('contacts')
      .select('id, first_name, last_name, email, title, phone')
      .eq('primary_company_id', params.id)
      .limit(50),
    supabase.from('deals')
      .select('id, name, value, stage_id, stage:deal_stages(name, is_won, is_lost, color)')
      .eq('primary_company_id', params.id)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase.from('activities')
      .select('*')
      .eq('company_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Back to companies
      </Link>

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain p-2" />
            ) : (
              <Building2 className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {company.domain && (
                <a href={`https://${company.domain}`} target="_blank" rel="noopener"
                   className="inline-flex items-center gap-1 hover:text-primary">
                  <Globe className="h-3.5 w-3.5" /> {company.domain}
                </a>
              )}
              {company.phone && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {company.phone}</span>
              )}
              {company.address_city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.address_city}{company.address_state ? `, ${company.address_state}` : ''}
                </span>
              )}
              {company.industry && <span className="pill">{company.industry}</span>}
              {company.lifecycle_stage && <span className="pill">{company.lifecycle_stage}</span>}
            </div>
            {company.description && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">{company.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Activity</h2>
          </div>
          <ActivityTimeline activities={activities || []} />
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400 inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> People ({contacts?.length || 0})
            </h2>
            {(contacts || []).length === 0 ? (
              <p className="text-sm text-gray-500">No contacts linked yet.</p>
            ) : (
              <ul className="space-y-3">
                {contacts!.map((c: any) => (
                  <li key={c.id}>
                    <Link href={`/contacts/${c.id}`} className="block rounded-md border border-border p-3 hover:border-primary/40">
                      <div className="text-sm font-medium text-white">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unnamed'}
                      </div>
                      {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                      {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400 inline-flex items-center gap-2">
              <Kanban className="h-4 w-4" /> Deals ({deals?.length || 0})
            </h2>
            {(deals || []).length === 0 ? (
              <p className="text-sm text-gray-500">No deals linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {deals!.map((d: any) => (
                  <li key={d.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">{d.name}</div>
                      <div className="text-sm text-primary">{formatCurrency(d.value)}</div>
                    </div>
                    {d.stage?.name && (
                      <div className="mt-1 text-xs text-gray-500">{d.stage.name}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
