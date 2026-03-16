
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /auth/callback
 * 
 * Este endpoint maneja el retorno del flujo de autenticación (PKCE)
 * desde los enlaces de email de Supabase.
 * 
 * 1. Recibe un código de intercambio `code`.
 * 2. Intercambia el código por una sesión activa.
 * 3. Redirige al usuario a la página de destino (login o dashboard).
 */
export async function GET(request: NextRequest) {
 const requestUrl = new URL(request.url);
 const code = requestUrl.searchParams.get('code');
 // Si no hay "next", por defecto enviamos al login con mensaje de éxito
 const next = requestUrl.searchParams.get('next') ?? '/login?verified=true';

 // DEBUG: Registrar la URL completa que llega al callback para diagnosticar problemas
 console.log('[Auth Callback] Full URL:', request.url);
 console.log('[Auth Callback] code:', code ? 'present' : 'MISSING');
 console.log('[Auth Callback] next:', next);

 // En Railway / Vercel el request.url a veces usa "localhost" por el proxy interno.
 // Usamos la variable de entorno NEXT_PUBLIC_SITE_URL configurada localmente / en Railway.
 // Si no existe, hace un fallback al origin de la petición.
 let safeOrigin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
 
 // Fallback extremo por si la variable de entorno no está configurada y detecta localhost internamente en prod
 if (safeOrigin.includes('localhost') && process.env.NODE_ENV === 'production') {
  safeOrigin = 'https://feng-x-change-app-ambiente-de-prueba.up.railway.app';
 }

 if (code) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    cookies: {
     get(name: string) {
      return cookieStore.get(name)?.value;
     },
     set(name: string, value: string, options: any) {
      cookieStore.set({ name, value, ...options });
     },
     remove(name: string, options: any) {
      cookieStore.set({ name, value: '', ...options });
     },
    },
   }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
   // Si el intercambio es exitoso, redirigir a la página deseada
   // Usamos safeOrigin para redirigir siempre al dominio seguro y correcto
   const safeNext = next.startsWith('/') ? next : `/${next}`;
   console.log('[Auth Callback] SUCCESS - Redirecting to:', `${safeOrigin}${safeNext}`);
   return NextResponse.redirect(`${safeOrigin}${safeNext}`);
  } else {
   console.error('[Auth Callback] exchangeCodeForSession FAILED:', error.message, error);
   
   // Si el destino era reset-password y falló, enviar al forgot-password con error específico
   if (next.includes('reset-password')) {
    const errorMsg = encodeURIComponent('El enlace de restablecimiento ha expirado o ya fue utilizado. Por favor, solicita uno nuevo.');
    return NextResponse.redirect(`${safeOrigin}/forgot-password?error=${errorMsg}`);
   }
  }
 } else {
  console.error('[Auth Callback] No code parameter found in URL');
 }

 // Si no hay código o falla el intercambio, redirigir a login con error
 const errorMsg = encodeURIComponent('El enlace de autenticación es inválido o ha expirado.');
 return NextResponse.redirect(`${safeOrigin}/login?error=${errorMsg}`);
}
