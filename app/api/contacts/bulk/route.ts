import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/contacts/bulk  { ids: string[], action: 'set_lifecycle'|'set_owner'|'add_tag'|'delete'|'set_dnc'|'add_to_list', value?: string|boolean }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const { ids, action, value } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'no ids' }, { status: 400 });

  const patches: any = {};
  switch (action) {
    case 'set_lifecycle': patches.lifecycle_stage = value || null; break;
    case 'set_owner':     patches.owner_user_id   = value || null; break;
    case 'set_dnc':       patches.do_not_contact  = !!value;       break;
    case 'add_tag': {
      // append a tag to the tags[] array safely (fetch + write back)
      const { data: rows } = await supabase.from('contacts').select('id, tags').in('id', ids);
      for (const r of rows || []) {
        const newTags = Array.from(new Set([...(r.tags || []), String(value)]));
        await supabase.from('contacts').update({ tags: newTags }).eq('id', r.id);
      }
      return NextResponse.json({ ok: true, n: (rows || []).length });
    }
    case 'delete': {
      const { error } = await supabase.from('contacts').delete().in('id', ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, n: ids.length });
    }
    case 'add_to_list': {
      if (!value) return NextResponse.json({ error: 'list id required' }, { status: 400 });
      const rows = ids.map((cid: string) => ({ contact_id: cid, list_id: String(value) }));
      const { error } = await supabase.from('contact_lists').upsert(rows, { onConflict: 'contact_id,list_id', ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, n: rows.length });
    }
    default: return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
  const { error } = await supabase.from('contacts').update(patches).in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, n: ids.length });
}
