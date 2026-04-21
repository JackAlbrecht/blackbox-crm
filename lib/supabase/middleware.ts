import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/check-email', '/denied', '/auth-callback'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Logged-in user: verify still on allowlist (tenant access).
  // Super admins are allowed through even without a tenant — they land on /admin.
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, active, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/denied';
      return NextResponse.redirect(url);
    }

    // Super admins: always allowed. Send them to /admin if they have no tenant.
    if (profile.is_super_admin) {
      if (!profile.tenant_id && path !== '/admin' && !path.startsWith('/admin/')) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    } else if (!profile.active || !profile.tenant_id) {
      const url = request.nextUrl.clone();
      url.pathname = '/denied';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
