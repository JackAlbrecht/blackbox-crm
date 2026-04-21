'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, cn } from '@/lib/utils';
import type { SeoKeyword } from '@/lib/types';
import { Plus, ArrowUp, ArrowDown, Minus, Trash2, Loader2 } from 'lucide-react';

export function SeoClient({ initial }: { initial: SeoKeyword[] }) {
  const [rows, setRows] = useState(initial);
  const [showForm, setShowForm] = useState(false);

  async function addRank(row: SeoKeyword, newRank: number) {
    setRows((p) => p.map((r) => (r.id === row.id
      ? { ...r, previous_rank: r.current_rank, current_rank: newRank, last_checked: new Date().toISOString() }
      : r)));
    const supabase = createClient();
    await supabase.from('seo_keywords').update({
      previous_rank: row.current_rank,
      current_rank: newRank,
      last_checked: new Date().toISOString(),
    }).eq('id', row.id);
  }

  async function remove(id: string) {
    if (!confirm('Delete this keyword?')) return;
    setRows((p) => p.filter((r) => r.id !== id));
    const supabase = createClient();
    await supabase.from('seo_keywords').delete().eq('id', id);
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Add keyword
        </button>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No keywords tracked yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Target URL</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Last checked</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const change = r.previous_rank != null && r.current_rank != null
                  ? r.previous_rank - r.current_rank : 0;
                return (
                  <tr key={r.id} className="table-row group">
                    <td className="px-4 py-3 font-medium text-white">{r.keyword}</td>
                    <td className="px-4 py-3 text-gray-400">
                      <a href={r.target_url} target="_blank" rel="noreferrer" className="hover:text-primary">{r.target_url}</a>
                    </td>
                    <td className="px-4 py-3">
                      <RankInput initial={r.current_rank ?? ''} onCommit={(v) => addRank(r, v)} />
                    </td>
                    <td className="px-4 py-3">
                      {change > 0 && <span className="inline-flex items-center gap-1 text-success"><ArrowUp className="h-3 w-3" />+{change}</span>}
                      {change < 0 && <span className="inline-flex items-center gap-1 text-danger"><ArrowDown className="h-3 w-3" />{change}</span>}
                      {change === 0 && <span className="inline-flex items-center gap-1 text-gray-500"><Minus className="h-3 w-3" />0</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.last_checked ? formatDate(r.last_checked) : 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(r.id)} className="text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <AddForm
          onClose={() => setShowForm(false)}
          onCreated={(row) => { setRows((p) => [row, ...p]); setShowForm(false); }}
        />
      )}
    </>
  );
}

function RankInput({ initial, onCommit }: { initial: number | string; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(initial));
  return (
    <input
      className={cn('input !w-20 !py-1.5')}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v);
        if (!Number.isNaN(n) && n !== 0) onCommit(n);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder="—"
    />
  );
}

function AddForm({ onClose, onCreated }: { onClose: () => void; onCreated: (r: SeoKeyword) => void }) {
  const [form, setForm] = useState({ keyword: '', target_url: '', current_rank: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: prof } = await supabase.from('profiles').select('tenant_id').maybeSingle();
    if (!prof?.tenant_id) { setErr('No tenant'); setSaving(false); return; }
    const { data, error } = await supabase.from('seo_keywords').insert({
      tenant_id: prof.tenant_id,
      keyword: form.keyword,
      target_url: form.target_url,
      current_rank: form.current_rank ? Number(form.current_rank) : null,
      last_checked: form.current_rank ? new Date().toISOString() : null,
    }).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onCreated(data as SeoKeyword);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-full max-w-md card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Add keyword</h3>
        <div>
          <label className="label">Keyword</label>
          <input required className="input" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
        </div>
        <div>
          <label className="label">Target URL</label>
          <input required type="url" className="input" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://…" />
        </div>
        <div>
          <label className="label">Current rank (optional)</label>
          <input type="number" min="1" className="input" value={form.current_rank} onChange={(e) => setForm({ ...form, current_rank: e.target.value })} />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex justify-between">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Add
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
