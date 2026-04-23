'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Event = { id: string; type: string; subject: string | null; at: string; duration?: number | null; contact_id?: string | null; notes?: string | null };

export function CalendarView({ year, month, events }: { year: number; month: number; events: Event[] }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = first.getDay(); // 0 = Sun
  const monthName = first.toLocaleString('default', { month: 'long' });
  const prevMonth = `${year}-${String(month).padStart(2,'0')}`; // month is 0-indexed; Math below handles wrap
  function moveMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    window.location.href = `/calendar?month=${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  // Index events by date string (YYYY-MM-DD).
  const byDay: Record<string, Event[]> = {};
  for (const e of events) {
    const d = new Date(e.at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    (byDay[key] ||= []).push(e);
  }

  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  const cells: { key: string; day: number | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ key: `pad-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ key, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ key: `tail-${cells.length}`, day: null });

  const selectedEvents = selectedDay ? (byDay[selectedDay] || []) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card p-4">
        <div className="flex items-center justify-between px-2 pb-3">
          <button onClick={() => moveMonth(-1)} className="rounded-md border border-border p-1.5 text-gray-400 hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
          <div className="text-sm font-semibold uppercase tracking-wider text-white">{monthName} {year}</div>
          <button onClick={() => moveMonth(1)} className="rounded-md border border-border p-1.5 text-gray-400 hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-gray-500 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(({ key, day }) => {
            const evs = day ? (byDay[key] || []) : [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            return (
              <button
                key={key}
                disabled={!day}
                onClick={() => day && setSelectedDay(key)}
                className={`min-h-[76px] rounded-md border p-1.5 text-left transition ${
                  !day ? 'invisible' :
                  isSelected ? 'border-primary/60 bg-primary/10' :
                  isToday    ? 'border-primary/40 bg-primary/5' :
                               'border-border bg-black/20 hover:border-primary/30'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-gray-300'}`}>{day}</div>
                    <div className="mt-1 space-y-0.5">
                      {evs.slice(0, 3).map((e) => (
                        <div key={e.id} className="truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] text-primary">
                          {new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {e.subject || (e.type === 'booked_call' ? 'Booked' : 'Meeting')}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[9px] text-gray-500">+{evs.length - 3} more</div>}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {selectedDay ? new Date(selectedDay + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Agenda'}
        </h2>
        {!selectedDay && (
          <p className="text-xs text-gray-500">Click a day on the calendar to see its meetings and booked appointments here.</p>
        )}
        {selectedDay && selectedEvents.length === 0 && <p className="text-xs text-gray-500">Nothing scheduled.</p>}
        {selectedEvents.length > 0 && (
          <ul className="space-y-2">
            {selectedEvents.map((e) => (
              <li key={e.id} className="rounded-md border border-border bg-black/20 p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-primary">
                  <span>{e.type === 'booked_call' ? 'Booked appt' : 'Meeting'}</span>
                  <span className="text-gray-500">{new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {e.subject && <div className="mt-1 text-sm font-medium text-white">{e.subject}</div>}
                {e.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-400">{e.notes}</p>}
                {e.contact_id && <Link href={`/contacts/${e.contact_id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Users className="h-3 w-3" /> Open contact</Link>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
