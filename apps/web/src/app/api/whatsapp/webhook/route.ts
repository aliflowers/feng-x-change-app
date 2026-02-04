import { NextRequest, NextResponse } from 'next/server';
import { dispatchMessage, type IncomingMessage } from '@/lib/whatsapp/handlers';

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
 * Este endpoint recibe notificaciones de mensajes entrantes y los despacha
 * al sistema de flujo determinista.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log del evento recibido (sin datos sensibles)
    console.log('[Webhook] Event received:', {
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
            const messages = value.messages || [];
            const metadata = value.metadata || {};

            for (const message of messages) {
              // Deduplicación básica por message ID
              const messageId = message.id;

              console.log('[Webhook] Processing message:', {
                id: messageId,
                from: message.from,
                type: message.type,
                timestamp: message.timestamp
              });

              // Construir mensaje tipado para el dispatcher
              const incomingMessage: IncomingMessage = {
                id: message.id,
                from: message.from,
                timestamp: message.timestamp,
                type: message.type,
                text: message.text,
                interactive: message.interactive,
                image: message.image
              };

              // Despachar al sistema de flujo determinista
              // El dispatcher maneja:
              // - Verificación de registro del usuario
              // - Estado de la conversación (current_step)
              // - Enrutamiento al handler correcto
              await dispatchMessage(incomingMessage, metadata.phone_number_id);
            }

            // Procesar estados de mensajes (enviado, entregado, leído, fallido)
            const statuses = value.statuses || [];
            for (const status of statuses) {
              console.log('[Webhook] Message status:', {
                id: status.id,
                status: status.status,
                recipient_id: status.recipient_id,
                errors: status.errors || undefined
              });
              // TODO: Actualizar estado del mensaje en la BD si es necesario
            }
          }

          // Handler para actualizaciones de estado de plantillas
          if (change.field === 'message_template_status_update') {
            const value = change.value || {};
            console.log('[Webhook] Template status update:', {
              event: value.event,
              template_name: value.message_template_name,
              language: value.message_template_language,
              reason: value.reason || null
            });
          }

          // Handler para calidad de la cuenta de WhatsApp
          if (change.field === 'account_update') {
            const value = change.value || {};
            console.log('[Webhook] Account quality update:', {
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
    console.error('[Webhook] Error processing:', error);
    // Aún así responder 200 para evitar reintentos infinitos
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
