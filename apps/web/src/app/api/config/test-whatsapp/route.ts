import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { decrypt, isEncrypted } from '@/lib/crypto';

// Interfaz para la configuración almacenada en JSONB
interface WhatsAppStoredConfig {
 api_url?: string;
 phone_number_id?: string;
 business_account_id?: string;
 access_token_encrypted?: string;
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

// POST: Probar conexión con WhatsApp Business API
export async function POST() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener configuración de WhatsApp (estructura correcta: provider + config JSONB)
  const { data: waData, error: fetchError } = await supabase
   .from('notification_config')
   .select('config, is_enabled')
   .eq('provider', 'whatsapp')
   .single();

  if (fetchError) {
   return NextResponse.json(
    { success: false, error: 'Error al obtener configuración' },
    { status: 500 }
   );
  }

  const waConfig = (waData?.config || {}) as WhatsAppStoredConfig;

  const apiUrl = waConfig.api_url || 'https://graph.facebook.com/v18.0';
  const phoneNumberId = waConfig.phone_number_id;
  const encryptedToken = waConfig.access_token_encrypted;

  if (!phoneNumberId) {
   return NextResponse.json({
    success: false,
    error: 'Phone Number ID no configurado'
   }, { status: 400 });
  }

  if (!encryptedToken) {
   return NextResponse.json({
    success: false,
    error: 'Access Token no configurado'
   }, { status: 400 });
  }

  // Descifrar token (SOLO en servidor, NUNCA se envía al frontend)
  let accessToken = '';
  try {
   if (isEncrypted(encryptedToken)) {
    accessToken = await decrypt(encryptedToken);
   } else {
    accessToken = encryptedToken;
   }
  } catch {
   return NextResponse.json({
    success: false,
    error: 'Error al descifrar el Access Token'
   }, { status: 500 });
  }

  // Probar conexión con WhatsApp Business API
  // Usamos el endpoint de "phone_numbers" para verificar el acceso
  const testUrl = `${apiUrl}/${phoneNumberId}`;

  try {
   const response = await fetch(testUrl, {
    method: 'GET',
    headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
    }
   });

   // Limpiar token de memoria inmediatamente después de usarlo
   accessToken = '';

   if (response.ok) {
    const data = await response.json();
    return NextResponse.json({
     success: true,
     message: 'Conexión exitosa con WhatsApp Business API',
     details: {
      phone_number: data.display_phone_number || data.verified_name || phoneNumberId,
      quality_rating: data.quality_rating || 'N/A'
     }
    });
   } else {
    const errorData = await response.json();
    return NextResponse.json({
     success: false,
     error: 'Error de conexión con WhatsApp',
     details: errorData.error?.message || 'Error desconocido'
    }, { status: response.status });
   }
  } catch (fetchErr) {
   // No loguear el token, solo el error genérico
   console.error('WhatsApp API connection test failed');
   return NextResponse.json({
    success: false,
    error: 'No se pudo conectar con la API de WhatsApp',
    details: 'Verifica la URL y el token de acceso'
   }, { status: 503 });
  }

 } catch (error) {
  console.error('Error en POST /api/config/test-whatsapp:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
