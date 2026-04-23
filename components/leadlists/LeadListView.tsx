'use client';
import { useState, useMemo } from 'react';
import { QuickCallRow } from './QuickCallRow';
import { ListFilterBar } from './ListFilterBar';

export function LeadListView({ contacts, listId }: { contacts: any[]; listId: string }) {
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => {
    const c = { all: contacts.length, uncalled: 0, booked: 0, callback: 0, no_answer: 0, dead: 0 };
    for (const x of contacts) {
      if (!x.last_call_outcome) c.uncalled++;
      else if (x.last_call_outcome === 'booked') c.booked++;
      else if (x.last_call_outcome === 'callback') c.callback++;
      else if (x.last_call_outcome === 'no_answer' || x.last_call_outcome === 'voicemail' || x.last_call_outcome === 'busy') c.no_answer++;
      else if (['not_interested','wrong_number','do_not_call'].includes(x.last_call_outcome)) c.dead++;
    }
    return c;
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filter === 'all') return true;
      if (filter === 'uncalled') return !c.last_call_outcome;
      if (filter === 'no_answer') return ['no_answer','voicemail','busy'].includes(c.last_call_outcome);
      if (filter === 'dead') return ['not_interested','wrong_number','do_not_call'].includes(c.last_call_outcome);
      return c.last_call_outcome === filter;
    });
  }, [contacts, filter]);

  return (
    <div className="space-y-4">
      <ListFilterBar filter={filter} setFilter={setFilter} counts={counts} />
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">No contacts match this filter.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => <QuickCallRow key={c.id} c={c} listId={listId} />)}
        </div>
      )}
    </div>
  );
}
