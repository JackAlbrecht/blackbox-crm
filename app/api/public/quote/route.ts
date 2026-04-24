import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Public endpoint for static marketing sites to post a lead into a tenant's CRM.
// POST /api/public/quote?tenant=<tenant-slug>
// Body: { name, phone, email?, city?, service?, message?, source?, ts? }
// CORS open so it works from blackboxadvancements.com and all its customer subpaths.
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get('tenant') || '').trim();
  if (!slug) return NextResponse.json({ error: 'tenant required' }, { status: 400, headers: CORS });

  let body: any = {};
  try { body = await req.json(); } catch {}
  if (body._website) return NextResponse.json({ ok: true, skipped: 'honeypot' }, { headers: CORS });

  const name    = String(body.name    || '').trim();
  const phone   = String(body.phone   || '').trim();
  const email   = String(body.email   || '').trim();
  const city    = String(body.city    || '').trim();
  const service = String(body.service || '').trim();
  const message = String(body.message || '').trim();
  const source  = String(body.source  || 'website').trim();

  if (!name || !phone) return NextResponse.json({ error: 'name and phone required' }, { status: 400, headers: CORS });

  const admin = createAdminClient();
  const { data: tenant } = await admin.from('tenants').select('id, name').eq('slug', slug).maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'tenant not found' }, { status: 404, headers: CORS });

  // Split name into first/last (naive)
  const parts = name.split(/\s+/);
  const first_name = parts[0] || null;
  const last_name  = parts.slice(1).join(' ') || null;

  // Compose a notes field the caller can read at a glance
  const notes = [
    service && `Requested: ${service}`,
    city    && `Area: ${city}`,
    message && `\n${message}`,
  ].filter(Boolean).join('\n').trim() || null;

  const { data: contact, error } = await admin.from('contacts').insert({
    tenant_id: tenant.id,
    first_name, last_name, email: email || null, phone,
    lifecycle_stage: 'lead',
    lead_source: source || 'website',
    notes,
    tags: ['website-quote'],
    source: 'website-quote',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  // Log an activity so the team sees it in the feed + realtime refresh pushes it.
  await admin.from('activities').insert({
    tenant_id: tenant.id,
    activity_type: 'note',
    subject: `New quote request: ${name}${service ? ' — ' + service : ''}`,
    body: `Phone: ${phone}\nEmail: ${email || '—'}\nCity: ${city || '—'}\n\n${message || ''}`.trim(),
    contact_id: contact?.id || null,
    outcome: 'received',
    meta: { source, city, service },
  });

  return NextResponse.json({ ok: true, contact_id: contact?.id }, { headers: CORS });
}
