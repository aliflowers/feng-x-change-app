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
  const protectedPaths = ['/app', '/panel'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Rutas de auth (login, register) - son para clientes públicos
  // No redirigimos usuarios logueados, las páginas manejan su propia lógica

  // Si no hay sesión y trata de acceder a ruta protegida
  if (!session && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Verificar acceso a rutas por rol
  if (session && isProtectedPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      // Client/Affiliate no puede acceder a /panel
      if ((profile.role === 'CLIENT' || profile.role === 'AFFILIATE') && pathname.startsWith('/panel')) {
        return NextResponse.redirect(new URL('/app', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/app/:path*',
    '/panel/:path*',
    '/login',
    '/register',
  ],
};
