import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Calendar as CalIcon, Clock, Users } from 'lucide-react';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';
import { CalendarView } from './CalendarView';

export const metadata = { title: 'Calendar · Blackbox CRM' };
export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient();
  const now = new Date();
  const monthStr = searchParams.month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, (m||1) - 1, 1);
  const end = new Date(y, (m||1), 1);

  // Pull meetings + bookings in range (booked calls set next_action_at and we create a 'meeting' activity).
  const safe = <T,>(p: PromiseLike<T>, fb: any) => Promise.resolve(p).then((r: any) => r && r.error ? { data: fb } : r, () => ({ data: fb }));
  const [{ data: meetings }, { data: callBookings }] = await Promise.all([
    safe(supabase.from('activities')
      .select('id, activity_type, subject, body, occurred_at, duration_sec, contact_id')
      .in('activity_type', ['meeting'])
      .gte('occurred_at', start.toISOString())
      .lt('occurred_at',  end.toISOString())
      .order('occurred_at') as any, [] as any[]),
    safe(supabase.from('call_logs')
      .select('id, outcome, notes, next_action_at, contact_id')
      .eq('outcome', 'booked')
      .gte('next_action_at', start.toISOString())
      .lt('next_action_at',  end.toISOString())
      .order('next_action_at') as any, [] as any[]),
  ]);

  const events = [
    ...((meetings as any[]) || []).map((m: any) => ({
      id: m.id, type: 'meeting', subject: m.subject, at: m.occurred_at, duration: m.duration_sec, contact_id: m.contact_id, notes: m.body,
    })),
    ...((callBookings as any[]) || [])
      .filter((b: any) => !!b.next_action_at)
      .map((b: any) => ({
        id: b.id, type: 'booked_call', subject: 'Booked appointment', at: b.next_action_at, contact_id: b.contact_id, notes: b.notes,
      })),
  ].sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="animate-fade-in space-y-6">
      <RealtimeRefresh tables={['activities','call_logs']} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white inline-flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-primary" /> Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-400">Every booked appointment + logged meeting, month at a glance.</p>
        </div>
      </header>

      <CalendarView year={y} month={(m||1)-1} events={events as any} />
    </div>
  );
}
