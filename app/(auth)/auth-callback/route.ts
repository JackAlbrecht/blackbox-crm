import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the return trip from a Supabase magic-link email.
// Supports both flows:
//  - PKCE: ?code=...             → exchangeCodeForSession
//  - Implicit / OTP: ?token_hash=...&type=... → verifyOtp
// If anything goes wrong, send the user to /login?error=... instead of
// silently redirecting (which created a loop).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/';

  const supabase = createClient();

  const toLogin = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return toLogin(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    if (error) return toLogin(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return toLogin('Missing auth token');
}
