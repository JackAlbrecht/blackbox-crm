import { Suspense } from 'react';
import { SetPasswordClient } from './SetPasswordClient';

export const metadata = { title: 'Set password · Blackbox CRM' };
export const dynamic = 'force-dynamic';

export default function SetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(5,6,12,0.85),rgba(5,6,12,0.55)_45%,transparent_80%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan shadow-glow-cyan" />
          Blackbox CRM
        </div>

        <h1 className="text-center text-3xl font-semibold text-white sm:text-4xl">
          Set your password
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Pick a password you&apos;ll use to sign in from now on.
        </p>

        <div className="mt-10 w-full card p-6 shadow-glow">
          <Suspense fallback={null}>
            <SetPasswordClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
