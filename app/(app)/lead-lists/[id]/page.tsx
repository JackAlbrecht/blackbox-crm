import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Mail, Phone, PhoneCall } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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

export default async function LeadListDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: list } = await supabase
    .from('lead_lists')
    .select('id, name, description, source, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!list) notFound();

  const { data: rows } = await supabase
    .from('contact_lists')
    .select('contact:contacts!inner(id, first_name, last_name, email, phone, company, last_call_at, last_call_outcome, next_follow_up_at)')
    .eq('list_id', params.id)
    .limit(500);

  const contacts = (rows || []).map((r: any) => r.contact).filter(Boolean);

  const counts = contacts.reduce((acc: any, c: any) => {
    acc.total++;
    if (c.last_call_outcome) {
      acc.called++;
      acc[c.last_call_outcome] = (acc[c.last_call_outcome] || 0) + 1;
    }
    return acc;
  }, { total: 0, called: 0 } as any);

  const pct = counts.total ? Math.round((counts.called / counts.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/lead-lists" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All lists
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-white">{list.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-400">
          {list.source && <span className="uppercase tracking-wider text-[11px] text-gray-500">{list.source}</span>}
          <span>Created {formatDate(list.created_at)}</span>
        </div>
        {list.description && <p className="mt-3 text-sm text-gray-300">{list.description}</p>}
      </header>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="uppercase tracking-wider">Progress</span>
          <span>{counts.called} / {counts.total} · {pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-emerald-400">{counts.booked || 0} booked</span>
          <span className="text-amber-400">{counts.callback || 0} callback</span>
          <span className="text-gray-400">{counts.no_answer || 0} no answer</span>
          <span className="text-gray-400">{counts.voicemail || 0} voicemail</span>
          <span className="text-rose-400">{(counts.not_interested || 0) + (counts.wrong_number || 0) + (counts.do_not_call || 0)} dead</span>
          <span className="text-gray-500">{counts.total - counts.called} uncalled</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {contacts.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">This list has no contacts.</div>
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
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: any) => {
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
                          <div>
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.tone}`}>
                              <PhoneCall className="h-3 w-3" /> {meta.label}
                            </span>
                            <div className="mt-0.5 text-[11px] text-gray-500">{formatDate(c.last_call_at)}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] uppercase tracking-wider text-gray-600">Uncalled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {c.next_follow_up_at ? <span className="text-amber-400">{formatDate(c.next_follow_up_at)}</span> : '—'}
                      </td>
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
