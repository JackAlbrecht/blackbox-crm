'use client';
import { Users, Filter } from 'lucide-react';

export function ListFilterBar({
  filter, setFilter, counts,
}: {
  filter: string;
  setFilter: (f: string) => void;
  counts: { all: number; uncalled: number; booked: number; callback: number; no_answer: number; dead: number };
}) {
  const opts: { v: string; label: string; n: number; tone: string }[] = [
    { v: 'all',        label: 'All',         n: counts.all,        tone: 'text-gray-200' },
    { v: 'uncalled',   label: 'Uncalled',    n: counts.uncalled,   tone: 'text-gray-300' },
    { v: 'booked',     label: 'Booked',      n: counts.booked,     tone: 'text-emerald-300' },
    { v: 'callback',   label: 'Callback',    n: counts.callback,   tone: 'text-amber-300' },
    { v: 'no_answer',  label: 'No answer',   n: counts.no_answer,  tone: 'text-gray-300' },
    { v: 'dead',       label: 'Not interested/DNC', n: counts.dead, tone: 'text-rose-300' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-3.5 w-3.5 text-gray-500" />
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setFilter(o.v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
            filter === o.v
              ? 'border-primary/60 bg-primary/15 text-white'
              : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <span className={o.tone}>{o.label}</span>
          <span className="text-[10px] text-gray-500">{o.n}</span>
        </button>
      ))}
    </div>
  );
}
