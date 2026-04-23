'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Play, Pause, Trash2, Loader2 } from 'lucide-react';

const TRIGGERS = [
  { key: 'contact_created',        label: 'A contact is created' },
  { key: 'contact_stage_changed',  label: "A contact's lifecycle changes" },
  { key: 'deal_created',           label: 'A deal is created' },
  { key: 'deal_stage_changed',     label: 'A deal moves stage' },
  { key: 'deal_won',               label: 'A deal is won' },
  { key: 'deal_lost',              label: 'A deal is lost' },
  { key: 'activity_logged',        label: 'An activity is logged' },
  { key: 'tag_added',              label: 'A tag is added to a record' },
  { key: 'task_overdue',           label: 'A task becomes overdue' },
];

export function WorkflowList({ initial }: { initial: any[] }) {
  const [workflows, setWorkflows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('contact_created');
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).maybeSingle();
    const { data, error } = await supabase.from('workflows').insert({
      tenant_id: profile!.tenant_id, name, trigger_type: trigger, is_active: false,
    }).select().single();
    setBusy(false);
    if (error) { alert(error.message); return; }
    setWorkflows((w) => [data, ...w]);
    setName(''); setCreating(false);
  }

  async function toggle(wf: any) {
    const { data } = await supabase.from('workflows').update({ is_active: !wf.is_active }).eq('id', wf.id).select().single();
    setWorkflows((ws) => ws.map((w) => w.id === wf.id ? (data || { ...w, is_active: !w.is_active }) : w));
  }

  async function remove(id: string) {
    if (!confirm('Delete this workflow?')) return;
    await supabase.from('workflows').delete().eq('id', id);
    setWorkflows((ws) => ws.filter((w) => w.id !== id));
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setCreating((v) => !v)} className="btn btn-primary">
        <Plus className="h-4 w-4" /> New workflow
      </button>

      {creating && (
        <form onSubmit={create} className="card space-y-3 p-4">
          <input className="input" placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">Cancel</button>
            <button disabled={busy || !name.trim()} className="btn btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create
            </button>
          </div>
          <p className="text-xs text-gray-500">
            We'll save the trigger now. Actions (send email, create task, add tag, set lifecycle…) can be attached from the workflow page (coming next).
          </p>
        </form>
      )}

      {workflows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-gray-500">
          <p className="text-sm">No automations yet. Build your first one above.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-border p-0">
          {workflows.map((wf) => {
            const trig = TRIGGERS.find((t) => t.key === wf.trigger_type);
            return (
              <li key={wf.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{wf.name}</span>
                    {wf.is_active ? (
                      <span className="pill !bg-emerald-500/10 !text-emerald-300 !border-emerald-500/30">Active</span>
                    ) : (
                      <span className="pill">Paused</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">When {trig?.label || wf.trigger_type}</div>
                  <div className="text-xs text-gray-600">{(wf.workflow_actions || []).length} action(s)</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(wf)} className="rounded-md border border-border p-1.5 text-gray-400 hover:text-primary">
                    {wf.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(wf.id)} className="rounded-md border border-border p-1.5 text-gray-400 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
