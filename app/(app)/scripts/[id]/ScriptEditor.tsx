'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, Loader2 } from 'lucide-react';

export function ScriptEditor({ initial, isNew }: { initial: { id: string | null; title: string; body: string }; isNew: boolean }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function save() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/scripts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initial.id, title, body }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || 'Save failed'); return; }
    router.push('/scripts'); router.refresh();
  }
  async function remove() {
    if (!initial.id) return;
    if (!confirm('Delete this script?')) return;
    await fetch('/api/scripts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: initial.id }) });
    router.push('/scripts'); router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <label className="label">Title</label>
        <input className="input" placeholder="e.g. Cold Call Script — Painting Contractors" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Script (markdown-ish, supports line breaks)</label>
        <textarea rows={22} className="input font-mono text-sm leading-relaxed" placeholder="Opener, pitch, objection handlers, tone rules…" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {err && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="flex items-center justify-between">
        {!isNew && initial.id ? (
          <button onClick={remove} className="btn btn-ghost text-danger"><Trash2 className="h-4 w-4" /> Delete</button>
        ) : <div />}
        <button onClick={save} disabled={busy || !title.trim() || !body.trim()} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
