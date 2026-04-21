import { LoginForm } from './LoginForm';
import { SplashFX } from '@/components/webgl/SplashFX';

export const metadata = { title: 'Sign in · Blackbox CRM' };

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SplashFX />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(5,6,12,0.85),rgba(5,6,12,0.55)_45%,transparent_80%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan shadow-glow-cyan" />
          Blackbox CRM
        </div>

        <h1 className="text-center text-4xl font-semibold leading-tight text-white sm:text-5xl"
            style={{ textShadow: '0 2px 24px rgba(5,6,12,0.9), 0 0 14px rgba(5,6,12,0.8)' }}>
          The operator&apos;s CRM.
        </h1>
        <p className="mt-3 text-center text-sm text-gray-300"
           style={{ textShadow: '0 1px 12px rgba(5,6,12,0.95)' }}>
          Members-only. Sign in with your work email.
        </p>

        <div className="mt-10 w-full card p-6 shadow-glow">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Not a member yet? <a className="text-primary hover:underline" href="https://blackboxadvancements.com">Request access</a>
        </p>
      </div>
    </main>
  );
}
