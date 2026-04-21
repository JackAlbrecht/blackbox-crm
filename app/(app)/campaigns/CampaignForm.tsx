'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/types';
import { Loader2, Send, Trash2 } from 'lucide-react';

type Props = {
  campaign?: Campaign;
  defaultFromEmail?: string;
  defaultFromName?: string;
};

export function CampaignForm({ campaign, defaultFromEmail = '', defaultFromName = '' }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    from_name: campaign?.from_name || defaultFromName,
    from_email: campaign?.from_email || defaultFromEmail,
    body: campaign?.body || '',
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function save(status?: 'draft') {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { data: prof } = await supabase.from('profiles').select('tenant_id').maybeSingle();
    if (!prof?.tenant_id) { setMsg({ kind: 'err', text: 'No tenant' }); setSaving(false); return null; }

    const payload = { tenant_id: prof.tenant_id, ...form, status: status || campaign?.status || 'draft' };
    let res;
    if (campaign) {
      res = await supabase.from('campaigns').update(payload).eq('id', campaign.id).select().single();
    } else {
      res = await supabase.from('campaigns').insert(payload).select().single();
    }
    setSaving(false);
    if (res.error) { setMsg({ kind: 'err', text: res.error.message }); return null; }
    return res.data as Campaign;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const saved = await save();
    if (saved) {
      if (!campaign) router.push(`/campaigns/${saved.id}`);
      else router.refresh();
      setMsg({ kind: 'ok', text: 'Saved.' });
    }
  }

  async function onSend() {
    if (!confirm('Send this campaign to all contacts with an email address?')) return;
    const saved = await save();
    if (!saved) return;
    setSending(true);
    setMsg(null);
    const r = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: saved.id }),
    });
    const data = await r.json();
    setSending(false);
    if (!r.ok) { setMsg({ kind: 'err', text: data.error || 'Send failed' }); return; }
    setMsg({ kind: 'ok', text: `Sent to ${data.count} contacts.` });
    router.refresh();
  }

  async function remove() {
    if (!campaign) return;
    if (!confirm('Delete this campaign?')) return;
    const supabase = createClient();
    await supabase.from('campaigns').delete().eq('id', campaign.id);
    router.push('/campaigns');
    router.refresh();
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div>
        <label className="label">Internal name</label>
        <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="October newsletter" />
      </div>
      <div>
        <label className="label">Subject line</label>
        <input required className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">From name</label>
          <input required className="input" value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
        </div>
        <div>
          <label className="label">From email</label>
          <input type="email" required className="input" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Email body (HTML or plain text)</label>
        <textarea rows={14} className="input font-mono text-xs" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <p className="mt-1 text-xs text-gray-500">Use <code className="text-primary">{'{{first_name}}'}</code> and <code className="text-primary">{'{{company}}'}</code> for personalization.</p>
      </div>

      {msg && <p className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save draft
        </button>
        <button type="button" onClick={onSend} disabled={sending} className="btn btn-ghost">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to all contacts
        </button>
        {campaign && (
          <button type="button" onClick={remove} className="btn btn-ghost text-danger ml-auto">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
