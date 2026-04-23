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

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
  }

  // Make sure the contact belongs to this tenant (RLS will enforce too).
  const { data: contact } = await supabase
    .from('contacts').select('id, tenant_id').eq('id', params.id).maybeSingle();
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
