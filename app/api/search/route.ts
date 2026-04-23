import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/search?q=text — returns up to 6 matches per object type for the palette.
export async function GET(req: Request) {
  const supabase = createClient();
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ contacts: [], companies: [], deals: [] });

  const like = `%${q.replace(/%/g, '')}%`;

  const [contactsRes, companiesRes, dealsRes] = await Promise.all([
    supabase.from('contacts')
      .select('id, first_name, last_name, email, company, title')
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},company.ilike.${like}`,
      )
      .limit(6),
    supabase.from('companies')
      .select('id, name, domain, industry, address_city')
      .or(`name.ilike.${like},domain.ilike.${like},website.ilike.${like}`)
      .limit(6)
      .then((r) => r.error ? { data: [] as any[] } : r),
    supabase.from('deals')
      .select('id, name, value, stage:deal_stages(name, color)')
      .ilike('name', like)
      .limit(6),
  ]);

  return NextResponse.json({
    contacts:  contactsRes.data  || [],
    companies: companiesRes.data || [],
    deals:     dealsRes.data     || [],
  });
}
