import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// Funciones de encriptación AES-256-GCM
function encryptPassword(password: string, secret: string): { encrypted: string; iv: string } {
 const key = crypto.createHash('sha256').update(secret).digest();
 const iv = crypto.randomBytes(16);
 const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

 let encrypted = cipher.update(password, 'utf8', 'hex');
 encrypted += cipher.final('hex');
 const authTag = cipher.getAuthTag().toString('hex');

 return {
  encrypted: encrypted + ':' + authTag,
  iv: iv.toString('hex')
 };
}

/**
 * POST /api/auth/pre-login
 * Valida credenciales sin crear sesión.
 * Si el usuario tiene 2FA, devuelve un token temporal con credenciales encriptadas.
 * Si no tiene 2FA, devuelve indicación de crear sesión directa.
 */
export async function POST(request: NextRequest) {
 try {
  const supabaseAdmin = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!
  );

  const ENCRYPTION_SECRET = process.env.CONFIG_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY!;

  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
   return NextResponse.json(
    { error: 'Email y contraseña son requeridos' },
    { status: 400 }
   );
  }

  // Intentar autenticar con Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
   email,
   password,
  });

  if (authError || !authData.user) {
   return NextResponse.json(
    { error: 'Credenciales inválidas' },
    { status: 401 }
   );
  }

  // Inmediatamente cerrar la sesión del admin client
  await supabaseAdmin.auth.signOut();

  // Obtener perfil para verificar rol y 2FA
  const { data: profile, error: profileError } = await supabaseAdmin
   .from('profiles')
   .select('id, role, two_factor_method, two_factor_verified')
   .eq('id', authData.user.id)
   .single();

  if (profileError || !profile) {
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  // Verificar que sea un rol interno
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CAJERO', 'SUPERVISOR', 'OPERATOR'];
  if (!allowedRoles.includes(profile.role)) {
   return NextResponse.json(
    { error: 'Acceso denegado. Esta área es solo para personal autorizado.' },
    { status: 403 }
   );
  }

  // Verificar si tiene 2FA activo
  const has2FA = profile.two_factor_verified &&
   profile.two_factor_method &&
   profile.two_factor_method !== 'none';

  if (!has2FA) {
   return NextResponse.json({
    requires2FA: false,
    message: 'Credenciales válidas. Proceder con login directo.'
   });
  }

  // Con 2FA - encriptar password y generar token temporal
  const { encrypted: encryptedPassword, iv } = encryptPassword(password, ENCRYPTION_SECRET);

  const tokenPayload: Omit<PreLoginTokenPayload, 'iat' | 'exp'> = {
   userId: profile.id,
   email: email,
   encryptedPassword: encryptedPassword,
   iv: iv,
   type: 'pre_login_2fa',
  };

  // Token válido por 5 minutos
  const preLoginToken = jwt.sign(tokenPayload, ENCRYPTION_SECRET, {
   expiresIn: '5m',
  });

  return NextResponse.json({
   requires2FA: true,
   twoFactorMethod: profile.two_factor_method,
   preLoginToken: preLoginToken,
   message: 'Se requiere verificación 2FA'
  });

 } catch (error) {
  console.error('[Pre-Login] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
