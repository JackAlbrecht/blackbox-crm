'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Kanban, CheckSquare, Mail, Search, Settings, Shield, BarChart3, Workflow, Bell, Calendar as CalendarIcon,
  PhoneCall, Building2, Activity, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/contacts',   label: 'Contacts',   icon: Users },
  { href: '/companies',  label: 'Companies',  icon: Building2 },
  { href: '/deals',      label: 'Deals',      icon: Kanban },
  { href: '/lead-lists', label: 'Lead lists', icon: PhoneCall },
  { href: '/activities', label: 'Activity',   icon: Activity },
  { href: '/calendar',   label: 'Calendar',   icon: CalendarIcon },
  { href: '/reports',    label: 'Reports',    icon: BarChart3 },
  { href: '/automations',label: 'Automations',icon: Workflow },
  { href: '/tasks',      label: 'Tasks',      icon: CheckSquare },
  { href: '/campaigns',  label: 'Campaigns',  icon: Mail },
  { href: '/seo',        label: 'SEO',        icon: Search },
  { href: '/tags',       label: 'Tags',       icon: Shield },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

export function MobileNav({ brandName }: { brandName?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40 text-white lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-[rgb(10,11,18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="font-semibold text-white">{brandName || 'Blackbox'}</div>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition',
                      active
                        ? 'bg-primary-soft text-white border border-primary/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
