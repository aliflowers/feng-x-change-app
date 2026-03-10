/**
 * API Endpoint: /api/auth/2fa/verify-action
 * 
 * POST: Verificar código 2FA para acciones que requieren seguridad extra
 * - code: string (6 dígitos)
 * 
 * Devuelve true o false dependiendo si el código es válido para la sesión actual
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode } from '@/lib/two-factor-auth';
import { decrypt, isEncrypted } from '@/lib/crypto';
import crypto from 'crypto';

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
   .select('two_factor_method, two_factor_secret, two_factor_verified, two_factor_backup_codes')
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  if (!profile.two_factor_verified || profile.two_factor_method === 'none' || !profile.two_factor_secret) {
   return NextResponse.json(
    { error: '2FA no está configurado para este usuario' },
    { status: 400 }
   );
  }

  let isValid = false;
  let usedBackupCodeIndex = -1;

  if (profile.two_factor_method === 'totp') {
   // SEGURIDAD: Desencriptar secreto antes de verificar
   let secret = profile.two_factor_secret;
   if (isEncrypted(secret)) {
    secret = await decrypt(secret);
   }
   isValid = verifyTOTPCode(code, secret);
  } else if (profile.two_factor_method === 'email') {
   isValid = code === profile.two_factor_secret;
  }

  // Si no es válido, probar con los códigos de respaldo
  if (!isValid && profile.two_factor_backup_codes) {
   const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
   const backupCodes = profile.two_factor_backup_codes as string[];
   usedBackupCodeIndex = backupCodes.findIndex((c: string) => c === hashedCode);
   if (usedBackupCodeIndex !== -1) {
    isValid = true;
   }
  }

  // Registrar intento
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await supabase.from('two_factor_attempts').insert({
   user_id: user.id,
   code: code.substring(0, 3) + '***',
   method: profile.two_factor_method,
   ip_address: clientIP,
   success: isValid,
  });

  if (!isValid) {
   return NextResponse.json(
    { error: 'Código inválido. Intenta de nuevo.' },
    { status: 400 }
   );
  }

  // Si se usó código email o backup, debemos actualizar la BD para consumirlo
  if (usedBackupCodeIndex !== -1) {
   const backupCodes = profile.two_factor_backup_codes as string[];
   const newBackupCodes = [...backupCodes];
   newBackupCodes.splice(usedBackupCodeIndex, 1);
   await supabase.from('profiles').update({ two_factor_backup_codes: newBackupCodes }).eq('id', user.id);
  } else if (profile.two_factor_method === 'email') {
   await supabase.from('profiles').update({ two_factor_secret: null }).eq('id', user.id);
  }

  return NextResponse.json({
   valid: true,
   message: 'Código verificado exitosamente',
  });

 } catch (error) {
  console.error('[2FA Verify Action] Unexpected error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
