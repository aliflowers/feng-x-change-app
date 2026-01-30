import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { z } from 'zod';
import { encrypt, decrypt, maskSecret, isEncrypted } from '@/lib/crypto';

// Schema de validación para configuración de notificaciones
// Acepta nombres simples del frontend y los mapea a la estructura de BD
const notificationsSchema = z.object({
 whatsapp: z.object({
  api_url: z.string().url().optional().or(z.literal('')),
  phone_number_id: z.string().max(50).optional(),
  business_account_id: z.string().max(50).optional(),
  access_token: z.string().optional(), // Se cifra si presente
  enabled: z.boolean().optional()
 }).optional(),
 email: z.object({
  host: z.string().max(100).optional(),  // se mapea a smtp_host
  port: z.number().int().min(1).max(65535).optional(),  // se mapea a smtp_port
  user: z.string().max(100).optional(),  // se mapea a smtp_user
  password: z.string().optional(),  // se mapea a smtp_password_encrypted
  from_email: z.string().email().optional().or(z.literal('')),
  from_name: z.string().max(100).optional(),
  enabled: z.boolean().optional()
 }).optional()
});

// Verificar que el usuario es SUPER_ADMIN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifySuperAdmin(supabase: any) {
 const { data: { user }, error: authError } = await supabase.auth.getUser();

 if (authError || !user) {
  return { authorized: false, error: 'No autenticado', userId: null };
 }

 const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

 if (profileError || !profile || profile.role !== 'SUPER_ADMIN') {
  return { authorized: false, error: 'Acceso denegado. Solo SUPER_ADMIN.', userId: user.id };
 }

 return { authorized: true, error: null, userId: user.id };
}

// Interfaz para la configuración almacenada en JSONB (según estructura real en BD)
interface WhatsAppStoredConfig {
 api_url?: string;
 phone_number_id?: string;
 business_account_id?: string;
 access_token_encrypted?: string;
}

interface EmailStoredConfig {
 smtp_host?: string;
 smtp_port?: number;
 smtp_user?: string;
 smtp_password_encrypted?: string;
 from_email?: string;
 from_name?: string;
}

// GET: Obtener configuración de notificaciones (tokens enmascarados)
export async function GET() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener configuración de WhatsApp
  const { data: waData } = await supabase
   .from('notification_config')
   .select('config, is_enabled')
   .eq('provider', 'whatsapp')
   .single();

  // Obtener configuración de Email
  const { data: emailData } = await supabase
   .from('notification_config')
   .select('config, is_enabled')
   .eq('provider', 'email')
   .single();

  // Procesar WhatsApp config
  const waConfig = (waData?.config || {}) as WhatsAppStoredConfig;
  let accessTokenMasked = '';
  let hasToken = false;

  try {
   if (waConfig.access_token_encrypted && isEncrypted(waConfig.access_token_encrypted)) {
    const decrypted = await decrypt(waConfig.access_token_encrypted);
    accessTokenMasked = maskSecret(decrypted);
    hasToken = true;
   } else if (waConfig.access_token_encrypted && waConfig.access_token_encrypted.length > 0) {
    // Token guardado sin cifrar (legacy)
    accessTokenMasked = maskSecret(waConfig.access_token_encrypted);
    hasToken = true;
   }
  } catch {
   accessTokenMasked = '';
  }

  // Procesar Email config
  const emailConfig = (emailData?.config || {}) as EmailStoredConfig;
  let passwordMasked = '';
  let hasPassword = false;

  try {
   if (emailConfig.smtp_password_encrypted && isEncrypted(emailConfig.smtp_password_encrypted)) {
    const decrypted = await decrypt(emailConfig.smtp_password_encrypted);
    passwordMasked = maskSecret(decrypted);
    hasPassword = true;
   } else if (emailConfig.smtp_password_encrypted && emailConfig.smtp_password_encrypted.length > 0) {
    passwordMasked = maskSecret(emailConfig.smtp_password_encrypted);
    hasPassword = true;
   }
  } catch {
   passwordMasked = '';
  }

  const config = {
   whatsapp: {
    api_url: waConfig.api_url || 'https://graph.facebook.com/v18.0',
    phone_number_id: waConfig.phone_number_id || '',
    business_account_id: waConfig.business_account_id || '',
    access_token_masked: accessTokenMasked,
    has_token: hasToken,
    enabled: waData?.is_enabled || false
   },
   email: {
    host: emailConfig.smtp_host || '',
    port: emailConfig.smtp_port || 587,
    user: emailConfig.smtp_user || '',
    password_masked: passwordMasked,
    has_password: hasPassword,
    from_email: emailConfig.from_email || '',
    from_name: emailConfig.from_name || 'FengXchange',
    enabled: emailData?.is_enabled || false
   }
  };

  return NextResponse.json({ config });
 } catch (error) {
  console.error('Error en GET /api/config/notifications:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// PUT: Actualizar configuración de notificaciones (cifrar tokens)
export async function PUT(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error, userId } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();

  // Validar datos de entrada
  const validationResult = notificationsSchema.safeParse(body);

  if (!validationResult.success) {
   return NextResponse.json(
    {
     error: 'Datos inválidos',
     details: validationResult.error.flatten().fieldErrors
    },
    { status: 400 }
   );
  }

  const validatedData = validationResult.data;

  // Procesar configuración de WhatsApp
  if (validatedData.whatsapp) {
   const wa = validatedData.whatsapp;

   // Obtener config actual
   const { data: currentWa } = await supabase
    .from('notification_config')
    .select('config, is_enabled')
    .eq('provider', 'whatsapp')
    .single();

   const currentConfig = (currentWa?.config || {}) as WhatsAppStoredConfig;

   // Construir nuevo config
   const newConfig: WhatsAppStoredConfig = {
    api_url: wa.api_url !== undefined ? wa.api_url : currentConfig.api_url,
    phone_number_id: wa.phone_number_id !== undefined ? wa.phone_number_id : currentConfig.phone_number_id,
    business_account_id: wa.business_account_id !== undefined ? wa.business_account_id : currentConfig.business_account_id,
    access_token_encrypted: currentConfig.access_token_encrypted // mantener actual por defecto
   };

   // Si se envió un nuevo token, cifrarlo
   if (wa.access_token !== undefined && wa.access_token !== '') {
    newConfig.access_token_encrypted = await encrypt(wa.access_token);
   }

   // Update (no upsert porque el registro ya existe)
   const { error: waError } = await supabase
    .from('notification_config')
    .update({
     config: newConfig,
     is_enabled: wa.enabled !== undefined ? wa.enabled : (currentWa?.is_enabled || false),
     updated_at: new Date().toISOString(),
     updated_by: userId
    })
    .eq('provider', 'whatsapp');

   if (waError) {
    console.error('Error updating WhatsApp config:', waError);
   }
  }

  // Procesar configuración de Email
  if (validatedData.email) {
   const em = validatedData.email;

   // Obtener config actual
   const { data: currentEmail } = await supabase
    .from('notification_config')
    .select('config, is_enabled')
    .eq('provider', 'email')
    .single();

   const currentConfig = (currentEmail?.config || {}) as EmailStoredConfig;

   // Construir nuevo config (mapear nombres del frontend a estructura de BD)
   const newConfig: EmailStoredConfig = {
    smtp_host: em.host !== undefined ? em.host : currentConfig.smtp_host,
    smtp_port: em.port !== undefined ? em.port : currentConfig.smtp_port,
    smtp_user: em.user !== undefined ? em.user : currentConfig.smtp_user,
    from_email: em.from_email !== undefined ? em.from_email : currentConfig.from_email,
    from_name: em.from_name !== undefined ? em.from_name : currentConfig.from_name,
    smtp_password_encrypted: currentConfig.smtp_password_encrypted // mantener actual por defecto
   };

   // Si se envió una nueva contraseña, cifrarla
   if (em.password !== undefined && em.password !== '') {
    newConfig.smtp_password_encrypted = await encrypt(em.password);
   }

   // Update
   const { error: emailError } = await supabase
    .from('notification_config')
    .update({
     config: newConfig,
     is_enabled: em.enabled !== undefined ? em.enabled : (currentEmail?.is_enabled || false),
     updated_at: new Date().toISOString(),
     updated_by: userId
    })
    .eq('provider', 'email');

   if (emailError) {
    console.error('Error updating Email config:', emailError);
   }
  }

  return NextResponse.json({
   success: true,
   message: 'Configuración de notificaciones actualizada correctamente'
  });
 } catch (error) {
  console.error('Error en PUT /api/config/notifications:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
