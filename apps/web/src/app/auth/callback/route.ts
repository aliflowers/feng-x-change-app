
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
 const { searchParams, origin } = new URL(request.url);
 const code = searchParams.get('code');
 // Si no hay "next", por defecto enviamos al login con mensaje de éxito
 const next = searchParams.get('next') ?? '/login?verified=true';

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
   // Usamos el origin del request para asegurar la ruta absoluta correcta
   return NextResponse.redirect(`${origin}${next}`);
  } else {
   console.error('Auth Callback Error:', error);
  }
 }

 // Si no hay código o falla el intercambio, redirigir a login con error
 return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
