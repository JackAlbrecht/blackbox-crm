import { SplashFX } from '@/components/webgl/SplashFX';
import Link from 'next/link';

export const metadata = { title: 'Access denied · Blackbox CRM' };

export default function DeniedPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SplashFX />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(5,6,12,0.85),rgba(5,6,12,0.55)_45%,transparent_80%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-semibold text-white">Access denied</h1>
        <p className="mt-3 text-sm text-gray-400">
          This account isn&apos;t on the member list. If you believe this is a mistake,
          reach out to the account owner.
        </p>
        <Link href="/login" className="btn btn-ghost mt-8">Back to sign in</Link>
      </div>
    </main>
  );
}
