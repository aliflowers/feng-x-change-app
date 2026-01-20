import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Rutas protegidas
  const protectedPaths = ['/app', '/panel', '/admin'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Rutas de auth (login, register)
  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Si no hay sesión y trata de acceder a ruta protegida
  if (!session && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Si hay sesión y trata de acceder a login/register
  if (session && isAuthPath) {
    // Obtener rol del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      switch (profile.role) {
        case 'SUPER_ADMIN':
          return NextResponse.redirect(new URL('/admin', request.url));
        case 'ADMIN':
        case 'CAJERO':
          return NextResponse.redirect(new URL('/panel', request.url));
        default:
          return NextResponse.redirect(new URL('/app', request.url));
      }
    }
  }

  // Verificar acceso a rutas por rol
  if (session && isProtectedPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      // Cliente no puede acceder a /panel o /admin
      if (profile.role === 'CLIENT' && (pathname.startsWith('/panel') || pathname.startsWith('/admin'))) {
        return NextResponse.redirect(new URL('/app', request.url));
      }

      // Cajero/Admin no pueden acceder a /admin
      if ((profile.role === 'CAJERO' || profile.role === 'ADMIN') && pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/panel', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/app/:path*',
    '/panel/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
