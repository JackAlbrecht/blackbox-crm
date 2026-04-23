'use client';

import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Deal, DealStage } from '@/lib/types';
import { Plus, X, Loader2 } from 'lucide-react';

type Props = {
  initialStages: DealStage[];
  initialDeals: Deal[];
  contacts: { id: string; first_name: string | null; last_name: string | null; company: string | null }[];
};

export function DealBoard({ initialStages, initialDeals, contacts }: Props) {
  const [stages] = useState(initialStages);
  const [deals, setDeals] = useState(initialDeals);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creatingInStage, setCreatingInStage] = useState<string | null>(null);

  const dealsByStage = useMemo(() => {
    const m: Record<string, Deal[]> = {};
    for (const s of stages) m[s.id] = [];
    for (const d of deals) {
      const key = d.stage_id || '__no_stage__';
      (m[key] ||= []).push(d);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.id.localeCompare(b.id));
    return m;
  }, [stages, deals]);

  async function onDragEnd(r: DropResult) {
    if (!r.destination) return;
    if (r.source.droppableId === r.destination.droppableId && r.source.index === r.destination.index) return;

    const dealId = r.draggableId;
    const newStageId = r.destination.droppableId;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)));

    const supabase = createClient();
    await supabase.from('deals')
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq('id', dealId);
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const list = dealsByStage[stage.id] || [];
            const total = list.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
              <div key={stage.id} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-black/30">
                <div className="h-1" style={{ background: (stage as any).color || 'transparent' }} />
                <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300">
                      <span>{stage.name}</span>
                      {(stage as any).win_probability != null && (stage as any).win_probability > 0 && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-normal text-gray-400">
                          {(stage as any).win_probability}%
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">{list.length} · {formatCurrency(total)}</div>
                  </div>
                  <button onClick={() => setCreatingInStage(stage.id)} className="rounded-md p-1 text-gray-400 hover:bg-primary-soft hover:text-primary">
                    <Plus className="h-4 w-4" />
                  </button>
                </header>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[60vh] flex-col gap-2 p-2',
                        snapshot.isDraggingOver && 'bg-primary-soft/40',
                      )}
                    >
                      {list.map((deal, index) => (
                        <Draggable draggableId={deal.id} index={index} key={deal.id}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setEditing(deal)}
                              className={cn(
                                'cursor-pointer rounded-lg border border-border bg-card p-3 text-sm transition hover:border-primary/50',
                                snap.isDragging && 'shadow-glow',
                              )}
                            >
                              <div className="font-medium text-white">{deal.name}</div>
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-primary">{formatCurrency(deal.value)}</span>
                                <span className="text-gray-500">{deal.expected_close ? formatDate(deal.expected_close) : ''}</span>
                              </div>
                              {((deal as any).probability || (stage as any).win_probability) ? (
                                <div className="mt-2 h-1 rounded-full bg-white/5">
                                  <div
                                    className="h-1 rounded-full"
                                    style={{
                                      width: `${(deal as any).probability || (stage as any).win_probability || 0}%`,
                                      background: (stage as any).color || 'var(--primary, #6366f1)',
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {(editing || creatingInStage) && (
        <DealModal
          deal={editing}
          stageId={creatingInStage}
          stages={stages}
          contacts={contacts}
          onClose={() => { setEditing(null); setCreatingInStage(null); }}
          onSaved={(d, isNew) => {
            setDeals((prev) => (isNew ? [d, ...prev] : prev.map((x) => (x.id === d.id ? d : x))));
            setEditing(null); setCreatingInStage(null);
          }}
          onDeleted={(id) => {
            setDeals((prev) => prev.filter((x) => x.id !== id));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function DealModal({
  deal, stageId, stages, contacts, onClose, onSaved, onDeleted,
}: {
  deal: Deal | null;
  stageId: string | null;
  stages: DealStage[];
  contacts: Props['contacts'];
  onClose: () => void;
  onSaved: (d: Deal, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: deal?.name || '',
    value: String(deal?.value ?? ''),
    stage_id: deal?.stage_id || stageId || stages[0]?.id || '',
    contact_id: deal?.contact_id || '',
    expected_close: deal?.expected_close || '',
    notes: deal?.notes || '',
  });
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const supabase = createClient();
    const { data: prof } = await supabase.from('profiles').select('tenant_id').maybeSingle();
    if (!prof?.tenant_id) { setErr('No tenant'); setSaving(false); return; }

    const payload = {
      tenant_id: prof.tenant_id,
      name: form.name,
      value: form.value ? Number(form.value) : 0,
      stage_id: form.stage_id || null,
      contact_id: form.contact_id || null,
      expected_close: form.expected_close || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    let res;
    if (deal) {
      res = await supabase.from('deals').update(payload).eq('id', deal.id).select().single();
    } else {
      res = await supabase.from('deals').insert(payload).select().single();
    }
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved(res.data as Deal, !deal);
  }

  async function remove() {
    if (!deal) return;
    if (!confirm('Delete this deal?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('deals').delete().eq('id', deal.id);
    if (error) { setErr(error.message); return; }
    onDeleted(deal.id);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{deal ? 'Edit deal' : 'New deal'}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-primary-soft hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label className="label">Deal name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Value ($)</label>
              <input type="number" min="0" step="1" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div>
              <label className="label">Stage</label>
              <select className="input" value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                {stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Contact</label>
              <select className="input" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">— none —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || 'Unnamed'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expected close</label>
              <input type="date" className="input" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={4} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex items-center justify-between">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {deal ? 'Save' : 'Create deal'}
            </button>
            {deal && <button type="button" onClick={remove} className="btn btn-ghost text-danger">Delete</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
