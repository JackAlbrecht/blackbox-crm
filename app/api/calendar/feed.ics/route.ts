import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

/**
 * GET /api/calendar/feed.ics?token=<tenantId.sig>
 * Returns an iCalendar (RFC 5545) feed containing every booked call (call_logs
 * w/ outcome='booked' + next_action_at) and every 'meeting' activity for that
 * tenant. Google Calendar + Apple Calendar + Outlook can subscribe to this URL.
 *
 * Auth: the URL contains a tenant id + HMAC signature using the
 * SUPABASE_SERVICE_ROLE_KEY as the secret. That way the URL is not guessable.
 */
function escICS(s: string) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function toICSDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function sign(tenantId: string) {
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(tenantId).digest('hex').slice(0, 24);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const [tenantId, sig] = token.split('.');
  if (!tenantId || !sig) return new NextResponse('missing token', { status: 401 });
  if (sign(tenantId) !== sig) return new NextResponse('bad signature', { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to   = new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString();

  const [{ data: bookings }, { data: meetings }, { data: tenantRow }] = await Promise.all([
    admin.from('call_logs').select('id, contact_id, outcome, notes, next_action_at').eq('tenant_id', tenantId).eq('outcome', 'booked').gte('next_action_at', from).lte('next_action_at', to),
    admin.from('activities').select('id, contact_id, subject, body, occurred_at, duration_sec').eq('tenant_id', tenantId).eq('activity_type', 'meeting').gte('occurred_at', from).lte('occurred_at', to),
    admin.from('tenants').select('name, display_name, meeting_location, meeting_phone, meeting_description').eq('id', tenantId).maybeSingle(),
  ]);

  // Resolve contact names for readable subjects
  const contactIds = [...(bookings || []), ...(meetings || [])].map((x: any) => x.contact_id).filter(Boolean);
  const { data: contacts } = contactIds.length
    ? await admin.from('contacts').select('id, first_name, last_name, company, phone').in('id', contactIds)
    : { data: [] };
  const contactById: Record<string, any> = {};
  for (const c of contacts || []) contactById[c.id] = c;

  const calName = (tenantRow as any)?.display_name || (tenantRow as any)?.name || 'Blackbox CRM';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blackbox CRM//EN',
    `X-WR-CALNAME:${escICS(calName + ' CRM')}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const addEvent = (id: string, at: string, duration_min: number, subject: string, notes: string | null, contactId: string | null) => {
    const c = contactId ? contactById[contactId] : null;
    const name = c ? [c.first_name, c.last_name].filter(Boolean).join(' ') : null;
    const title = name ? `${subject || 'Meeting'} — ${name}${c?.company ? ' · ' + c.company : ''}` : (subject || 'Meeting');
    const descParts = [] as string[];
    if (notes) descParts.push(notes);
    const t: any = tenantRow || {};
    if (t.meeting_description) descParts.push(t.meeting_description);
    if (t.meeting_location) descParts.push(`Join meeting: ${t.meeting_location}`);
    if (t.meeting_phone) descParts.push(t.meeting_phone);
    if (c?.phone) descParts.push(`Customer phone: ${c.phone}`);
    descParts.push(`Open in CRM: https://crm.blackboxadvancements.com/contacts/${contactId}`);
    const end = new Date(new Date(at).getTime() + duration_min * 60 * 1000).toISOString();
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${id}@blackbox-crm`);
    lines.push(`DTSTAMP:${toICSDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${toICSDate(at)}`);
    lines.push(`DTEND:${toICSDate(end)}`);
    lines.push(`SUMMARY:${escICS(title)}`);
    const t2: any = tenantRow || {};
    if (t2.meeting_location) lines.push(`LOCATION:${escICS(t2.meeting_location)}`);
    lines.push(`DESCRIPTION:${escICS(descParts.join('\\n'))}`);
    if (contactId) lines.push(`URL:https://crm.blackboxadvancements.com/contacts/${contactId}`);
    lines.push('END:VEVENT');
  };

  for (const b of bookings || []) {
    if (!b.next_action_at) continue;
    addEvent(`booked-${b.id}`, b.next_action_at, 30, 'Booked appointment', (b as any).notes || null, b.contact_id);
  }
  for (const m of meetings || []) {
    if (!m.occurred_at) continue;
    const dur = Math.max(15, Math.round(((m as any).duration_sec || 30 * 60) / 60));
    addEvent(`meet-${m.id}`, m.occurred_at, dur, (m as any).subject || 'Meeting', (m as any).body || null, m.contact_id);
  }

  lines.push('END:VCALENDAR');

  return new NextResponse(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': `attachment; filename="blackbox-crm.ics"`,
    },
  });
}
