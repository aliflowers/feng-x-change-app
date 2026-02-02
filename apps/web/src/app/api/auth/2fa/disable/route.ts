/**
 * API Endpoint: /api/auth/2fa/disable
 * 
 * POST: Deshabilitar 2FA
 * - code: string (código actual para confirmar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode, verifyBackupCode } from '@/lib/two-factor-auth';
import { decrypt, isEncrypted } from '@/lib/crypto';

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

  if (!code) {
   return NextResponse.json(
    { error: 'Debes proporcionar tu código 2FA actual para desactivarlo' },
    { status: 400 }
   );
  }

  // Obtener configuración actual del usuario
  const { data: profile, error: profileError } = await supabase
   .from('profiles')
   .select('two_factor_method, two_factor_secret, two_factor_verified, two_factor_backup_codes')
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  if (!profile.two_factor_verified || profile.two_factor_method === 'none') {
   return NextResponse.json(
    { error: '2FA no está habilitado' },
    { status: 400 }
   );
  }

  let isValid = false;

  // Primero intentar como código TOTP
  if (profile.two_factor_method === 'totp' && profile.two_factor_secret) {
   // SEGURIDAD: Desencriptar secreto si está cifrado
   let secret = profile.two_factor_secret;
   if (isEncrypted(secret)) {
    secret = await decrypt(secret);
   }
   isValid = verifyTOTPCode(code, secret);
  }

  // Si no es válido, intentar como código de respaldo
  if (!isValid && profile.two_factor_backup_codes) {
   const backupIndex = verifyBackupCode(code, profile.two_factor_backup_codes);
   if (backupIndex >= 0) {
    isValid = true;
   }
  }

  if (!isValid) {
   return NextResponse.json(
    { error: 'Código incorrecto' },
    { status: 400 }
   );
  }

  // Desactivar 2FA
  const { error: updateError } = await supabase
   .from('profiles')
   .update({
    two_factor_method: 'none',
    two_factor_secret: null,
    two_factor_verified: false,
    two_factor_backup_codes: null,
   })
   .eq('id', user.id);

  if (updateError) {
   return NextResponse.json(
    { error: 'Error al desactivar 2FA' },
    { status: 500 }
   );
  }

  // Registrar en audit_logs
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await supabase.from('audit_logs').insert({
   user_id: user.id,
   action: 'DISABLE_2FA',
   resource_type: 'security',
   resource_id: user.id,
   old_value: { method: profile.two_factor_method },
   new_value: { method: 'none' },
   ip_address: clientIP,
  });

  return NextResponse.json({
   success: true,
   message: '2FA desactivado correctamente',
  });

 } catch (error) {
  console.error('[2FA Disable] Unexpected error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
