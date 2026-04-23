import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OUTCOMES = [
  'answered','no_answer','voicemail','busy','booked',
  'not_interested','callback','wrong_number','do_not_call',
] as const;

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS on contacts already limits this to the caller's tenant — don't require
  // a separate profile lookup here (if the profiles policy ever gets weird, this
  // endpoint still works).
  const { data: contact, error: contactErr } = await supabase
    .from('contacts').select('id, tenant_id').eq('id', params.id).maybeSingle();
  if (contactErr) return NextResponse.json({ error: contactErr.message }, { status: 400 });
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const outcome = String(body.outcome || '').trim();
  if (!OUTCOMES.includes(outcome as any)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 5000) : null;
  const listId = body.list_id ? String(body.list_id) : null;
  const nextAt = body.next_action_at ? new Date(body.next_action_at).toISOString() : null;
  const calledAt = body.called_at ? new Date(body.called_at).toISOString() : new Date().toISOString();

  const { data: log, error } = await supabase
    .from('call_logs')
    .insert({
      tenant_id: contact.tenant_id,
      contact_id: params.id,
      list_id: listId,
      caller_id: user.id,
      outcome,
      notes,
      called_at: calledAt,
      next_action_at: nextAt,
    })
    .select('id, outcome, notes, called_at, next_action_at, caller_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ call: log });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('call_logs')
    .select('id, outcome, notes, called_at, next_action_at, caller_id, list_id')
    .eq('contact_id', params.id)
    .order('called_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ calls: data || [] });
}


// DELETE /api/contacts/[id]/calls — removes the most recent call_log for this contact
// (used by the Undo button in the lead-list QuickCallRow). Recomputes denormalized
// last_call_* fields on the contact so the UI and activity feed stay consistent.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: latest } = await supabase
    .from('call_logs')
    .select('id')
    .eq('contact_id', params.id)
    .order('called_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return NextResponse.json({ ok: true, deleted: 0 });

  const { error: delErr } = await supabase.from('call_logs').delete().eq('id', latest.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  // Recompute the denormalized last_call_* fields on contacts from whatever call log
  // now sits at the top (or clear them if none remain).
  const { data: next } = await supabase
    .from('call_logs')
    .select('called_at, outcome, next_action_at')
    .eq('contact_id', params.id)
    .order('called_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from('contacts').update({
    last_call_at:      next?.called_at      ?? null,
    last_call_outcome: next?.outcome        ?? null,
    next_follow_up_at: next?.next_action_at ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id);

  return NextResponse.json({ ok: true, deleted: 1 });
}
