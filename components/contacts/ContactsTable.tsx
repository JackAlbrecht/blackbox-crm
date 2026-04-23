'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Trash2, Tag, UserCog, Zap, CheckSquare, Square, Loader2, ListPlus } from 'lucide-react';

type Contact = {
  id: string; first_name: string | null; last_name: string | null; email: string | null;
  phone: string | null; company: string | null; tags: string[] | null;
  created_at: string; last_call_at: string | null; last_call_outcome: string | null;
  next_follow_up_at: string | null; lifecycle_stage?: string | null;
};

const LIFECYCLES = ['lead','mql','sql','opportunity','customer','evangelist'];

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

function renderOutcome(out: string | null) {
  const meta = out ? OUTCOME_LABEL[out] : null;
  if (!meta) return <span className="text-gray-600">—</span>;
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.tone}`}>{meta.label}</span>;
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const allSelected = contacts.length > 0 && selected.size === contacts.length;
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  }
  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function run(action: string, value?: any) {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await fetch('/api/contacts/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action, value }),
    });
    setBusy(false);
    if (!res.ok) { alert((await res.json()).error || 'Failed'); return; }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="card overflow-hidden p-0">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-4 py-2 text-xs">
          <span className="text-primary font-medium">{selected.size} selected</span>
          <span className="text-gray-600">·</span>
          <select onChange={(e) => e.target.value && run('set_lifecycle', e.target.value)} className="rounded-md border border-border bg-black/40 px-2 py-1 text-xs text-white" defaultValue="">
            <option value="">Set lifecycle…</option>
            {LIFECYCLES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={() => { const t = prompt('Tag to add:'); if (t) run('add_tag', t); }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-gray-300 hover:text-primary">
            <Tag className="h-3 w-3" /> Add tag
          </button>
          <button onClick={() => run('set_dnc', true)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-gray-300 hover:text-amber-400">
            <UserCog className="h-3 w-3" /> Mark DNC
          </button>
          <button onClick={() => { if (confirm(`Delete ${selected.size} contacts? This cannot be undone.`)) run('delete'); }}
                  className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-2 py-1 text-danger hover:bg-danger/10">
            <Trash2 className="h-3 w-3" /> Delete
          </button>
          {busy && <Loader2 className="ml-2 h-3 w-3 animate-spin text-gray-400" />}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:text-white">Clear</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-black/20 text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="w-8 pl-4"><button onClick={toggleAll}>{allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}</button></th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email / Phone</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Last call</th>
            <th className="px-4 py-3 font-medium">Follow-up</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {contacts.map((c) => {
            const isSel = selected.has(c.id);
            return (
              <tr key={c.id} className={`transition ${isSel ? 'bg-primary/5' : 'hover:bg-white/5'}`}>
                <td className="pl-4">
                  <button onClick={() => toggle(c.id)}>
                    {isSel ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-gray-500" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-primary">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)'}
                  </Link>
                  {c.lifecycle_stage && <span className="ml-2 pill">{c.lifecycle_stage}</span>}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  <div>{c.email}</div>
                  {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                </td>
                <td className="px-4 py-3 text-gray-400">{c.company || '—'}</td>
                <td className="px-4 py-3 text-gray-400">
                  {c.last_call_at ? <>{formatDate(c.last_call_at)} · {renderOutcome(c.last_call_outcome)}</> : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400">{c.next_follow_up_at ? formatDate(c.next_follow_up_at) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
