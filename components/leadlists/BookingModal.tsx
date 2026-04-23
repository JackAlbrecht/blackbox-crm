'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Loader2, Check } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null; company?: string | null };
  listId?: string | null;
};

export function BookingModal({ open, onClose, onSaved, contact, listId }: Props) {
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

  // Lock background scroll + escape key to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    setBusy(true); setErr(null);
    try {
      const occurred = new Date(when).toISOString();
      const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed';

      const r1 = await fetch(`/api/contacts/${contact.id}/calls`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'booked',
          list_id: listId || null,
          notes: notes.trim() || `Booked for ${new Date(when).toLocaleString()}`,
          next_action_at: occurred,
        }),
      });
      if (!r1.ok) throw new Error((await r1.json()).error || 'Failed to log call');

      const r2 = await fetch('/api/activities', {
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
      // Don't throw on activity failure — call log is the source of truth.

      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save booking');
    } finally {
      setBusy(false);
    }
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a0b12', color: '#e5e7eb',
          width: '100%', maxWidth: '560px',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Book the meeting</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Lock in the date, time, and any notes</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </header>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: 'rgba(0,0,0,0.2)', padding: 12, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e5e7eb' }}>
              <User style={{ width: 14, height: 14, color: 'var(--primary, #a855f7)' }} />
              <span style={{ fontWeight: 600 }}>{name}</span>
              {contact.company && <span style={{ color: '#9ca3af' }}>· {contact.company}</span>}
            </div>
            {contact.phone && <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}><Phone style={{ width: 12, height: 12 }} /> {contact.phone}</div>}
            {contact.email && <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}><Mail style={{ width: 12, height: 12 }} /> {contact.email}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label"><Calendar style={{ display: 'inline', width: 12, height: 12, marginRight: 4 }} /> Date & time</label>
              <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div>
              <label className="label"><Clock style={{ display: 'inline', width: 12, height: 12, marginRight: 4 }} /> Duration (min)</label>
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

          {err && (
            <div style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
              {err}
            </div>
          )}
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save booking
          </button>
        </footer>
      </div>
    </div>
  );
}
