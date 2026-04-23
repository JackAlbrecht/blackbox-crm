'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribes to Postgres changes on selected tables and triggers router.refresh()
 * so the whole page re-renders server-side with fresh data. Lightweight alternative
 * to a full state-tree refactor — good enough for the lead-list dial room, deals
 * kanban, activity feed, contacts list, etc.
 *
 * Pass an array of table names. They must be included in the `supabase_realtime`
 * publication (done via migration 013).
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: any = null;
    const channels = tables.map((table) =>
      supabase
        .channel(`rt:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          // Debounce bursts of changes into one refresh.
          if (t) clearTimeout(t);
          t = setTimeout(() => router.refresh(), 250);
        })
        .subscribe(),
    );
    return () => {
      if (t) clearTimeout(t);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [router, tables.join(',')]);

  return null;
}
