'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Kanban, CheckSquare, Mail, Search, Settings, Shield,
  PhoneCall, UsersRound, Building2, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/contacts',   label: 'Contacts',   icon: Users },
  { href: '/companies',  label: 'Companies',  icon: Building2 },
  { href: '/deals',      label: 'Deals',      icon: Kanban },
  { href: '/lead-lists', label: 'Lead lists', icon: PhoneCall },
  { href: '/activities', label: 'Activity',   icon: Activity },
  { href: '/tasks',      label: 'Tasks',      icon: CheckSquare },
  { href: '/campaigns',  label: 'Campaigns',  icon: Mail },
  { href: '/seo',        label: 'SEO',        icon: Search },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

export function Sidebar({
  isSuperAdmin,
  isTenantAdmin,
  brandName,
  brandLogo,
  brandLogoWide,
  tagline,
}: {
  isSuperAdmin: boolean;
  isTenantAdmin?: boolean;
  brandName?: string;
  brandLogo?: string | null;
  brandLogoWide?: string | null;
  tagline?: string | null;
}) {
  const pathname = usePathname();
  const canManageTeam = isSuperAdmin || isTenantAdmin;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-black/40 backdrop-blur lg:flex">
      {/* Brand header — big, centered treatment so the tenant's logo is the hero. */}
      <div className="flex flex-col items-center gap-2 border-b border-border px-5 py-6">
        {brandLogoWide ? (
          <img
            src={brandLogoWide}
            alt={brandName || 'Logo'}
            className="h-14 w-auto max-w-[190px] object-contain"
          />
        ) : brandLogo ? (
          <img
            src={brandLogo}
            alt={brandName || 'Logo'}
            className="h-14 w-14 rounded-xl border border-white/10 bg-white/5 object-contain p-1"
          />
        ) : (
          <div
            className="relative flex h-14 w-14 items-center justify-center rounded-xl border"
            style={{ borderColor: 'rgba(var(--primary-rgb), 0.4)', backgroundColor: 'var(--primary-soft)' }}
          >
            <div
              className="h-5 w-5 rounded-sm"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 24px var(--primary-glow)' }}
            />
          </div>
        )}
        <div className="text-center leading-tight">
          <div className="text-sm font-semibold tracking-tight text-white">
            {brandName || 'Blackbox'}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
            {tagline || 'CRM'}
          </div>
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
                  ? 'text-white shadow-glow'
                  : 'text-gray-400 hover:text-gray-100',
              )}
              style={active ? { backgroundColor: 'var(--primary-soft)' } : undefined}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: active ? 'var(--primary)' : undefined }}
              />
              {label}
            </Link>
          );
        })}

        {canManageTeam && (
          <Link
            href="/team"
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
              pathname.startsWith('/team')
                ? 'text-white shadow-glow'
                : 'text-gray-400 hover:text-gray-100',
            )}
            style={pathname.startsWith('/team') ? { backgroundColor: 'var(--primary-soft)' } : undefined}
          >
            <UsersRound
              className="h-4 w-4"
              style={{ color: pathname.startsWith('/team') ? 'var(--primary)' : undefined }}
            />
            Team
          </Link>
        )}

        {isSuperAdmin && (
          <>
            <div className="mt-6 px-3 text-[10px] uppercase tracking-[0.25em] text-gray-600">Blackbox Admin</div>
            <Link
              href="/admin"
              className={cn(
                'group mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                pathname.startsWith('/admin')
                  ? 'bg-cyan-soft text-white'
                  : 'text-gray-400 hover:bg-cyan-soft/70 hover:text-gray-100',
              )}
            >
              <Shield className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Workspaces
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4 text-[10px] uppercase tracking-[0.2em] text-gray-600">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
          />
          Powered by Blackbox
        </div>
      </div>
    </aside>
  );
}
