'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Kanban, CheckSquare, Mail, Search, Settings, Shield,
  PhoneCall,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/lead-lists', label: 'Lead lists', icon: PhoneCall },
  { href: '/deals', label: 'Deals', icon: Kanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/seo', label: 'SEO', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  isSuperAdmin,
  brandName,
  brandLogo,
}: {
  isSuperAdmin: boolean;
  brandName?: string;
  brandLogo?: string | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-black/40 backdrop-blur lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        {brandLogo ? (
          <img
            src={brandLogo}
            alt=""
            className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 object-contain"
          />
        ) : (
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary-soft">
            <div className="h-3 w-3 rounded-sm bg-primary shadow-glow" />
          </div>
        )}
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-white">
            {brandName || 'Blackbox'}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500">CRM</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-primary-soft text-white shadow-glow'
                  : 'text-gray-400 hover:bg-primary-soft/50 hover:text-gray-100',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-gray-500 group-hover:text-primary')} />
              {label}
            </Link>
          );
        })}

        {isSuperAdmin && (
          <>
            <div className="mt-6 px-3 text-[10px] uppercase tracking-[0.25em] text-gray-600">Admin</div>
            <Link
              href="/admin"
              className={cn(
                'group mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                pathname.startsWith('/admin')
                  ? 'bg-cyan-soft text-white'
                  : 'text-gray-400 hover:bg-cyan-soft/50 hover:text-gray-100',
              )}
            >
              <Shield className="h-4 w-4 text-cyan" />
              Members
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4 text-[10px] uppercase tracking-[0.2em] text-gray-600">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
          SYSTEM ONLINE
        </div>
      </div>
    </aside>
  );
}
