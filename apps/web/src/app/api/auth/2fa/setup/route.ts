/**
 * API Endpoint: /api/auth/2fa/setup
 * 
 * POST: Iniciar configuración de 2FA
 * - method: 'email' | 'totp'
 * 
 * Retorna:
 * - Para TOTP: secret, qrCodeUri, qrCodeImage
 * - Para email: confirmación de código enviado
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import {
 generateTOTPSecret,
 generateTOTPUri,
 generateQRCode,
 generateEmailCode,
 generateBackupCodes,
 hashBackupCodes,
 formatBackupCodes,
 type TwoFactorMethod,
} from '@/lib/two-factor-auth';
import { encrypt } from '@/lib/crypto';

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

  // Obtener método de la request
  const body = await request.json();
  const method = body.method as TwoFactorMethod;

  if (!method || !['email', 'totp'].includes(method)) {
   return NextResponse.json(
    { error: 'Método inválido. Usa "email" o "totp"' },
    { status: 400 }
   );
  }

  // Verificar que el usuario no tenga 2FA ya configurado
  const { data: profile, error: profileError } = await supabase
   .from('profiles')
   .select('two_factor_method, two_factor_verified, email')
   .eq('id', user.id)
   .single();

  if (profileError) {
   console.error('[2FA Setup] Error fetching profile:', profileError);
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  if (profile?.two_factor_verified) {
   return NextResponse.json(
    { error: 'Ya tienes 2FA configurado. Desactívalo primero para cambiar el método.' },
    { status: 400 }
   );
  }

  // Generar códigos de respaldo
  const backupCodes = generateBackupCodes(8);
  const hashedBackupCodes = hashBackupCodes(backupCodes);

  if (method === 'totp') {
   // Generar secret TOTP
   const secret = generateTOTPSecret();
   const uri = generateTOTPUri(profile?.email || user.email || '', secret);
   const qrCodeImage = await generateQRCode(uri);

   // SEGURIDAD: Cifrar el secreto con AES-256-GCM antes de guardar en BD
   const encryptedSecret = await encrypt(secret);

   // Guardar secret cifrado (sin verificar aún)
   const { error: updateError } = await supabase
    .from('profiles')
    .update({
     two_factor_method: 'totp',
     two_factor_secret: encryptedSecret,
     two_factor_verified: false,
     two_factor_backup_codes: hashedBackupCodes,
    })
    .eq('id', user.id);

   if (updateError) {
    console.error('[2FA Setup] Error saving TOTP secret:', updateError);
    return NextResponse.json(
     { error: 'Error al guardar configuración' },
     { status: 500 }
    );
   }

   return NextResponse.json({
    success: true,
    method: 'totp',
    secret,
    qrCodeUri: uri,
    qrCodeImage,
    backupCodes: formatBackupCodes(backupCodes),
    message: 'Escanea el código QR con Google Authenticator y luego verifica con un código.',
   });

  } else {
   // Método email - generar código y enviarlo
   const code = generateEmailCode();

   // Guardar código temporalmente en la BD
   const { error: updateError } = await supabase
    .from('profiles')
    .update({
     two_factor_method: 'email',
     two_factor_secret: code, // Código temporal de email (no necesita cifrado)
     two_factor_verified: false,
     two_factor_backup_codes: hashedBackupCodes,
    })
    .eq('id', user.id);

   if (updateError) {
    console.error('[2FA Setup] Error saving email code:', updateError);
    return NextResponse.json(
     { error: 'Error al guardar configuración' },
     { status: 500 }
    );
   }

   // TODO: Enviar email con el código
   // Por ahora, en desarrollo retornamos el código para testing
   const isDev = process.env.NODE_ENV === 'development';

   return NextResponse.json({
    success: true,
    method: 'email',
    backupCodes: formatBackupCodes(backupCodes),
    message: 'Se ha enviado un código de verificación a tu email.',
    ...(isDev && { devCode: code }), // Solo en desarrollo
   });
  }

 } catch (error) {
  console.error('[2FA Setup] Unexpected error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
