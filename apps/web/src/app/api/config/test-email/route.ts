import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { decrypt, isEncrypted } from '@/lib/crypto';
import * as nodemailer from 'nodemailer';

// Interfaz para la configuración almacenada en JSONB
interface EmailStoredConfig {
 smtp_host?: string;
 smtp_port?: number;
 smtp_user?: string;
 smtp_password_encrypted?: string;
 from_email?: string;
 from_name?: string;
}

// Verificar que el usuario es SUPER_ADMIN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifySuperAdmin(supabase: any) {
 const { data: { user }, error: authError } = await supabase.auth.getUser();

 if (authError || !user) {
  return { authorized: false, error: 'No autenticado' };
 }

 const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

 if (profileError || !profile || profile.role !== 'SUPER_ADMIN') {
  return { authorized: false, error: 'Acceso denegado. Solo SUPER_ADMIN.' };
 }

 return { authorized: true, error: null };
}

// POST: Probar conexión SMTP
export async function POST() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener configuración de Email (estructura correcta: provider + config JSONB)
  const { data: emailData, error: fetchError } = await supabase
   .from('notification_config')
   .select('config, is_enabled')
   .eq('provider', 'email')
   .single();

  if (fetchError) {
   return NextResponse.json(
    { success: false, error: 'Error al obtener configuración' },
    { status: 500 }
   );
  }

  const emailConfig = (emailData?.config || {}) as EmailStoredConfig;

  const host = emailConfig.smtp_host;
  const port = emailConfig.smtp_port || 587;
  const user = emailConfig.smtp_user;
  const encryptedPassword = emailConfig.smtp_password_encrypted;
  const fromEmail = emailConfig.from_email;
  const fromName = emailConfig.from_name;

  if (!host) {
   return NextResponse.json({
    success: false,
    error: 'Host SMTP no configurado'
   }, { status: 400 });
  }

  if (!user) {
   return NextResponse.json({
    success: false,
    error: 'Usuario SMTP no configurado'
   }, { status: 400 });
  }

  if (!encryptedPassword) {
   return NextResponse.json({
    success: false,
    error: 'Contraseña SMTP no configurada'
   }, { status: 400 });
  }

  // Descifrar contraseña (SOLO en servidor, NUNCA se envía al frontend)
  let password = '';
  try {
   if (isEncrypted(encryptedPassword)) {
    password = await decrypt(encryptedPassword);
   } else {
    password = encryptedPassword;
   }
  } catch {
   return NextResponse.json({
    success: false,
    error: 'Error al descifrar la contraseña'
   }, { status: 500 });
  }

  // Crear transporter de nodemailer
  const transporter = nodemailer.createTransport({
   host: host,
   port: port,
   secure: port === 465, // true para 465, false para otros puertos
   auth: {
    user: user,
    pass: password
   },
   connectionTimeout: 10000, // 10 segundos
   greetingTimeout: 5000
  });

  // Verificar conexión
  try {
   await transporter.verify();

   // Limpiar password de memoria inmediatamente después de usar
   password = '';

   return NextResponse.json({
    success: true,
    message: 'Conexión SMTP exitosa',
    details: {
     host: host,
     port: port,
     user: user,
     from: fromEmail ? `${fromName} <${fromEmail}>` : user
    }
   });
  } catch (smtpError) {
   // Limpiar password de memoria
   password = '';

   // No loguear la contraseña, solo el error genérico
   console.error('SMTP connection test failed');
   const errorMessage = smtpError instanceof Error ? smtpError.message : 'Error desconocido';

   return NextResponse.json({
    success: false,
    error: 'Error de conexión SMTP',
    details: errorMessage
   }, { status: 503 });
  }

 } catch (error) {
  console.error('Error en POST /api/config/test-email:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
