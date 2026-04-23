import { formatDate } from '@/lib/utils';
import { Clock } from 'lucide-react';

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

export function CallHistory({ calls }: { calls: any[] }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-gray-500">
        No calls logged yet. Use the widget above after your first dial.
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Call history</h2>
      </div>
      <ul className="divide-y divide-border">
        {calls.map(c => {
          const meta = OUTCOME_LABEL[c.outcome] || { label: c.outcome, tone: 'bg-white/5 text-gray-400 border-white/10' };
          return (
            <li key={c.id} className="flex gap-4 px-5 py-4">
              <span className={`mt-0.5 h-fit rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.tone}`}>
                {meta.label}
              </span>
              <div className="flex-1 min-w-0">
                {c.notes && <p className="text-sm text-gray-200 whitespace-pre-wrap">{c.notes}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(c.called_at)}
                  </span>
                  {c.next_action_at && (
                    <span className="text-amber-400">
                      Follow up {formatDate(c.next_action_at)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
