'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { Plus, Check, X, Trash2, Loader2, Flag } from 'lucide-react';

type ContactLite = { id: string; first_name: string | null; last_name: string | null; company: string | null };
type DealLite = { id: string; name: string };

export function TasksClient({
  initialTasks,
  contacts,
  deals,
}: {
  initialTasks: Task[];
  contacts: ContactLite[];
  deals: DealLite[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');

  const filtered = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => !t.completed);
    if (filter === 'done') return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  async function toggle(task: Task) {
    const next = !task.completed;
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));
    const supabase = createClient();
    await supabase.from('tasks').update({ completed: next }).eq('id', task.id);
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return;
    setTasks((p) => p.filter((t) => t.id !== id));
    const supabase = createClient();
    await supabase.from('tasks').delete().eq('id', id);
  }

  function contactLabel(id: string | null) {
    if (!id) return '';
    const c = contacts.find((x) => x.id === id);
    if (!c) return '';
    return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || '';
  }

  function dealLabel(id: string | null) {
    if (!id) return '';
    return deals.find((d) => d.id === id)?.name || '';
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-black/30 p-1 text-sm">
          {(['open', 'done', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 capitalize transition',
                filter === f ? 'bg-primary text-white' : 'text-gray-400 hover:text-white',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            {filter === 'open' ? 'Nothing on your plate. Add a task to get started.' : 'No tasks here.'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const overdue = !t.completed && t.due_at && new Date(t.due_at) < new Date();
              return (
                <li key={t.id} className="group flex items-start gap-3 px-4 py-3 transition hover:bg-primary-soft/20">
                  <button
                    onClick={() => toggle(t)}
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                      t.completed
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:border-primary',
                    )}
                    aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {t.completed && <Check className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    onClick={() => setEditing(t)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className={cn('font-medium', t.completed ? 'text-gray-500 line-through' : 'text-white')}>
                      {t.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {t.due_at && (
                        <span className={cn(overdue && 'text-danger')}>
                          Due {formatDate(t.due_at)}
                        </span>
                      )}
                      {t.priority && (
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                          t.priority === 'high' && 'bg-danger/15 text-danger',
                          t.priority === 'medium' && 'bg-primary-soft text-primary',
                          t.priority === 'low' && 'bg-white/5 text-gray-400',
                        )}>
                          <Flag className="h-3 w-3" /> {t.priority}
                        </span>
                      )}
                      {t.contact_id && <span>· {contactLabel(t.contact_id)}</span>}
                      {t.deal_id && <span>· {dealLabel(t.deal_id)}</span>}
                    </div>
                  </button>

                  <button
                    onClick={() => remove(t.id)}
                    className="mt-0.5 rounded-md p-1 text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(editing || creating) && (
        <TaskModal
          task={editing}
          contacts={contacts}
          deals={deals}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(t, isNew) => {
            setTasks((p) => (isNew ? [t, ...p] : p.map((x) => (x.id === t.id ? t : x))));
            setEditing(null); setCreating(false);
          }}
          onDeleted={(id) => {
            setTasks((p) => p.filter((x) => x.id !== id));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function TaskModal({
  task, contacts, deals, onClose, onSaved, onDeleted,
}: {
  task: Task | null;
  contacts: ContactLite[];
  deals: DealLite[];
  onClose: () => void;
  onSaved: (t: Task, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: task?.title || '',
    notes: task?.notes || '',
    due_at: task?.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
    priority: task?.priority || 'medium',
    contact_id: task?.contact_id || '',
    deal_id: task?.deal_id || '',
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const supabase = createClient();
    const { data: prof } = await supabase.from('profiles').select('tenant_id').maybeSingle();
    if (!prof?.tenant_id) { setErr('No tenant'); setSaving(false); return; }

    const payload = {
      tenant_id: prof.tenant_id,
      title: form.title,
      notes: form.notes || null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      priority: form.priority || null,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
    };

    let res;
    if (task) {
      res = await supabase.from('tasks').update(payload).eq('id', task.id).select().single();
    } else {
      res = await supabase.from('tasks').insert(payload).select().single();
    }
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved(res.data as Task, !task);
  }

  async function remove() {
    if (!task) return;
    if (!confirm('Delete this task?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { setErr(error.message); return; }
    onDeleted(task.id);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{task ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-primary-soft hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              required
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Call Grandview about spring maintenance"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due</label>
              <input
                type="datetime-local"
                className="input"
                value={form.due_at}
                onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Contact</label>
              <select
                className="input"
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
              >
                <option value="">— none —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || 'Unnamed'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Deal</label>
              <select
                className="input"
                value={form.deal_id}
                onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
              >
                <option value="">— none —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              rows={4}
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex items-center justify-between">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {task ? 'Save' : 'Create task'}
            </button>
            {task && (
              <button type="button" onClick={remove} className="btn btn-ghost text-danger">
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
