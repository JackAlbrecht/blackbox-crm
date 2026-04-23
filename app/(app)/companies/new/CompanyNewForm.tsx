'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save } from 'lucide-react';

const LIFECYCLES = ['lead','mql','sql','opportunity','customer','evangelist','other'];
const INDUSTRIES = ['Construction','Real Estate','Manufacturing','Retail','Professional Services','Healthcare','Technology','Education','Hospitality','Other'];

export function CompanyNewForm() {
  const [form, setForm] = useState({
    name: '', domain: '', website: '', industry: '', phone: '',
    description: '',
    address_street: '', address_city: '', address_state: '', address_zip: '',
    lifecycle_stage: 'lead', size: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setBusy(true); setErr(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).maybeSingle();
    if (!profile?.tenant_id) { setErr('No tenant'); setBusy(false); return; }

    const { data, error } = await supabase.from('companies').insert({
      tenant_id: profile.tenant_id,
      source: 'manual',
      ...Object.fromEntries(Object.entries(form).map(([k,v]) => [k, (v as string).trim() || null])),
    }).select('id').single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push(`/companies/${data!.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Company name *</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Domain</label>
          <input className="input" placeholder="company.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Industry</label>
          <select className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Employee count</label>
          <input className="input" placeholder="1-10, 11-50, 50+" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        </div>
        <div>
          <label className="label">Lifecycle</label>
          <select className="input" value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}>
            {LIFECYCLES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Street</label>
          <input className="input" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} />
        </div>
        <div>
          <label className="label">ZIP</label>
          <input className="input" value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={busy || !form.name.trim()} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Create company
        </button>
      </div>
    </form>
  );
}
