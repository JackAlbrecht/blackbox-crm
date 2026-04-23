import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, Plus, Globe, Phone, MapPin } from 'lucide-react';

export const metadata = { title: 'Companies · Blackbox CRM' };

export default async function CompaniesPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = searchParams.q?.trim();

  let query = supabase.from('companies')
    .select('id, name, domain, website, industry, phone, address_city, address_state, lifecycle_stage, size')
    .order('name', { ascending: true })
    .limit(500);

  if (q) query = query.or(`name.ilike.%${q}%,domain.ilike.%${q}%,website.ilike.%${q}%`);

  const { data: companies, error } = await (query as any).then((r: any) => r, (e: any) => ({ data: [], error: e }));

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Companies</h1>
          <p className="mt-1 text-sm text-gray-400">
            {companies?.length ?? 0} {companies?.length === 1 ? 'company' : 'companies'}{q ? ` matching "${q}"` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="relative">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search companies…"
              className="input w-64"
            />
          </form>
          <Link href="/companies/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New company
          </Link>
        </div>
      </header>

      {error && (
        <div className="card p-6 text-sm text-danger">
          Couldn't load companies: {error.message}
          {error.message.includes('relation') && (
            <div className="mt-2 text-xs text-gray-400">
              The companies table doesn't exist yet. Run migration 006_crm_foundations.sql in the Supabase SQL editor.
            </div>
          )}
        </div>
      )}

      {!error && (companies?.length ?? 0) === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Building2 className="h-10 w-10 text-primary/60" />
          <h2 className="text-lg font-medium text-white">No companies yet</h2>
          <p className="max-w-sm text-sm text-gray-500">
            Companies are the organizations your contacts work for. Import from HubSpot or add one manually.
          </p>
          <Link href="/companies/new" className="btn btn-primary mt-2">
            <Plus className="h-4 w-4" /> Add your first company
          </Link>
        </div>
      ) : !error && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-black/20 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies!.map((c: any) => (
                <tr key={c.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{c.name}</div>
                        {c.domain && (
                          <div className="text-xs text-gray-500 inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {c.domain}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.industry || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {c.address_city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {c.address_city}{c.address_state ? `, ${c.address_state}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.size || '—'}</td>
                  <td className="px-4 py-3">
                    {c.lifecycle_stage && (
                      <span className="pill">{c.lifecycle_stage}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
