'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Mail, MessageSquare, Check, PhoneOff, Voicemail, Clock, Ban, X, Loader2, RotateCcw, Globe, ExternalLink } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { formatDate } from '@/lib/utils';

type C = {
  id: string; first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; company: string | null;
  website: string | null;
  notes: string | null;
  last_call_at: string | null; last_call_outcome: string | null;
  next_follow_up_at: string | null;
};

/** Normalize a URL-ish string: add https if missing, return null if clearly not a URL. */
function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // Accept bare domains like "example.com" or "evergreenepoxyflooring.com"
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return 'https://' + s;
  return null;
}
/** Render a string with any URL auto-linked. */
function linkify(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const re = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text)) != null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0];
    const url = normalizeUrl(raw);
    if (url) {
      parts.push(
        <a key={`u-${i++}`} href={url} target="_blank" rel="noopener noreferrer"
           className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary break-all">
          {raw}
        </a>,
      );
    } else {
      parts.push(raw);
    }
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Neutral by default; only the selected/active outcome lights up in its color.
const BASE_CLS = 'bg-black/20 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white';
const OUTCOMES = [
  { key: 'booked',         label: 'Booked',         active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', icon: Check },
  { key: 'answered',       label: 'Answered',       active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: Phone },
  { key: 'callback',       label: 'Callback',       active: 'bg-amber-500/15 text-amber-300 border-amber-500/40',       icon: Clock },
  { key: 'no_answer',      label: 'No answer',      active: 'bg-white/10 text-gray-200 border-white/20',                icon: PhoneOff },
  { key: 'voicemail',      label: 'Voicemail',      active: 'bg-white/10 text-gray-200 border-white/20',                icon: Voicemail },
  { key: 'not_interested', label: 'Not interested', active: 'bg-rose-500/15 text-rose-300 border-rose-500/40',          icon: X },
  { key: 'wrong_number',   label: 'Wrong #',        active: 'bg-rose-500/15 text-rose-300 border-rose-500/40',          icon: X },
  { key: 'do_not_call',    label: 'DNC',            active: 'bg-rose-600/25 text-rose-200 border-rose-500/60',          icon: Ban },
] as const;

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

export function QuickCallRow({ c, listId }: { c: C; listId: string }) {
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const router = useRouter();

  // Prefer explicit website; fallback to the domain of the email.
  const websiteUrl = normalizeUrl(c.website)
    || (c.email && c.email.includes('@') ? normalizeUrl(c.email.split('@')[1]!) : null);

  async function log(outcome: string, notesText: string | null = null) {
    setBusy(true);
    const res = await fetch(`/api/contacts/${c.id}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, list_id: listId, notes: notesText || null }),
    });
    setBusy(false);
    if (!res.ok) { alert((await res.json()).error || 'Failed'); return; }
    setJustLogged(outcome);
    setTimeout(() => setJustLogged(null), 1500);
    setNotes(''); setNotesOpen(false);
    router.refresh();
  }

  async function undo() {
    setBusy(true);
    await fetch(`/api/contacts/${c.id}/calls`, { method: 'DELETE' });
    setBusy(false);
    setJustLogged(null);
    router.refresh();
  }

  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
  const meta = c.last_call_outcome ? OUTCOME_LABEL[c.last_call_outcome] : null;

  return (
    <div className={`rounded-xl border p-4 transition ${
      justLogged ? 'border-primary/60 shadow-glow' : 'border-border bg-black/20 hover:border-primary/30'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/contacts/${c.id}`} className="text-base font-medium text-white hover:text-primary">{name}</Link>
            {c.company && <span className="text-sm text-gray-400">· {c.company}</span>}
            {meta ? (
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.tone}`}>
                {meta.label} · {c.last_call_at && formatDate(c.last_call_at)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">Uncalled</span>
            )}
            {c.next_follow_up_at && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                <Clock className="h-3 w-3" /> {formatDate(c.next_follow_up_at)}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
            {c.phone ? (
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                <Phone className="h-3.5 w-3.5" /> {c.phone}
              </a>
            ) : <span className="text-xs text-gray-600">no phone</span>}
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary">
                <Mail className="h-3 w-3" /> {c.email}
              </a>
            )}
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20"
                 title="Open their website in a new tab">
                <Globe className="h-3 w-3" /> Visit site <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        </div>
      </div>

      {c.notes && (
        <div className="mt-3 rounded-md border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-sm text-gray-200 whitespace-pre-wrap">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">Context · what they need</div>
          {linkify(c.notes)}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {OUTCOMES.map(({ key, label, active, icon: Icon }) => {
          const isSelected = c.last_call_outcome === key || justLogged === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (c.last_call_outcome === key) { undo(); return; }
                if (key === 'booked') { window.location.href = `/calendar/book/${c.id}?list=${listId}&back=${encodeURIComponent('/lead-lists/' + listId)}`; return; }
                log(key);
              }}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                isSelected ? active : BASE_CLS
              } ${justLogged === key ? 'ring-2 ring-primary' : ''}`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          );
        })}
        {c.last_call_outcome && (
          <button
            onClick={undo}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10"
            title="Undo last outcome"
          >
            <RotateCcw className="h-3 w-3" /> Undo
          </button>
        )}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/10"
        >
          <MessageSquare className="h-3 w-3" /> {notesOpen ? 'Hide note' : '+ note'}
        </button>
        {busy && <Loader2 className="ml-1 h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {notesOpen && (
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Quick note for this call (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && notes.trim()) log('answered', notes); }}
          />
          <button onClick={() => log('answered', notes)} disabled={!notes.trim() || busy} className="btn btn-primary">
            Log w/ note
          </button>
        </div>
      )}

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSaved={() => { setJustLogged('booked'); setTimeout(() => setJustLogged(null), 1500); router.refresh(); }}
        contact={c}
        listId={listId}
      />
    </div>
  );
}
