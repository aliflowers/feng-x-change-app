import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode, verifyBackupCode } from '@/lib/two-factor-auth';
import { decrypt, isEncrypted } from '@/lib/crypto';
import { z } from 'zod';

const changePhoneSchema = z.object({
 newPhone: z.string().min(10, 'El número debe tener al menos 10 dígitos').max(15, 'El número no puede tener más de 15 dígitos'),
 twoFactorCode: z.string().min(6, 'El código debe tener al menos 6 caracteres'),
});

/**
 * POST /api/auth/change-phone
 * Cambia el número de teléfono/WhatsApp del usuario autenticado.
 * Requiere verificación 2FA.
 */
export async function POST(request: NextRequest) {
 try {
  // Cliente para obtener sesión del usuario (usa cookies)
  const supabase = await createClient();

  // Cliente admin para operaciones privilegiadas
  const supabaseAdmin = createAdminClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!
  );

  // 1. Verificar sesión activa
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
   return NextResponse.json(
    { error: 'No autorizado. Inicia sesión nuevamente.' },
    { status: 401 }
   );
  }

  // 2. Obtener perfil y verificar 2FA
  const { data: profile, error: profileError } = await supabaseAdmin
   .from('profiles')
   .select('id, role, whatsapp_number, two_factor_method, two_factor_secret, two_factor_verified, two_factor_backup_codes')
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   return NextResponse.json(
    { error: 'Error al obtener perfil de usuario' },
    { status: 500 }
   );
  }

  // 3. Parsear y validar body
  const body = await request.json();
  const validation = changePhoneSchema.safeParse(body);

  if (!validation.success) {
   return NextResponse.json(
    { error: validation.error.errors[0].message },
    { status: 400 }
   );
  }

  const { newPhone, twoFactorCode } = validation.data;

  // Limpiar el número (solo dígitos)
  const cleanedPhone = newPhone.replace(/\D/g, '');

  if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
   return NextResponse.json(
    { error: 'Número de teléfono inválido' },
    { status: 400 }
   );
  }

  // 4. Verificar que tenga 2FA habilitado
  if (profile.two_factor_method === 'none' || !profile.two_factor_verified) {
   return NextResponse.json(
    { error: 'Debes tener 2FA habilitado para cambiar tu número. Configúralo en la pestaña "Seguridad".' },
    { status: 400 }
   );
  }

  // 5. Verificar código 2FA
  let twoFactorValid = false;

  if (profile.two_factor_method === 'totp' && profile.two_factor_secret) {
   // SEGURIDAD: Desencriptar secreto si está cifrado
   let secret = profile.two_factor_secret;
   if (isEncrypted(secret)) {
    secret = await decrypt(secret);
   }
   twoFactorValid = verifyTOTPCode(twoFactorCode, secret);
  }

  // También verificar códigos de respaldo
  if (!twoFactorValid && profile.two_factor_backup_codes && Array.isArray(profile.two_factor_backup_codes)) {
   const backupIndex = verifyBackupCode(twoFactorCode, profile.two_factor_backup_codes);
   if (backupIndex !== -1) {
    twoFactorValid = true;
    const updatedCodes = [...profile.two_factor_backup_codes];
    updatedCodes.splice(backupIndex, 1);
    await supabaseAdmin
     .from('profiles')
     .update({ two_factor_backup_codes: updatedCodes })
     .eq('id', user.id);
   }
  }

  if (!twoFactorValid) {
   return NextResponse.json(
    { error: 'Código de verificación inválido' },
    { status: 400 }
   );
  }

  // 6. Actualizar teléfono en tabla profiles
  const { error: updateProfileError } = await supabaseAdmin
   .from('profiles')
   .update({
    whatsapp_number: cleanedPhone,
    updated_at: new Date().toISOString()
   })
   .eq('id', user.id);

  if (updateProfileError) {
   console.error('[change-phone] Error updating profile:', updateProfileError);
   return NextResponse.json(
    { error: 'Error al actualizar número de teléfono' },
    { status: 500 }
   );
  }

  // 7. Registrar en audit_logs
  await supabaseAdmin.from('audit_logs').insert({
   action: 'PHONE_CHANGED',
   user_id: user.id,
   resource_type: 'profiles',
   resource_id: user.id,
   old_value: { whatsapp_number: profile.whatsapp_number },
   new_value: { whatsapp_number: cleanedPhone },
   ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  return NextResponse.json({
   success: true,
   message: 'Número de teléfono actualizado correctamente',
   newPhone: cleanedPhone,
  });

 } catch (error) {
  console.error('[change-phone] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
