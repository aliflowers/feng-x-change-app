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

// GET: Obtener plantillas de WhatsApp
export async function GET() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

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

  const waConfig = (waData?.config || {}) as WhatsAppStoredConfig;

  if (!waConfig.business_account_id || !waConfig.access_token_encrypted) {
   return NextResponse.json({
    success: false,
    error: 'Configuración incompleta (falta Business Account ID o Access Token)'
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

  // Obtener plantillas usando el WABA ID
  const templatesUrl = `${apiUrl}/${waConfig.business_account_id}/message_templates`;

  console.log('Fetching WhatsApp templates from:', templatesUrl);

  const response = await fetch(templatesUrl, {
   method: 'GET',
   headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
   }
  });

  // Limpiar token
  accessToken = '';

  const responseData = await response.json();

  if (response.ok) {
   const templates = responseData.data || [];

   // Filtrar solo plantillas aprobadas
   const approvedTemplates = templates.filter((t: { status: string }) => t.status === 'APPROVED');

   console.log(`Found ${templates.length} templates, ${approvedTemplates.length} approved`);

   return NextResponse.json({
    success: true,
    total: templates.length,
    approved: approvedTemplates.length,
    templates: templates.map((t: { name: string; status: string; language: string; category: string; components: unknown[] }) => ({
     name: t.name,
     status: t.status,
     language: t.language,
     category: t.category,
     components: t.components
    }))
   });
  } else {
   console.error('WhatsApp API error:', responseData);
   return NextResponse.json({
    success: false,
    error: 'Error al obtener plantillas',
    details: responseData.error?.message || 'Error desconocido'
   }, { status: response.status });
  }

 } catch (error) {
  console.error('Error en GET /api/whatsapp/templates:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
