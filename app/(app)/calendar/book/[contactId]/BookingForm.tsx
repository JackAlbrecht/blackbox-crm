'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Loader2, Check } from 'lucide-react';

export function BookingForm({ contactId, listId, backHref, template }: { contactId: string; listId: string | null; backHref: string; template?: { meeting_location?: string | null; meeting_phone?: string | null; meeting_description?: string | null } | null }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
  const iso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [when, setWhen] = useState(iso(tomorrow));
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  async function save() {
    setBusy(true); setErr(null);
    try {
      const occurred = new Date(when).toISOString();
      const lines: string[] = [];
      if (notes.trim()) lines.push(notes.trim());
      if (template?.meeting_description) lines.push(template.meeting_description);
      if (template?.meeting_location) lines.push(`Join meeting: ${template.meeting_location}`);
      if (template?.meeting_phone) lines.push(template.meeting_phone);
      const composedBody = lines.join('\n\n') || `Booked for ${new Date(when).toLocaleString()}`;

      const r1 = await fetch(`/api/contacts/${contactId}/calls`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'booked', list_id: listId, notes: composedBody, next_action_at: occurred }),
      });
      if (!r1.ok) throw new Error((await r1.json()).error || 'Failed to log the call');

      const r2 = await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'meeting', subject: 'Meeting', body: composedBody,
          contact_id: contactId, duration_sec: Number(duration) * 60, occurred_at: occurred, outcome: 'scheduled',
          meta: { meeting_location: template?.meeting_location || null, meeting_phone: template?.meeting_phone || null },
        }),
      });
      // Activity failure is non-fatal — the call log is the source of truth.

      setOk(true);
      router.push(backHref);
      router.refresh();
    } catch (e: any) { setErr(e?.message || 'Failed to save'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label"><Calendar className="mr-1 inline h-3.5 w-3.5" /> Date & time</label>
          <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label className="label"><Clock className="mr-1 inline h-3.5 w-3.5" /> Duration</label>
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
      {template && (template.meeting_location || template.meeting_phone || template.meeting_description) && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-gray-300">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Always attached to this booking</div>
          {template.meeting_location && <div>Link: <span className="text-primary">{template.meeting_location}</span></div>}
          {template.meeting_phone && <div>{template.meeting_phone}</div>}
          {template.meeting_description && <div className="mt-1 whitespace-pre-wrap text-gray-400">{template.meeting_description}</div>}
        </div>
      )}
      <div>
        <label className="label">Notes</label>
        <textarea rows={5} className="input" placeholder="What does the customer want? Sqft, material, address, budget, timing, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {err && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Saves a booked call + a meeting activity that shows on your Calendar and the activity feed.</span>
        <button onClick={save} disabled={busy} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          Save booking
        </button>
      </div>
    </div>
  );
}
