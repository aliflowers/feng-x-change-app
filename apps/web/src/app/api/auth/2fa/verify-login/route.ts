import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTOTPCode } from '@/lib/two-factor-auth';
import { decrypt, isEncrypted } from '@/lib/crypto';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface PreLoginTokenPayload {
  userId: string;
  email: string;
  encryptedPassword: string;
  iv: string;
  type: 'pre_login_2fa';
  iat: number;
  exp: number;
}

// Función de desencriptación AES-256-GCM para password del token
function decryptPassword(encryptedData: string, iv: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const ivBuffer = Buffer.from(iv, 'hex');

  const [encrypted, authTag] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * POST /api/auth/2fa/verify-login
 * Verifica el código 2FA, desencripta credenciales y crea sesión.
 * Requiere un token temporal generado por /api/auth/pre-login
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const ENCRYPTION_SECRET = process.env.CONFIG_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY!;

    const body = await request.json();
    const { code, preLoginToken } = body;

    if (!preLoginToken) {
      return NextResponse.json(
        { error: 'Token de pre-autenticación requerido' },
        { status: 400 }
      );
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Código inválido. Debe tener 6 dígitos.' },
        { status: 400 }
      );
    }

    // Verificar y decodificar el token temporal
    let tokenPayload: PreLoginTokenPayload;
    try {
      tokenPayload = jwt.verify(preLoginToken, ENCRYPTION_SECRET) as PreLoginTokenPayload;
    } catch (jwtError) {
      if ((jwtError as Error).name === 'TokenExpiredError') {
        return NextResponse.json(
          { error: 'Token expirado. Por favor, inicia sesión de nuevo.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    if (tokenPayload.type !== 'pre_login_2fa') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obtener perfil con datos 2FA
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, two_factor_method, two_factor_secret, two_factor_verified, two_factor_backup_codes')
      .eq('id', tokenPayload.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!profile.two_factor_verified) {
      return NextResponse.json(
        { error: '2FA no está configurado para este usuario' },
        { status: 400 }
      );
    }

    // Verificar código 2FA
    let isValid = false;

    if (profile.two_factor_method === 'totp') {
      // SEGURIDAD: Desencriptar secreto si está cifrado
      let secret = profile.two_factor_secret;
      if (isEncrypted(secret)) {
        secret = await decrypt(secret);
      }
      isValid = verifyTOTPCode(code, secret);
    } else if (profile.two_factor_method === 'email') {
      isValid = code === profile.two_factor_secret;
    }

    // Si no es válido, verificar si es un código de respaldo
    if (!isValid && profile.two_factor_backup_codes) {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const backupCodes = profile.two_factor_backup_codes as string[];

      const backupIndex = backupCodes.findIndex((c: string) => c === hashedCode);
      if (backupIndex !== -1) {
        isValid = true;
        const newBackupCodes = [...backupCodes];
        newBackupCodes.splice(backupIndex, 1);

        await supabaseAdmin
          .from('profiles')
          .update({ two_factor_backup_codes: newBackupCodes })
          .eq('id', profile.id);
      }
    }

    if (!isValid) {
      await supabaseAdmin.from('two_factor_attempts').insert({
        user_id: profile.id,
        success: false,
      });

      return NextResponse.json(
        { error: 'Código incorrecto' },
        { status: 400 }
      );
    }

    // Registrar intento exitoso
    await supabaseAdmin.from('two_factor_attempts').insert({
      user_id: profile.id,
      success: true,
    });

    // Código válido - Desencriptar password
    let password: string;
    try {
      password = decryptPassword(
        tokenPayload.encryptedPassword,
        tokenPayload.iv,
        ENCRYPTION_SECRET
      );
    } catch (decryptError) {
      console.error('[2FA Verify Login] Error desencriptando:', decryptError);
      return NextResponse.json(
        { error: 'Error de seguridad. Inicia sesión de nuevo.' },
        { status: 500 }
      );
    }

    // Crear sesión real con las credenciales desencriptadas
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: tokenPayload.email,
      password: password,
    });

    if (sessionError || !sessionData.session) {
      console.error('[2FA Verify Login] Error creando sesión:', sessionError);
      return NextResponse.json(
        { error: 'Error al crear sesión' },
        { status: 500 }
      );
    }

    // Devolver tokens de sesión al cliente
    return NextResponse.json({
      success: true,
      message: 'Verificación 2FA exitosa',
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      }
    });

  } catch (error) {
    console.error('[2FA Verify Login] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
