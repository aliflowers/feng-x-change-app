import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/kyc/status
 * 
 * Obtiene el estado de verificación KYC del usuario actual.
 */
export async function GET() {
 try {
  // Crear cliente Supabase con cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    cookies: {
     getAll() {
      return cookieStore.getAll();
     },
     setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
       cookieStore.set(name, value, options);
      });
     },
    },
   }
  );

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
   );
  }

  // Obtener estado del perfil
  const { data: profile } = await supabase
   .from('profiles')
   .select('is_kyc_verified, role')
   .eq('id', user.id)
   .single();

  if (!profile) {
   return NextResponse.json(
    { error: 'Perfil no encontrado' },
    { status: 404 }
   );
  }

  // Si no es cliente, no requiere KYC
  if (!['CLIENT', 'AFFILIATE'].includes(profile.role)) {
   return NextResponse.json({
    requires_kyc: false,
    is_verified: true,
    role: profile.role,
   });
  }

  // Obtener última verificación
  const { data: lastVerification } = await supabase
   .from('kyc_verifications')
   .select('session_id, status, created_at, completed_at')
   .eq('user_id', user.id)
   .order('created_at', { ascending: false })
   .limit(1)
   .single();

  return NextResponse.json({
   requires_kyc: true,
   is_verified: profile.is_kyc_verified,
   last_verification: lastVerification ? {
    session_id: lastVerification.session_id,
    status: lastVerification.status,
    created_at: lastVerification.created_at,
    completed_at: lastVerification.completed_at,
   } : null,
  });

 } catch (error) {
  console.error('[KYC Status] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
