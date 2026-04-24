'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Animated theme switcher. Sun/moon slide and fade using a springy cubic-bezier.
 *
 * Integrated with the CRM's existing light-mode CSS which keys off
 * `html[data-theme="light"]` (globals.css). We set BOTH `data-theme` (for our
 * palette overrides) and the Tailwind `dark` class (in case any future shadcn
 * component uses it) so either convention works.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');

  React.useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('bb-theme')) as 'light' | 'dark' | null;
    const resolved = saved || 'dark';
    apply(resolved);
  }, []);

  function apply(next: 'light' | 'dark') {
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    try { localStorage.setItem('bb-theme', next); } catch {}
  }

  const toggle = React.useCallback(() => {
    apply(theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40 text-gray-300 transition-colors hover:text-primary ${className}`}
    >
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          theme === 'light'
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-5 scale-50 opacity-0'
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          theme === 'dark'
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-5 scale-50 opacity-0'
        }`}
      />
    </button>
  );
}
