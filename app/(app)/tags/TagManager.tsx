'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Loader2, Tag as TagIcon } from 'lucide-react';

const COLORS = ['#94a3b8','#38bdf8','#6366f1','#a855f7','#ec4899','#ef4444','#f59e0b','#10b981','#14b8a6','#0ea5e9'];

export function TagManager({ initial }: { initial: any[] }) {
  const [tags, setTags] = useState(initial);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[2]);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('tags')
      .insert({ name: name.trim(), color })
      .select().single();
    setBusy(false);
    if (error) { alert(error.message); return; }
    setTags((t) => [...t, data].sort((a,b) => a.name.localeCompare(b.name)));
    setName('');
  }

  async function remove(id: string) {
    if (!confirm('Delete this tag? It will be removed from every record it\'s attached to.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setTags((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card flex items-center gap-3 p-4">
        <input
          className="input flex-1"
          placeholder="New tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              aria-label={`Use color ${c}`}
              className={`h-6 w-6 rounded-full border-2 transition ${c === color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
        <button disabled={busy || !name.trim()} className="btn btn-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add tag
        </button>
      </form>

      {tags.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-gray-500">
          <TagIcon className="h-8 w-8 text-gray-700" />
          <p className="text-sm">No tags yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-border">
            {tags.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.color || '#6366f1' }} />
                  <span className="text-sm text-white">{t.name}</span>
                </div>
                <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
