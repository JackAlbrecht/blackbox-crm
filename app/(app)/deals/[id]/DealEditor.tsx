'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Save, Loader2 } from 'lucide-react';

export function DealEditor({ initial, stages, contacts = [], companies = [] }: { initial: any; stages: any[]; contacts?: any[]; companies?: any[] }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    value: initial.value ?? 0,
    stage_id: initial.stage_id || '',
    contact_id: initial.contact_id || '',
    primary_company_id: initial.primary_company_id || '',
    probability: initial.probability ?? 0,
    priority: initial.priority || 'medium',
    expected_close: (initial.expected_close || '').slice(0, 10),
    source: initial.source || '',
    description: initial.description || '',
    notes: initial.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save() {
    setBusy(true); setSaved(false);
    const supabase = createClient();
    await supabase.from('deals').update({
      name: form.name,
      value: Number(form.value) || 0,
      stage_id: form.stage_id || null,
      contact_id: form.contact_id || null,
      primary_company_id: form.primary_company_id || null,
      probability: Number(form.probability) || 0,
      priority: form.priority || null,
      expected_close: form.expected_close || null,
      source: form.source || null,
      description: form.description || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', initial.id);
    setBusy(false); setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Deal name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Value (USD)</label>
          <input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value as any })} />
        </div>
        <div>
          <label className="label">Stage</label>
          <select className="input" value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Probability (%)</label>
          <input type="number" min="0" max="100" className="input" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value as any })} />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="label">Expected close</label>
          <input type="date" className="input" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} />
        </div>
        <div>
          <label className="label">Source</label>
          <input className="input" value={form.source} placeholder="referral, website, cold_call…" onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div>
          <label className="label">Contact (homeowner)</label>
          <select className="input" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
            <option value="">— none —</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.company || '(no name)'}
                {c.company ? ` · ${c.company}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Company</label>
          <select className="input" value={form.primary_company_id} onChange={(e) => setForm({ ...form, primary_company_id: e.target.value })}>
            <option value="">— none —</option>
            {companies.map((co: any) => (
              <option key={co.id} value={co.id}>{co.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn btn-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
