import { NextRequest, NextResponse } from 'next/server';

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

       // TODO: Fase 7 - Procesar mensaje con agente de IA
       // await processIncomingMessage(message, contacts, metadata);
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

      // Los posibles estados son: APPROVED, REJECTED, PENDING, PAUSED, DISABLED
      // Aquí podrías notificar al admin por email o guardar en BD
      // TODO: Implementar notificación al admin cuando una plantilla cambie de estado
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
