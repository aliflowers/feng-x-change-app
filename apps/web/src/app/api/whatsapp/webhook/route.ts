import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { OpenAIProvider, isOpenAIConfigured } from '@/lib/openai-provider';
import type { AIConfig, ClientContext, ChatMessage } from '@/types/ai-types';

// Token de verificación que debe coincidir con el configurado en Meta Dashboard
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fengxchange_webhook_verify_2024';

/**
 * GET - Verificación del webhook por Meta
 * Meta envía una solicitud GET para verificar que el endpoint es válido
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: NextRequest) {
 const searchParams = request.nextUrl.searchParams;

 // Parámetros enviados por Meta para verificación
 const mode = searchParams.get('hub.mode');
 const token = searchParams.get('hub.verify_token');
 const challenge = searchParams.get('hub.challenge');

 console.log('Webhook verification request:', { mode, token: token ? '***' : 'missing', challenge: challenge ? 'present' : 'missing' });

 // Verificar que es una solicitud de suscripción válida
 if (mode === 'subscribe' && token === VERIFY_TOKEN) {
  console.log('Webhook verified successfully!');
  // Responder con el challenge para completar la verificación
  return new NextResponse(challenge, {
   status: 200,
   headers: { 'Content-Type': 'text/plain' }
  });
 }

 console.warn('Webhook verification failed - invalid token or mode');
 return NextResponse.json(
  { error: 'Forbidden - Invalid verification token' },
  { status: 403 }
 );
}

/**
 * POST - Recibir eventos de WhatsApp (mensajes, estados, etc.)
 * Este endpoint recibe notificaciones de mensajes entrantes
 */
export async function POST(request: NextRequest) {
 try {
  const body = await request.json();

  // Log del evento recibido (sin datos sensibles)
  console.log('WhatsApp webhook event received:', {
   object: body.object,
   hasEntry: !!body.entry,
   entryCount: body.entry?.length || 0
  });

  // Verificar que es un evento de WhatsApp
  if (body.object !== 'whatsapp_business_account') {
   return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  // Procesar cada entrada del webhook
  if (body.entry && Array.isArray(body.entry)) {
   for (const entry of body.entry) {
    const changes = entry.changes || [];

    for (const change of changes) {
     if (change.field === 'messages') {
      const value = change.value || {};

      // Obtener información del mensaje
      const messages = value.messages || [];
      const contacts = value.contacts || [];
      const metadata = value.metadata || {};

      for (const message of messages) {
       // Obtener nombre del contacto si está disponible
       const contact = contacts.find((c: { wa_id: string }) => c.wa_id === message.from);

       // Log del mensaje (sin contenido sensible en producción)
       console.log('Incoming WhatsApp message:', {
        from: message.from,
        contact_name: contact?.profile?.name || 'Unknown',
        type: message.type,
        timestamp: message.timestamp,
        phone_number_id: metadata.phone_number_id
       });

       // ✅ Fase 7: Procesar mensaje con agente de IA
       await processIncomingMessage(message, contact, metadata);
      }

      // Procesar estados de mensajes (enviado, entregado, leído, fallido)
      const statuses = value.statuses || [];
      for (const status of statuses) {
       console.log('Message status update:', {
        id: status.id,
        status: status.status,
        recipient_id: status.recipient_id,
        // Loguear errores si existen (ej. fallo por ventana 24h)
        errors: status.errors || undefined
       });

       // TODO: Actualizar estado del mensaje en la BD
      }
     }

     // Handler para actualizaciones de estado de plantillas
     if (change.field === 'message_template_status_update') {
      const value = change.value || {};

      console.log('📋 Template status update:', {
       event: value.event,
       template_name: value.message_template_name,
       language: value.message_template_language,
       reason: value.reason || null
      });
     }

     // Handler para calidad de la cuenta de WhatsApp
     if (change.field === 'account_update') {
      const value = change.value || {};

      console.log('⚠️ Account quality update:', {
       phone_number: value.phone_number,
       event: value.event,
       reason: value.reason || null
      });
     }
    }
   }
  }

  // Siempre responder 200 OK para confirmar recepción
  // WhatsApp reintentará si no recibe 200
  return NextResponse.json({ status: 'received' }, { status: 200 });

 } catch (error) {
  console.error('Error processing WhatsApp webhook:', error);
  // Aún así responder 200 para evitar reintentos infinitos
  return NextResponse.json({ status: 'error' }, { status: 200 });
 }
}

// =========================================================================
// PROCESAMIENTO DE MENSAJES CON AGENTE IA
// =========================================================================

interface WhatsAppMessage {
 id: string;
 from: string;
 timestamp: string;
 type: string;
 text?: { body: string };
 image?: { id: string; mime_type: string; sha256: string; caption?: string };
}

interface WhatsAppContact {
 wa_id: string;
 profile?: { name: string };
}

interface WhatsAppMetadata {
 display_phone_number: string;
 phone_number_id: string;
}

async function processIncomingMessage(
 message: WhatsAppMessage,
 _contact: WhatsAppContact | undefined,
 metadata: WhatsAppMetadata
): Promise<void> {
 const supabase = createServerClient();

 try {
  // 0. DEDUPLICACIÓN: Verificar si este mensaje ya fue procesado
  const { data: existingMessage } = await supabase
   .from('ai_conversations')
   .select('id')
   .eq('whatsapp_message_id', message.id)
   .single();

  if (existingMessage) {
   console.log('Message already processed, skipping:', message.id);
   return;
  }

  // 1. Verificar si el agente está habilitado
  const { data: aiConfig } = await supabase
   .from('ai_config')
   .select('*')
   .single();

  if (!aiConfig?.is_enabled) {
   console.log('AI Agent disabled, skipping message processing');
   return;
  }

  // 2. Verificar que la API key está configurada
  if (!isOpenAIConfigured()) {
   console.error('OPENAI_API_KEY not configured');
   return;
  }

  // 3. Identificar al cliente (búsqueda flexible con/sin +)
  const phoneNumber = message.from;
  // Limpiar número: solo dígitos
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const phoneWithPlus = `+${cleanPhone}`;

  // Buscar primero en whatsapp_number (formato limpio)
  let { data: profile } = await supabase
   .from('profiles')
   .select('id, first_name, last_name, email, document_type, document_number, phone_number')
   .eq('whatsapp_number', cleanPhone)
   .single();

  // Si no se encontró, buscar en phone_number (con +)
  if (!profile) {
   const { data: profileByPhone } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, document_type, document_number, phone_number')
    .eq('phone_number', phoneWithPlus)
    .single();
   profile = profileByPhone;
  }

  const clientContext: ClientContext = {
   isRegistered: !!profile,
   clientId: profile?.id || null,
   clientName: profile ? `${profile.first_name} ${profile.last_name}` : null,
   clientEmail: profile?.email || null,
   clientDocument: profile ? `${profile.document_type}: ${profile.document_number}` : null,
   phoneNumber: cleanPhone,
   conversationState: { status: 'idle' }
  };

  // 4. Obtener historial de conversación reciente (últimas 10 mensajes)
  const { data: recentMessages } = await supabase
   .from('ai_conversations')
   .select('message_type, message_content')
   .eq('phone_number', phoneNumber)
   .order('created_at', { ascending: false })
   .limit(20);

  const history: ChatMessage[] = (recentMessages || [])
   .reverse()
   .map((msg: { message_type: string; message_content: string | null }) => ({
    role: msg.message_type === 'incoming' ? 'user' as const : 'assistant' as const,
    content: msg.message_content || ''
   }));

  // 5. Preparar mensaje entrante
  let messageContent = '';

  if (message.type === 'text' && message.text?.body) {
   messageContent = message.text.body;
  } else if (message.type === 'image' && message.image) {
   // TODO: Descargar imagen y obtener URL para análisis
   messageContent = message.image.caption || '[Imagen enviada]';
   // TODO: Implementar descarga de media para análisis con Vision
  } else {
   console.log('Unsupported message type:', message.type);
   return;
  }

  // 6. Guardar mensaje entrante en BD
  await supabase.from('ai_conversations').insert({
   phone_number: phoneNumber,
   profile_id: profile?.id || null,
   message_type: 'incoming',
   message_content: messageContent,
   whatsapp_message_id: message.id
  });

  // 7. Procesar con OpenAI
  const provider = new OpenAIProvider(aiConfig as AIConfig);
  const { response, tokensUsed } = await provider.processMessage(
   messageContent,
   history,
   clientContext
  );

  // 8. Guardar respuesta en BD
  await supabase.from('ai_conversations').insert({
   phone_number: phoneNumber,
   profile_id: profile?.id || null,
   message_type: 'outgoing',
   message_content: response,
   tokens_used: tokensUsed
  });

  // 9. Enviar respuesta por WhatsApp
  await sendWhatsAppMessage(metadata.phone_number_id, phoneNumber, response);

  console.log('AI response sent:', {
   to: phoneNumber,
   tokensUsed,
   responseLength: response.length
  });

 } catch (error) {
  console.error('Error processing message with AI:', error);
  // No relanzar el error para no afectar el webhook
 }
}

// =========================================================================
// ENVÍO DE MENSAJES POR WHATSAPP
// =========================================================================

async function sendWhatsAppMessage(
 phoneNumberId: string,
 to: string,
 text: string
): Promise<void> {
 const supabase = createServerClient();

 // Obtener token de WhatsApp
 // Obtener configuración de WhatsApp (Lógica idéntica a /api/whatsapp/send)
 const { data: waData, error: fetchError } = await supabase
  .from('notification_config')
  .select('config, is_enabled')
  .eq('provider', 'whatsapp')
  .single();

 if (fetchError || !waData?.is_enabled) {
  console.error('WhatsApp configuration error or disabled in DB');
  return;
 }

 const waConfig = (waData?.config || {}) as any;

 if (!waConfig.phone_number_id || !waConfig.access_token_encrypted) {
  console.error('WhatsApp configuration incomplete in DB');
  return;
 }

 // Descifrar token
 let token = '';
 try {
  const { decrypt, isEncrypted } = await import('@/lib/crypto');
  if (isEncrypted(waConfig.access_token_encrypted)) {
   token = await decrypt(waConfig.access_token_encrypted);
  } else {
   token = waConfig.access_token_encrypted;
  }
 } catch (err) {
  console.error('Error decrypting WhatsApp token:', err);
  return;
 }

 // Enviar mensaje
 const response = await fetch(
  `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
  {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
   },
   body: JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
   })
  }
 );

 if (!response.ok) {
  const error = await response.json();
  console.error('Error sending WhatsApp message:', error);
 }
}
