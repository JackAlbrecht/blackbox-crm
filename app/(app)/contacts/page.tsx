import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Mail, Phone } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ContactSearch } from './ContactSearch';

export const metadata = { title: 'Contacts · Blackbox CRM' };

export default async function ContactsPage({
  searchParams,
}: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = (searchParams.q || '').trim();

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, tags, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
    );
  }
  const { data: contacts } = await query;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Contacts</h1>
          <p className="mt-1 text-sm text-gray-400">Your people, your leads, your customers.</p>
        </div>
        <Link href="/contacts/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> New contact
        </Link>
      </header>

      <ContactSearch defaultValue={q} />

      <div className="card overflow-hidden">
        {(contacts || []).length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {q ? 'No matches.' : 'No contacts yet. Click "New contact" to add your first.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {(contacts || []).map((c: any) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
                return (
                  <tr key={c.id} className="table-row">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-primary">{name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.email ? <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" />{c.email}</a> : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{c.phone}</a> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map((t: string) => (<span key={t} className="pill">{t}</span>))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
