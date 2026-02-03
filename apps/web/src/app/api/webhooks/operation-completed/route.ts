// =========================================================================
// Webhook: Notificación de operación completada
// Fase 3: Sistema de Eventos para notificaciones proactivas
// =========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Verificar que la API key esté configurada
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'fengxchange_webhook_secret_2026';

/**
 * POST /api/webhooks/operation-completed
 * 
 * Recibe notificación cuando una operación cambia a status='completed'
 * y envía mensaje proactivo al cliente por WhatsApp.
 */
export async function POST(request: NextRequest) {
 try {
  // 1. Validar autenticación del webhook
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
   console.warn('[Webhook] Unauthorized request');
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parsear body
  const body = await request.json();
  const { transaction_id, phone_number } = body;

  if (!transaction_id || !phone_number) {
   return NextResponse.json(
    { error: 'Missing transaction_id or phone_number' },
    { status: 400 }
   );
  }

  console.log('[Webhook] Processing operation completed:', { transaction_id, phone_number });

  // 3. Obtener detalles de la operación
  const supabase = createServerClient();

  const { data: transaction, error: txError } = await supabase
   .from('transactions')
   .select(`
    id,
    transaction_number,
    amount_sent,
    amount_received,
    exchange_rate,
    status,
    created_at,
    from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
    to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
    beneficiary:user_bank_accounts!transactions_beneficiary_id_fkey(
     alias,
     account_holder,
     bank_name
    ),
    user:profiles!transactions_user_id_fkey(
     id,
     first_name,
     last_name
    )
   `)
   .eq('id', transaction_id)
   .single();

  if (txError || !transaction) {
   console.error('[Webhook] Transaction not found:', txError);
   await markWebhookFailed(supabase, transaction_id, 'Transaction not found');
   return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  // 4. Generar mensaje personalizado con IA
  const message = await generateCompletionMessage(transaction);

  // 5. Enviar por WhatsApp
  const whatsappSuccess = await sendWhatsAppNotification(phone_number, message);

  if (!whatsappSuccess) {
   await markWebhookFailed(supabase, transaction_id, 'WhatsApp send failed');
   return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }

  // 6. Marcar webhook como notificado
  await supabase
   .from('operation_webhooks')
   .update({
    status: 'notified',
    notified_at: new Date().toISOString()
   })
   .eq('transaction_id', transaction_id);

  // 7. Guardar en historial de conversación
  // El user puede ser un array (relación many) o un objeto (single)
  const userProfile = Array.isArray(transaction.user)
   ? transaction.user[0]
   : transaction.user;

  await supabase.from('ai_conversations').insert({
   phone_number: phone_number,
   profile_id: userProfile?.id || null,
   message_type: 'outgoing',
   message_content: message,
   tokens_used: 0
  });

  console.log('[Webhook] Successfully notified:', { transaction_id, phone_number });

  return NextResponse.json({ success: true, message: 'Notification sent' });

 } catch (error) {
  console.error('[Webhook] Error:', error);
  return NextResponse.json(
   { error: error instanceof Error ? error.message : 'Unknown error' },
   { status: 500 }
  );
 }
}

/**
 * Genera mensaje de confirmación usando GPT-5-mini
 */
async function generateCompletionMessage(transaction: any): Promise<string> {
 const apiKey = process.env.OPENAI_API_KEY;

 if (!apiKey) {
  // Fallback sin IA
  return `✅ ¡Tu operación #${transaction.transaction_number} fue completada!\n\n` +
   `💸 Enviaste: ${transaction.amount_sent} ${transaction.from_currency?.code || ''}\n` +
   `💰 Recibió: ${transaction.amount_received} ${transaction.to_currency?.code || ''}\n` +
   `👤 Beneficiario: ${transaction.beneficiary?.alias || transaction.beneficiary?.account_holder || 'N/A'}\n\n` +
   `🎉 Gracias por usar FengXchange`;
 }

 try {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
   model: 'gpt-5-mini',
   temperature: 0.3,
   max_completion_tokens: 200,
   messages: [{
    role: 'system',
    content: `Eres FengBot. Genera un mensaje confirmando que la operación fue completada.

DATOS:
- Número operación: ${transaction.transaction_number}
- Monto enviado: ${transaction.amount_sent} ${transaction.from_currency?.code || ''}
- Monto recibido: ${transaction.amount_received} ${transaction.to_currency?.code || ''}
- Beneficiario: ${transaction.beneficiary?.alias || transaction.beneficiary?.account_holder || 'N/A'}
- Banco: ${transaction.beneficiary?.bank_name || 'N/A'}

INSTRUCCIONES:
- Máximo 4 líneas
- Tono amigable y profesional
- Incluir emoji de confirmación ✅
- Agradecer la preferencia
- NO incluir datos sensibles (números de cuenta completos)`
   }]
  });

  return response.choices[0].message.content || generateFallbackMessage(transaction);

 } catch (error) {
  console.error('[Webhook] OpenAI error:', error);
  return generateFallbackMessage(transaction);
 }
}

function generateFallbackMessage(transaction: any): string {
 return `✅ ¡Operación #${transaction.transaction_number} completada!\n\n` +
  `💸 ${transaction.amount_sent} ${transaction.from_currency?.code || ''} → ` +
  `💰 ${transaction.amount_received} ${transaction.to_currency?.code || ''}\n` +
  `👤 ${transaction.beneficiary?.alias || 'Beneficiario'}\n\n` +
  `🎉 Gracias por usar FengXchange`;
}

/**
 * Envía mensaje por WhatsApp usando la API de Meta
 */
async function sendWhatsAppNotification(phoneNumber: string, message: string): Promise<boolean> {
 const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
 const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

 if (!accessToken || !phoneNumberId) {
  console.error('[Webhook] WhatsApp credentials not configured');
  return false;
 }

 try {
  const response = await fetch(
   `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
   {
    method: 'POST',
    headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({
     messaging_product: 'whatsapp',
     recipient_type: 'individual',
     to: phoneNumber,
     type: 'text',
     text: { body: message }
    })
   }
  );

  if (!response.ok) {
   const error = await response.json();
   console.error('[Webhook] WhatsApp API error:', error);
   return false;
  }

  return true;
 } catch (error) {
  console.error('[Webhook] WhatsApp send error:', error);
  return false;
 }
}

/**
 * Marca el webhook como fallido
 */
async function markWebhookFailed(
 supabase: ReturnType<typeof createServerClient>,
 transactionId: string,
 errorMessage: string
): Promise<void> {
 await supabase
  .from('operation_webhooks')
  .update({
   status: 'failed',
   error_message: errorMessage
  })
  .eq('transaction_id', transactionId);
}
