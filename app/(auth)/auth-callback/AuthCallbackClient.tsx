'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const next = params.get('next') || '/';

      // 1) Hash fragment flow (implicit / admin-generated invite + recovery links).
      //    e.g. #access_token=...&refresh_token=...&type=invite|recovery|magiclink
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hp = new URLSearchParams(hash);
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        const type = hp.get('type');
        const hashError = hp.get('error_description') || hp.get('error');

        if (hashError) {
          setErr(hashError);
          router.replace(`/login?error=${encodeURIComponent(hashError)}`);
          return;
        }

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setErr(error.message);
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            return;
          }

          // Invite or recovery links should always force the user to set a password.
          const forcePwReset = type === 'invite' || type === 'recovery';
          const target = forcePwReset ? '/set-password' : next;

          // Clear hash so we don't leak tokens in history.
          window.history.replaceState(null, '', target);
          router.replace(target);
          return;
        }
      }

      // 2) PKCE / OAuth flow: ?code=...
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErr(error.message);
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        router.replace(next);
        return;
      }

      // 3) OTP token_hash flow: ?token_hash=...&type=...
      const token_hash = params.get('token_hash');
      const type = params.get('type');
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });
        if (error) {
          setErr(error.message);
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        const forcePwReset = type === 'invite' || type === 'recovery';
        router.replace(forcePwReset ? '/set-password' : next);
        return;
      }

      // Nothing to do — probably landed here by mistake.
      const queryError = params.get('error_description') || params.get('error');
      if (queryError) {
        setErr(queryError);
        router.replace(`/login?error=${encodeURIComponent(queryError)}`);
      } else {
        router.replace('/login?error=Missing%20auth%20token');
      }
    })();
  }, [router, params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-white">
      <div className="flex flex-col items-center gap-3 text-sm text-gray-300">
        {err ? (
          <>
            <AlertCircle className="h-5 w-5 text-danger" />
            <span className="text-danger">{err}</span>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Signing you in…</span>
          </>
        )}
      </div>
    </main>
  );
}
