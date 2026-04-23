'use client';

import { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Loader2, Check } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null; company?: string | null };
  listId?: string | null;
};

export function BookingModal({ open, onClose, onSaved, contact, listId }: Props) {
  // Default date = tomorrow 10am local
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
  const iso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [when, setWhen] = useState(iso(tomorrow));
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function save() {
    setBusy(true);
    const occurred = new Date(when).toISOString();
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed';

    // 1. Log the call outcome as "booked"
    await fetch(`/api/contacts/${contact.id}/calls`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome: 'booked',
        list_id: listId || null,
        notes: notes.trim() || `Booked for ${new Date(when).toLocaleString()}`,
        next_action_at: occurred,
      }),
    });

    // 2. Create a meeting activity so it shows on the calendar + timeline
    await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_type: 'meeting',
        subject: `Meeting with ${name}${contact.company ? ' · ' + contact.company : ''}`,
        body: notes.trim() || null,
        contact_id: contact.id,
        duration_sec: Number(duration) * 60,
        occurred_at: occurred,
        outcome: 'scheduled',
      }),
    });

    setBusy(false);
    onSaved();
    onClose();
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[rgb(10,11,18)] shadow-glow" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Book the meeting</div>
              <div className="text-xs text-gray-400">Lock in the date, time, and any notes</div>
            </div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-md border border-border bg-black/20 p-3 text-xs">
            <div className="flex items-center gap-2 text-gray-300"><User className="h-3.5 w-3.5 text-primary" /><span className="font-medium">{name}</span>{contact.company && <span className="text-gray-500">· {contact.company}</span>}</div>
            {contact.phone && <div className="mt-1 flex items-center gap-2 text-gray-400"><Phone className="h-3 w-3" /> {contact.phone}</div>}
            {contact.email && <div className="mt-1 flex items-center gap-2 text-gray-400"><Mail className="h-3 w-3" /> {contact.email}</div>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label"><Calendar className="mr-1 inline h-3 w-3" /> Date & time</label>
              <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div>
              <label className="label"><Clock className="mr-1 inline h-3 w-3" /> Duration (min)</label>
              <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">2 hrs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes for the meeting</label>
            <textarea rows={4} className="input" placeholder="What does the customer want? Sqft, material, address, budget, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save booking
          </button>
        </footer>
      </div>
    </div>
  );
}
