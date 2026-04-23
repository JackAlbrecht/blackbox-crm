import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Row = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  tags?: string[];
  notes?: string;
};

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
  const listName: string | undefined = body.list_name?.trim() || undefined;
  const listSource: string | undefined = body.list_source?.trim() || undefined;
  const listDescription: string | undefined = body.list_description?.trim() || undefined;

  if (!rows.length) return NextResponse.json({ error: 'No rows' }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: 'Import capped at 5000 rows per batch' }, { status: 400 });

  // Optionally create a lead list
  let listId: string | null = null;
  if (listName) {
    const { data: list, error: listErr } = await supabase
      .from('lead_lists')
      .insert({
        tenant_id: profile.tenant_id,
        name: listName,
        source: listSource || null,
        description: listDescription || null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (listErr) return NextResponse.json({ error: `Could not create list: ${listErr.message}` }, { status: 400 });
    listId = list.id;
  }

  // Clean + shape rows
  const cleaned = rows
    .map(r => ({
      tenant_id: profile.tenant_id,
      first_name: r.first_name?.trim() || null,
      last_name:  r.last_name?.trim() || null,
      email:      r.email?.trim().toLowerCase() || null,
      phone:      r.phone?.trim() || null,
      company:    r.company?.trim() || null,
      title:      r.title?.trim() || null,
      tags:       Array.isArray(r.tags) ? r.tags.map(t => String(t).trim()).filter(Boolean) : [],
      notes:      r.notes?.trim() || null,
    }))
    .filter(r => r.first_name || r.last_name || r.email || r.phone || r.company);

  if (!cleaned.length) return NextResponse.json({ error: 'No valid rows after cleaning' }, { status: 400 });

  // Insert in chunks of 500 to stay well under PostgREST limits
  const chunkSize = 500;
  const insertedIds: string[] = [];
  for (let i = 0; i < cleaned.length; i += chunkSize) {
    const chunk = cleaned.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('contacts')
      .insert(chunk)
      .select('id');
    if (error) return NextResponse.json({ error: `Insert failed at row ${i}: ${error.message}`, inserted: insertedIds.length }, { status: 400 });
    for (const c of data || []) insertedIds.push(c.id);
  }

  // Attach to list if we made one
  if (listId && insertedIds.length) {
    const linkRows = insertedIds.map(cid => ({ contact_id: cid, list_id: listId }));
    for (let i = 0; i < linkRows.length; i += chunkSize) {
      const chunk = linkRows.slice(i, i + chunkSize);
      const { error } = await supabase.from('contact_lists').insert(chunk);
      if (error) return NextResponse.json({ error: `List link failed: ${error.message}`, inserted: insertedIds.length, list_id: listId }, { status: 400 });
    }
  }

  return NextResponse.json({ inserted: insertedIds.length, list_id: listId });
}
