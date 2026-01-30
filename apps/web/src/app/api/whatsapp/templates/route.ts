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

// POST: Crear nueva plantilla de WhatsApp
export async function POST(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener datos del cuerpo
  const body = await request.json();
  const { name, category, language, components } = body;

  // Validaciones
  if (!name || typeof name !== 'string') {
   return NextResponse.json({
    success: false,
    error: 'El nombre de la plantilla es requerido'
   }, { status: 400 });
  }

  // Validar formato del nombre (snake_case, solo minúsculas, números y guiones bajos)
  const nameRegex = /^[a-z][a-z0-9_]*$/;
  const formattedName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  if (!nameRegex.test(formattedName)) {
   return NextResponse.json({
    success: false,
    error: 'El nombre debe ser snake_case (minúsculas, números y guiones bajos)'
   }, { status: 400 });
  }

  if (formattedName.length > 512) {
   return NextResponse.json({
    success: false,
    error: 'El nombre no puede exceder 512 caracteres'
   }, { status: 400 });
  }

  // Validar categoría
  const validCategories = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];
  if (!category || !validCategories.includes(category)) {
   return NextResponse.json({
    success: false,
    error: 'Categoría inválida. Debe ser: UTILITY, MARKETING o AUTHENTICATION'
   }, { status: 400 });
  }

  // Validar idioma
  const validLanguages = ['es', 'en', 'en_US', 'pt_BR', 'es_ES', 'es_MX'];
  if (!language || !validLanguages.includes(language)) {
   return NextResponse.json({
    success: false,
    error: 'Idioma inválido. Opciones: es, en, en_US, pt_BR, es_ES, es_MX'
   }, { status: 400 });
  }

  // Validar componentes
  if (!components || !Array.isArray(components) || components.length === 0) {
   return NextResponse.json({
    success: false,
    error: 'Se requiere al menos un componente (BODY)'
   }, { status: 400 });
  }

  // Verificar que existe un BODY
  const hasBody = components.some((c: { type: string }) => c.type === 'BODY');
  if (!hasBody) {
   return NextResponse.json({
    success: false,
    error: 'Se requiere un componente de tipo BODY'
   }, { status: 400 });
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

  // Crear plantilla en Meta
  const templatesUrl = `${apiUrl}/${waConfig.business_account_id}/message_templates`;

  console.log('Creating WhatsApp template:', formattedName);

  const response = await fetch(templatesUrl, {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
   },
   body: JSON.stringify({
    name: formattedName,
    category: category,
    language: language,
    components: components
   })
  });

  // Limpiar token
  accessToken = '';

  const responseData = await response.json();

  if (response.ok) {
   console.log('Template created successfully:', responseData);
   return NextResponse.json({
    success: true,
    message: 'Plantilla creada correctamente. Pendiente de aprobación por Meta.',
    template: {
     id: responseData.id,
     name: formattedName,
     status: 'PENDING',
     language: language,
     category: category
    }
   });
  } else {
   console.error('WhatsApp API error creating template:', responseData);
   return NextResponse.json({
    success: false,
    error: 'Error al crear plantilla',
    details: responseData.error?.message || 'Error desconocido'
   }, { status: response.status });
  }

 } catch (error) {
  console.error('Error en POST /api/whatsapp/templates:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// DELETE: Eliminar plantilla de WhatsApp
export async function DELETE(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener parámetros de query
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
   return NextResponse.json({
    success: false,
    error: 'Se requiere el nombre de la plantilla'
   }, { status: 400 });
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

  // Eliminar plantilla en Meta (elimina todas las versiones de idioma)
  const deleteUrl = `${apiUrl}/${waConfig.business_account_id}/message_templates?name=${encodeURIComponent(name)}`;

  console.log('Deleting WhatsApp template:', name);

  const response = await fetch(deleteUrl, {
   method: 'DELETE',
   headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
   }
  });

  // Limpiar token
  accessToken = '';

  const responseData = await response.json();

  if (response.ok && responseData.success) {
   console.log('Template deleted successfully:', name);
   return NextResponse.json({
    success: true,
    message: `Plantilla "${name}" eliminada correctamente`
   });
  } else {
   console.error('WhatsApp API error deleting template:', responseData);
   return NextResponse.json({
    success: false,
    error: 'Error al eliminar plantilla',
    details: responseData.error?.message || 'Error desconocido'
   }, { status: response.status });
  }

 } catch (error) {
  console.error('Error en DELETE /api/whatsapp/templates:', error);
  return NextResponse.json(
   { success: false, error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
