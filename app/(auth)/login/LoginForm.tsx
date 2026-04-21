'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  // If an invite / recovery link landed here with hash-fragment tokens
  // (Supabase implicit flow), hand off to /auth-callback which handles them.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.location.replace('/auth-callback' + window.location.hash);
    }
  }, []);

  useEffect(() => {
    const e = params.get('error');
    if (e) setErr(e);
    const i = params.get('info');
    if (i) setInfo(i);
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setErr(
        error.message === 'Invalid login credentials'
          ? "That email and password don't match. First time? Use the setup link in your invite email."
          : error.message,
      );
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function forgot() {
    if (!email) { setErr('Enter your email first, then click Forgot password.'); return; }
    setErr(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth-callback?next=/set-password` },
    );
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setInfo('Password reset link sent. Check your email.');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}
      {info && (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {info}
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input
          type="email"
          required
          autoFocus
          className="input"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </button>

      <button
        type="button"
        onClick={forgot}
        disabled={loading}
        className="block w-full text-center text-xs text-gray-400 hover:text-primary"
      >
        Forgot password?
      </button>
    </form>
  );
}
