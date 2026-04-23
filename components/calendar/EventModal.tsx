'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, Clock, User, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultDate?: string; // YYYY-MM-DD
};

export function CalendarEventModal({ open, onClose, onSaved, defaultDate }: Props) {
  const now = new Date();
  const base = defaultDate ? new Date(defaultDate + 'T10:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0);
  const iso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [when, setWhen] = useState(iso(base));
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [contactId, setContactId] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWhen(iso(defaultDate ? new Date(defaultDate + 'T10:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0)));
    // Load contacts for dropdown
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('contacts').select('id, first_name, last_name, company').order('first_name').limit(1000);
      setContacts(data || []);
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, defaultDate]);

  if (!open) return null;

  async function save() {
    if (!title.trim()) { setErr('Give the event a title'); return; }
    setBusy(true); setErr(null);
    const r = await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_type: 'meeting',
        subject: title.trim(),
        body: notes.trim() || null,
        contact_id: contactId || null,
        duration_sec: Number(duration) * 60,
        occurred_at: new Date(when).toISOString(),
        outcome: 'scheduled',
      }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || 'Failed to save'); return; }
    setTitle(''); setNotes(''); setContactId('');
    onSaved();
    onClose();
  }

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
    >
      <div onClick={(e)=>e.stopPropagation()} style={{ background:'#0a0b12', color:'#e5e7eb', width:'100%', maxWidth:560, border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,0.45)', overflow:'hidden' }}>
        <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'12px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(99,102,241,0.15)', color:'var(--primary, #a855f7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Calendar style={{ width:16, height:16 }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>New calendar event</div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>Meetings, internal events, anything for the team</div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background:'transparent', border:0, cursor:'pointer', color:'#9ca3af', padding:4 }}>
            <X style={{ width:18, height:18 }} />
          </button>
        </header>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="e.g. Team stand-up, Call w/ Faber Construction, Site visit" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="label"><Calendar style={{ display:'inline', width:12, height:12, marginRight:4 }} /> Date & time</label>
              <input type="datetime-local" className="input" value={when} onChange={(e)=>setWhen(e.target.value)} />
            </div>
            <div>
              <label className="label"><Clock style={{ display:'inline', width:12, height:12, marginRight:4 }} /> Duration</label>
              <select className="input" value={duration} onChange={(e)=>setDuration(e.target.value)}>
                <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option>
                <option value="60">60 min</option><option value="90">90 min</option><option value="120">2 hrs</option><option value="240">4 hrs</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label"><User style={{ display:'inline', width:12, height:12, marginRight:4 }} /> Link a contact (optional)</label>
            <select className="input" value={contactId} onChange={(e)=>setContactId(e.target.value)}>
              <option value="">— none —</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)'}{c.company ? ' · ' + c.company : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={4} className="input" placeholder="Agenda, links, context, whatever your team needs" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          </div>
          {err && <div style={{ border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:'#fca5a5', padding:'8px 12px', borderRadius:6, fontSize:12 }}>{err}</div>}
        </div>

        <footer style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, borderTop:'1px solid rgba(255,255,255,0.08)', padding:'12px 20px' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="button" onClick={save} disabled={busy || !title.trim()} className="btn btn-primary">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save event
          </button>
        </footer>
      </div>
    </div>
  );
}
