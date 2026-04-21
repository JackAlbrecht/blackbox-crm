'use client';

import { createClient } from '@/lib/supabase/client';
import { LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { initials } from '@/lib/utils';

export function TopBar({
  tenantName, userEmail, fullName,
}: { tenantName: string; userEmail: string; fullName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-black/50 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="pill">{tenantName}</div>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-black/40 px-3 py-1.5 text-sm text-gray-200 hover:bg-primary-soft"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initials(fullName || userEmail)}
          </div>
          <span className="hidden sm:inline">{fullName || userEmail}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card/95 p-1 shadow-glow">
            <div className="px-3 py-2 text-xs text-gray-500">{userEmail}</div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-primary-soft"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
