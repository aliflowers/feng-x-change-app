import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createVerificationSession } from '@/lib/didit/client';

/**
 * POST /api/kyc/start
 * 
 * Inicia una sesión de verificación KYC con Didit.
 * El usuario debe estar autenticado.
 */
export async function POST(request: NextRequest) {
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

  // Verificar que es un cliente (no admin/operator)
  const { data: profile } = await supabase
   .from('profiles')
   .select('role, is_kyc_verified')
   .eq('id', user.id)
   .single();

  if (!profile) {
   return NextResponse.json(
    { error: 'Perfil no encontrado' },
    { status: 404 }
   );
  }

  // Solo clientes necesitan KYC
  if (!['CLIENT', 'AFFILIATE'].includes(profile.role)) {
   return NextResponse.json(
    { error: 'Este rol no requiere verificación KYC' },
    { status: 400 }
   );
  }

  // Si ya está verificado, no crear nueva sesión
  if (profile.is_kyc_verified) {
   return NextResponse.json(
    { message: 'Ya estás verificado', verified: true },
    { status: 200 }
   );
  }

  // Verificar si hay una sesión pendiente
  const { data: existingSession } = await supabase
   .from('kyc_verifications')
   .select('session_id, status')
   .eq('user_id', user.id)
   .in('status', ['pending', 'in_progress'])
   .order('created_at', { ascending: false })
   .limit(1)
   .single();

  // Si hay sesión pendiente, obtener la URL de Didit
  if (existingSession) {
   // Por simplicidad, creamos una nueva sesión si hay una pendiente
   // En producción podrías querer retornar la URL existente
  }

  // Construir URL de callback de forma segura
  let origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Salvavidas para evitar localhost en Railway
  if (process.env.NODE_ENV === 'production' && origin.includes('localhost')) {
   origin = 'https://feng-x-change-app-ambiente-de-prueba.up.railway.app';
  }
  
  const callbackUrl = `${origin}/app/verificar-identidad/callback`;

  // Crear sesión en Didit
  const session = await createVerificationSession({
   userId: user.id,
   callbackUrl,
   vendorData: {
    email: user.email || '',
   },
  });

  // Guardar en la base de datos usando service_role
  const supabaseAdmin = createServerClient(
   process.env.SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!,
   {
    cookies: {
     getAll() { return []; },
     setAll() { },
    },
   }
  );

  await supabaseAdmin
   .from('kyc_verifications')
   .insert({
    user_id: user.id,
    session_id: session.session_id,
    status: 'pending',
   });

  return NextResponse.json({
   session_id: session.session_id,
   verification_url: session.verification_url,
  });

 } catch (error) {
  console.error('[KYC Start] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
