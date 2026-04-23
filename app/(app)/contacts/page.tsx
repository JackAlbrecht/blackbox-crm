import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Mail, Phone, Upload, PhoneCall } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ContactSearch } from './ContactSearch';

export const metadata = { title: 'Contacts · Blackbox CRM' };

const OUTCOME_LABEL: Record<string, { label: string; tone: string }> = {
  answered:       { label: 'Answered',       tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  booked:         { label: 'Booked',         tone: 'bg-primary-soft text-primary border-primary/40' },
  callback:       { label: 'Callback',       tone: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  no_answer:      { label: 'No answer',      tone: 'bg-white/5 text-gray-400 border-white/10' },
  voicemail:      { label: 'Voicemail',      tone: 'bg-white/5 text-gray-400 border-white/10' },
  busy:           { label: 'Busy',           tone: 'bg-white/5 text-gray-400 border-white/10' },
  not_interested: { label: 'Not interested', tone: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  wrong_number:   { label: 'Wrong number',   tone: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  do_not_call:    { label: 'Do not call',    tone: 'bg-rose-600/20 text-rose-200 border-rose-500/50' },
};

const FILTERS: { value: string; label: string }[] = [
  { value: '',          label: 'All' },
  { value: 'uncalled',  label: 'Uncalled' },
  { value: 'answered',  label: 'Answered' },
  { value: 'booked',    label: 'Booked' },
  { value: 'callback',  label: 'Callback' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'not_interested', label: 'Not interested' },
];

export default async function ContactsPage({
  searchParams,
}: { searchParams: { q?: string; outcome?: string; list?: string } }) {
  const supabase = createClient();
  const q = (searchParams.q || '').trim();
  const outcomeFilter = (searchParams.outcome || '').trim();

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, tags, created_at, last_call_at, last_call_outcome, next_follow_up_at')
    .order('created_at', { ascending: false })
    .limit(300);

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
    );
  }
  if (outcomeFilter === 'uncalled') {
    query = query.is('last_call_at', null);
  } else if (outcomeFilter) {
    query = query.eq('last_call_outcome', outcomeFilter);
  }
  const { data: contacts } = await query;

  function buildHref(value: string) {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (value) sp.set('outcome', value);
    const qs = sp.toString();
    return qs ? `/contacts?${qs}` : '/contacts';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Contacts</h1>
          <p className="mt-1 text-sm text-gray-400">Your people, your leads, your customers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts/import" className="btn btn-ghost">
            <Upload className="h-4 w-4" /> Import CSV
          </Link>
          <Link href="/contacts/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New contact
          </Link>
        </div>
      </header>

      <ContactSearch defaultValue={q} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const active = (outcomeFilter || '') === f.value;
          return (
            <Link
              key={f.value || 'all'}
              href={buildHref(f.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                active
                  ? 'border-primary/40 bg-primary-soft text-primary'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        {(contacts || []).length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {q || outcomeFilter ? 'No matches.' : 'No contacts yet. Click "New contact" to add your first, or import a CSV.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Last call</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody>
                {(contacts || []).map((c: any) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
                  const meta = c.last_call_outcome ? OUTCOME_LABEL[c.last_call_outcome] : null;
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-4 py-3">
                        <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-primary">{name}</Link>
                        {c.email && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" />{c.email}</a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{c.company || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{c.phone}</a> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {meta ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.tone}`}>
                              <PhoneCall className="h-3 w-3" />
                              {meta.label}
                            </span>
                            <div className="text-[11px] text-gray-500">{formatDate(c.last_call_at)}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] uppercase tracking-wider text-gray-600">Uncalled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {c.next_follow_up_at ? <span className="text-amber-400">{formatDate(c.next_follow_up_at)}</span> : '—'}
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
          </div>
        )}
      </div>
    </div>
  );
}
