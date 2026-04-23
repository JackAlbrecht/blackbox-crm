'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Calendar, Check } from 'lucide-react';

const OUTCOMES: { value: string; label: string; tone: string }[] = [
  { value: 'answered',        label: 'Answered',         tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { value: 'booked',          label: 'Booked',           tone: 'bg-primary-soft text-primary border-primary/40' },
  { value: 'callback',        label: 'Callback later',   tone: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { value: 'no_answer',       label: 'No answer',        tone: 'bg-white/5 text-gray-300 border-white/10' },
  { value: 'voicemail',       label: 'Voicemail',        tone: 'bg-white/5 text-gray-300 border-white/10' },
  { value: 'busy',            label: 'Busy',             tone: 'bg-white/5 text-gray-300 border-white/10' },
  { value: 'not_interested',  label: 'Not interested',   tone: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { value: 'wrong_number',    label: 'Wrong number',     tone: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { value: 'do_not_call',     label: 'Do not call',      tone: 'bg-rose-600/20 text-rose-200 border-rose-500/50' },
];

export function LogCallWidget({ contactId, phone }: { contactId: string; phone?: string | null }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState('answered');
  const [notes, setNotes] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch(`/api/contacts/${contactId}/calls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        outcome,
        notes: notes || undefined,
        next_action_at: nextAt ? new Date(nextAt).toISOString() : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Failed to log call');
      return;
    }
    setStatus('Logged');
    setNotes('');
    setNextAt('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Log a call</h2>
          {phone && (
            <a href={`tel:${phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
          )}
        </div>
        {status && (
          <span className={`text-xs ${status === 'Logged' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {status === 'Logged' ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span> : status}
          </span>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-wider text-gray-500">Outcome</label>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map(o => (
              <button
                type="button"
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  outcome === o.value ? o.tone + ' ring-1 ring-white/20' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-wider text-gray-500">Notes</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="What happened on the call?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-2 block text-[11px] uppercase tracking-wider text-gray-500">Next action (optional)</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="datetime-local"
                className="input pl-9"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? 'Saving…' : 'Log call'}
          </button>
        </div>
      </form>
    </div>
  );
}
