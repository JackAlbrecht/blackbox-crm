import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Upload, ListChecks } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';

export const metadata = { title: 'Lead lists · Blackbox CRM' };

export default async function LeadListsPage() {
  const supabase = createClient();

  const { data: lists } = await supabase
    .from('lead_lists')
    .select('id, name, description, source, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch counts per list in one query via contact_lists join
  const ids = (lists || []).map(l => l.id);
  let counts: Record<string, number> = {};
  let outcomeCounts: Record<string, Record<string, number>> = {};
  if (ids.length) {
    const { data: rows } = await supabase
      .from('contact_lists')
      .select('list_id, contact:contacts!inner(id, last_call_outcome)')
      .in('list_id', ids);
    for (const r of (rows || []) as any[]) {
      counts[r.list_id] = (counts[r.list_id] || 0) + 1;
      const oc = r.contact?.last_call_outcome;
      if (oc) {
        if (!outcomeCounts[r.list_id]) outcomeCounts[r.list_id] = {};
        outcomeCounts[r.list_id][oc] = (outcomeCounts[r.list_id][oc] || 0) + 1;
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <RealtimeRefresh tables={['lead_lists','contact_lists','call_logs']} />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lead lists</h1>
          <p className="mt-1 text-sm text-gray-400">Batched call lists, with live progress counters.</p>
        </div>
        <Link href="/contacts/import" className="btn btn-primary">
          <Upload className="h-4 w-4" /> Import CSV
        </Link>
      </header>

      {(lists || []).length === 0 ? (
        <div className="card p-12 text-center text-sm text-gray-500">
          <ListChecks className="mx-auto h-10 w-10 text-gray-700" />
          <p className="mt-3">No lead lists yet. Import a CSV and give it a list name to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(lists || []).map((l: any) => {
            const total = counts[l.id] || 0;
            const outcomes = outcomeCounts[l.id] || {};
            const booked = outcomes.booked || 0;
            const called = Object.values(outcomes).reduce((a, b) => a + b, 0);
            const dead = (outcomes.not_interested || 0) + (outcomes.wrong_number || 0) + (outcomes.do_not_call || 0);
            const pct = total ? Math.round((called / total) * 100) : 0;
            return (
              <Link key={l.id} href={`/lead-lists/${l.id}`} className="card p-5 hover:border-primary/50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{l.name}</h3>
                    {l.source && <p className="mt-0.5 text-[11px] uppercase tracking-wider text-gray-500">{l.source}</p>}
                  </div>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                    {total} leads
                  </span>
                </div>
                {l.description && <p className="mt-2 text-sm text-gray-400 line-clamp-2">{l.description}</p>}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Progress</span>
                    <span>{called}/{total} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                  <span className="text-emerald-400">{booked} booked</span>
                  <span className="text-gray-500">· {called} called</span>
                  <span className="text-rose-400">· {dead} dead</span>
                </div>
                <p className="mt-3 text-[10px] text-gray-600">Created {formatDate(l.created_at)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
