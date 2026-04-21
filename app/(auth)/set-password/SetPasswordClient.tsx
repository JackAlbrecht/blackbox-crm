'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function SetPasswordClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Confirm the user has a valid session from the invite / recovery link.
  useEffect(() => {
    (async () => {
      const supabase = createClient();

      // If tokens arrived in the URL hash (admin-generated invite), set them now.
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        const hp = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, '', '/set-password');
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setHasSession(true);
        setEmail(user.email ?? '');
      }
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (pw.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.replace('/');
      router.refresh();
    }, 900);
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-gray-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            This setup link is invalid or has expired. Ask your admin to resend your invite, or
            request a new password reset from the sign-in page.
          </span>
        </div>
        <a href="/login" className="btn btn-primary w-full text-center">Back to sign in</a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <div className="text-sm text-gray-200">Password set. Signing you in…</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {email && (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
          Setting password for <span className="text-white">{email}</span>
        </div>
      )}

      <div>
        <label className="label">New password</label>
        <input
          type="password"
          required
          minLength={8}
          autoFocus
          className="input"
          placeholder="At least 8 characters"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Confirm password</label>
        <input
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="Re-enter password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save password & sign in
      </button>
    </form>
  );
}
