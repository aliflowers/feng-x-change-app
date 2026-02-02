import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server-cookies';
import { verifyTOTPCode, verifyBackupCode } from '@/lib/two-factor-auth';
import { decrypt, isEncrypted } from '@/lib/crypto';
import { z } from 'zod';

// Validación de fortaleza de contraseña
const passwordRegex = {
  minLength: /.{8,}/,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

const changePasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((val) => passwordRegex.hasUppercase.test(val), 'Debe contener al menos una mayúscula')
    .refine((val) => passwordRegex.hasLowercase.test(val), 'Debe contener al menos una minúscula')
    .refine((val) => passwordRegex.hasNumber.test(val), 'Debe contener al menos un número')
    .refine((val) => passwordRegex.hasSpecial.test(val), 'Debe contener al menos un carácter especial'),
  confirmPassword: z.string().min(1, 'Confirmación requerida'),
  twoFactorCode: z.string().min(6, 'El código debe tener al menos 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const INTERNAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CAJERO', 'SUPERVISOR'];

/**
 * POST /api/auth/change-password
 * Cambia la contraseña del usuario autenticado.
 * Disponible para todos los roles internos.
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

    // 2. Obtener perfil y verificar rol
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, two_factor_method, two_factor_secret, two_factor_verified, two_factor_backup_codes')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Error al obtener perfil de usuario' },
        { status: 500 }
      );
    }

    // 3. Verificar que sea un rol interno
    if (!INTERNAL_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: 'No tienes permiso para cambiar tu contraseña desde este panel.' },
        { status: 403 }
      );
    }

    // 4. Parsear y validar body
    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { newPassword, twoFactorCode } = validation.data;

    // 5. Verificar que tenga 2FA habilitado
    if (profile.two_factor_method === 'none' || !profile.two_factor_verified) {
      return NextResponse.json(
        { error: 'Debes tener 2FA habilitado para cambiar tu contraseña. Configúralo en la pestaña "Seguridad".' },
        { status: 400 }
      );
    }

    // 6. Verificar código 2FA
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

    // 7. Actualizar contraseña en Supabase Auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateAuthError) {
      console.error('[change-password] Error updating auth:', updateAuthError);
      return NextResponse.json(
        { error: 'Error al actualizar contraseña' },
        { status: 500 }
      );
    }

    // 8. Registrar en audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      action: 'PASSWORD_CHANGED',
      user_id: user.id,
      resource_type: 'profiles',
      resource_id: user.id,
      old_value: null,
      new_value: { changed_at: new Date().toISOString() },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });

  } catch (error) {
    console.error('[change-password] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
