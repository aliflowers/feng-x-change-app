import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode } from '@/lib/two-factor-auth';

/**
 * POST /api/auth/2fa/verify-login
 * Verifica el código 2FA durante el proceso de login
 */
export async function POST(request: NextRequest) {
 try {
  const supabase = await createClient();

  // Obtener usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json(
    { error: 'No autenticado' },
    { status: 401 }
   );
  }

  const body = await request.json();
  const { code } = body;

  if (!code || code.length !== 6) {
   return NextResponse.json(
    { error: 'Código inválido. Debe tener 6 dígitos.' },
    { status: 400 }
   );
  }

  // Obtener perfil con datos 2FA
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

  if (!profile.two_factor_verified) {
   return NextResponse.json(
    { error: '2FA no está configurado para este usuario' },
    { status: 400 }
   );
  }

  let isValid = false;

  if (profile.two_factor_method === 'totp') {
   // Verificar código TOTP
   isValid = verifyTOTPCode(code, profile.two_factor_secret);
  } else if (profile.two_factor_method === 'email') {
   // Para email, el código está en el secret temporalmente
   isValid = code === profile.two_factor_secret;
  }

  // Si no es válido, verificar si es un código de respaldo
  if (!isValid && profile.two_factor_backup_codes) {
   const crypto = await import('crypto');
   const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
   const backupCodes = profile.two_factor_backup_codes as string[];

   const backupIndex = backupCodes.findIndex((c: string) => c === hashedCode);
   if (backupIndex !== -1) {
    isValid = true;
    // Remover el código de respaldo usado
    const newBackupCodes = [...backupCodes];
    newBackupCodes.splice(backupIndex, 1);

    await supabase
     .from('profiles')
     .update({ two_factor_backup_codes: newBackupCodes })
     .eq('id', user.id);
   }
  }

  if (!isValid) {
   // Registrar intento fallido
   await supabase.from('two_factor_attempts').insert({
    user_id: user.id,
    success: false,
   });

   return NextResponse.json(
    { error: 'Código incorrecto' },
    { status: 400 }
   );
  }

  // Registrar intento exitoso
  await supabase.from('two_factor_attempts').insert({
   user_id: user.id,
   success: true,
  });

  return NextResponse.json({
   success: true,
   message: 'Verificación 2FA exitosa'
  });

 } catch (error) {
  console.error('[2FA Verify Login] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
