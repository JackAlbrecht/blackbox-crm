'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';

type Props = { contact?: Contact };

export function ContactForm({ contact }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    title: contact?.title || '',
    source: contact?.source || '',
    tags: (contact?.tags || []).join(', '),
    notes: contact?.notes || '',
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const supabase = createClient();

    // tenant_id is filled automatically by RLS check — profile drives it.
    const { data: prof } = await supabase.from('profiles').select('tenant_id').maybeSingle();
    if (!prof?.tenant_id) {
      setSaving(false);
      setErr('No tenant found for this account.');
      return;
    }

    const payload = {
      tenant_id: prof.tenant_id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      title: form.title || null,
      source: form.source || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (contact) {
      result = await supabase.from('contacts').update(payload).eq('id', contact.id).select().single();
    } else {
      result = await supabase.from('contacts').insert(payload).select().single();
    }

    setSaving(false);
    if (result.error) {
      setErr(result.error.message);
      return;
    }
    router.push(`/contacts/${result.data.id}`);
    router.refresh();
  }

  async function remove() {
    if (!contact) return;
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
    if (error) { setErr(error.message); return; }
    router.push('/contacts');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Last name</label>
          <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Company</label>
          <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Source</label>
          <input className="input" placeholder="Referral, Instagram, Google…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" placeholder="hot, follow-up, demo" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea rows={5} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      <div className="flex items-center justify-between">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {contact ? 'Save changes' : 'Create contact'}
        </button>
        {contact && (
          <button type="button" onClick={remove} className="btn btn-ghost text-danger">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
