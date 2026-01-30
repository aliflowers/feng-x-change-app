import { NextRequest, NextResponse } from 'next/server';
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

// POST: Enviar mensaje de WhatsApp
export async function POST(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener datos del cuerpo
  const body = await request.json();
  const { to, message } = body;

  if (!to || !message) {
   return NextResponse.json({
    success: false,
    error: 'Se requiere "to" (número) y "message" (texto)'
   }, { status: 400 });
  }

  // Formatear número (eliminar + y espacios)
  const formattedNumber = to.replace(/[+\s-]/g, '');

  // Obtener configuración de WhatsApp
  const { data: waData, error: fetchError } = await supabase
   .from('notification_config')
   .select('config, is_enabled')
   .eq('provider', 'whatsapp')
   .single();

  if (fetchError) {
   return NextResponse.json({
    success: false,
    error: 'Error al obtener configuración de WhatsApp'
   }, { status: 500 });
  }

  if (!waData?.is_enabled) {
   return NextResponse.json({
    success: false,
    error: 'WhatsApp no está habilitado en la configuración'
   }, { status: 400 });
  }

  const waConfig = (waData?.config || {}) as WhatsAppStoredConfig;

  if (!waConfig.phone_number_id || !waConfig.access_token_encrypted) {
   return NextResponse.json({
    success: false,
    error: 'Configuración de WhatsApp incompleta (falta Phone Number ID o Access Token)'
   }, { status: 400 });
  }

  // Descifrar token
  let accessToken = '';
  try {
   if (isEncrypted(waConfig.access_token_encrypted)) {
    accessToken = await decrypt(waConfig.access_token_encrypted);
   } else {
    accessToken = waConfig.access_token_encrypted;
   }
  } catch {
   return NextResponse.json({
    success: false,
    error: 'Error al descifrar el Access Token'
   }, { status: 500 });
  }

  const apiUrl = waConfig.api_url || 'https://graph.facebook.com/v18.0';

  // Enviar mensaje usando la API de WhatsApp Business
  const messageUrl = `${apiUrl}/${waConfig.phone_number_id}/messages`;

  const whatsappPayload = {
   messaging_product: 'whatsapp',
   recipient_type: 'individual',
   to: formattedNumber,
   type: 'text',
   text: {
    preview_url: false,
    body: message
   }
  };

  console.log('Sending WhatsApp message to:', formattedNumber);

  const response = await fetch(messageUrl, {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
   },
   body: JSON.stringify(whatsappPayload)
  });

  // Limpiar token de memoria
  accessToken = '';

  const responseData = await response.json();

  if (response.ok) {
   console.log('WhatsApp message sent successfully:', responseData);
   return NextResponse.json({
    success: true,
    message: 'Mensaje enviado correctamente',
    details: {
     message_id: responseData.messages?.[0]?.id,
     to: formattedNumber
    }
   });
  } else {
   console.error('WhatsApp API error:', responseData);
   return NextResponse.json({
    success: false,
    error: 'Error al enviar mensaje',
    details: responseData.error?.message || 'Error desconocido'
   }, { status: response.status });
  }

 } catch (error) {
  console.error('Error en POST /api/whatsapp/send:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
