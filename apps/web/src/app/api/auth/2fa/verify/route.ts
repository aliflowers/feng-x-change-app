/**
 * API Endpoint: /api/auth/2fa/verify
 * 
 * POST: Verificar código 2FA durante configuración inicial
 * - code: string (6 dígitos)
 * 
 * Marca two_factor_verified = true si el código es correcto
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode } from '@/lib/two-factor-auth';

export async function POST(request: NextRequest) {
 try {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
   );
  }

  // Obtener código de la request
  const body = await request.json();
  const code = body.code?.toString().trim();

  if (!code || code.length !== 6) {
   return NextResponse.json(
    { error: 'Código inválido. Debe ser de 6 dígitos.' },
    { status: 400 }
   );
  }

  // Obtener configuración actual del usuario
  const { data: profile, error: profileError } = await supabase
   .from('profiles')
   .select('two_factor_method, two_factor_secret, two_factor_verified')
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   console.error('[2FA Verify] Error fetching profile:', profileError);
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  if (profile.two_factor_verified) {
   return NextResponse.json(
    { error: '2FA ya está verificado' },
    { status: 400 }
   );
  }

  if (!profile.two_factor_secret || profile.two_factor_method === 'none') {
   return NextResponse.json(
    { error: 'Primero debes iniciar la configuración de 2FA' },
    { status: 400 }
   );
  }

  let isValid = false;

  if (profile.two_factor_method === 'totp') {
   // Verificar código TOTP
   isValid = verifyTOTPCode(code, profile.two_factor_secret);
  } else if (profile.two_factor_method === 'email') {
   // Verificar código email (guardado en two_factor_secret)
   isValid = code === profile.two_factor_secret;
  }

  // Registrar intento
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await supabase.from('two_factor_attempts').insert({
   user_id: user.id,
   code: code.substring(0, 3) + '***', // No guardar código completo
   method: profile.two_factor_method,
   ip_address: clientIP,
   success: isValid,
  });

  if (!isValid) {
   return NextResponse.json(
    { error: 'Código incorrecto. Inténtalo de nuevo.' },
    { status: 400 }
   );
  }

  // Marcar 2FA como verificado
  const { error: updateError } = await supabase
   .from('profiles')
   .update({
    two_factor_verified: true,
    // Si es email, limpiar el código usado
    ...(profile.two_factor_method === 'email' && { two_factor_secret: null }),
   })
   .eq('id', user.id);

  if (updateError) {
   console.error('[2FA Verify] Error updating profile:', updateError);
   return NextResponse.json(
    { error: 'Error al guardar verificación' },
    { status: 500 }
   );
  }

  // Registrar en audit_logs
  await supabase.from('audit_logs').insert({
   user_id: user.id,
   action: 'ENABLE_2FA',
   resource_type: 'security',
   resource_id: user.id,
   new_value: { method: profile.two_factor_method },
   ip_address: clientIP,
  });

  return NextResponse.json({
   success: true,
   message: '¡2FA configurado correctamente! Tu cuenta ahora está más segura.',
  });

 } catch (error) {
  console.error('[2FA Verify] Unexpected error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
