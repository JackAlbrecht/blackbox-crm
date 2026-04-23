'use client';
import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export function NotificationsBell() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/notifications');
      const j = await r.json();
      setItems(j.items || []);
    } catch {}
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const unread = items.filter((i) => !i.read_at).length;

  async function markAll() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    load();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40 text-gray-300 hover:text-primary">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card/95 shadow-glow z-20">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Notifications</div>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">You're all caught up.</div>
            ) : items.map((n) => (
              <Link key={n.id} href={n.href || '#'} onClick={() => setOpen(false)}
                    className={`block border-b border-border px-4 py-3 transition hover:bg-white/5 ${!n.read_at ? 'bg-primary/5' : ''}`}>
                <div className="text-sm font-medium text-white">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-gray-400">{n.body}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{formatDate(n.created_at)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
