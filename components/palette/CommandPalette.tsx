'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, Building2, Kanban, ArrowRight, LayoutDashboard, Activity, CheckSquare, PhoneCall, Mail, Plus } from 'lucide-react';

type Result = {
  id: string;
  type: 'contact' | 'company' | 'deal' | 'action';
  title: string;
  subtitle?: string;
  href: string;
};

const ACTIONS: Result[] = [
  { id: 'a-dash',  type: 'action', title: 'Go to dashboard',     href: '/dashboard',    subtitle: 'Overview' },
  { id: 'a-cont',  type: 'action', title: 'Go to contacts',      href: '/contacts',     subtitle: 'People' },
  { id: 'a-comp',  type: 'action', title: 'Go to companies',     href: '/companies',    subtitle: 'Organizations' },
  { id: 'a-deal',  type: 'action', title: 'Go to deals',         href: '/deals',        subtitle: 'Pipeline' },
  { id: 'a-act',   type: 'action', title: 'Go to activity feed', href: '/activities',   subtitle: 'Timeline' },
  { id: 'a-lead',  type: 'action', title: 'Go to lead lists',    href: '/lead-lists',   subtitle: 'Call queues' },
  { id: 'a-task',  type: 'action', title: 'Go to tasks',         href: '/tasks' },
  { id: 'a-camp',  type: 'action', title: 'Go to campaigns',     href: '/campaigns' },
  { id: 'a-ncon',  type: 'action', title: 'New contact',         href: '/contacts/new',     subtitle: 'Create' },
  { id: 'a-ncom',  type: 'action', title: 'New company',         href: '/companies/new',    subtitle: 'Create' },
  { id: 'a-imp',   type: 'action', title: 'Import contacts (CSV)', href: '/contacts/import' },
  { id: 'a-tag',   type: 'action', title: 'Manage tags',         href: '/tags' },
];

const ICONS = {
  contact:  Users,
  company:  Building2,
  deal:     Kanban,
  action:   ArrowRight,
} as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else { setQ(''); setSelected(0); }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) {
      setResults(ACTIONS);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const j = await res.json();
        if (cancelled) return;
        const rs: Result[] = [];
        for (const c of j.contacts || []) {
          rs.push({
            id: `c-${c.id}`,
            type: 'contact',
            title: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unnamed',
            subtitle: c.email || c.company || c.title || '',
            href: `/contacts/${c.id}`,
          });
        }
        for (const co of j.companies || []) {
          rs.push({
            id: `co-${co.id}`,
            type: 'company',
            title: co.name,
            subtitle: [co.domain, co.industry, co.address_city].filter(Boolean).join(' · '),
            href: `/companies/${co.id}`,
          });
        }
        for (const d of j.deals || []) {
          rs.push({
            id: `d-${d.id}`,
            type: 'deal',
            title: d.name,
            subtitle: d.stage?.name || '',
            href: `/deals`,
          });
        }
        // include actions that match query
        const queryLower = query.toLowerCase();
        for (const a of ACTIONS) {
          if (a.title.toLowerCase().includes(queryLower)) rs.push(a);
        }
        setResults(rs);
        setSelected(0);
      } catch {
        setResults([]);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  function go(r: Result) {
    setOpen(false);
    router.push(r.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
         onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[rgb(10,11,18)] shadow-glow"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts, companies, deals, or type a command…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && results[selected]) { e.preventDefault(); go(results[selected]); }
            }}
          />
          <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-500">
              {q ? `No results for "${q}"` : 'Start typing to search…'}
            </div>
          )}
          {results.map((r, i) => {
            const Icon = ICONS[r.type];
            const isSelected = i === selected;
            return (
              <button
                key={r.id}
                onClick={() => go(r)}
                onMouseEnter={() => setSelected(i)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                  isSelected ? 'bg-primary/15' : 'hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm text-white">{r.title}</div>
                  {r.subtitle && <div className="truncate text-xs text-gray-500">{r.subtitle}</div>}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-600">{r.type}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-gray-500">
          <span>
            <kbd className="rounded bg-white/5 px-1">↑</kbd><kbd className="ml-1 rounded bg-white/5 px-1">↓</kbd> navigate
            <span className="mx-2">·</span>
            <kbd className="rounded bg-white/5 px-1">↵</kbd> open
          </span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
