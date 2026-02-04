'use server';

/**
 * API Route: /api/whatsapp/notify-payment
 * 
 * Envía notificación de pago completado al cliente vía WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendTextMessage, sendImageMessage } from '@/lib/whatsapp';

interface NotifyPaymentRequest {
  transactionId: string;
  paymentReference: string;
  proofUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotifyPaymentRequest = await request.json();
    const { transactionId, paymentReference, proofUrl } = body;

    if (!transactionId || !paymentReference || !proofUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Obtener datos de la transacción
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_number,
        amount_received,
        to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
        user:profiles!transactions_user_id_fkey(id, first_name, whatsapp_number),
        user_bank_account:user_bank_accounts(account_holder)
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      console.error('[NotifyPayment] Transaction not found:', txError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Obtener datos del usuario y teléfono
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = transaction.user as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toCurrency = transaction.to_currency as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userBankAccount = transaction.user_bank_account as any;

    // Intentar obtener teléfono del perfil primero
    let phoneNumber = user?.whatsapp_number;

    // Si no tiene whatsapp_number, buscar en chat_sessions
    if (!phoneNumber) {
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('phone_number')
        .eq('user_id', user?.id)
        .eq('provider', 'whatsapp')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      phoneNumber = chatSession?.phone_number;
    }

    if (!phoneNumber) {
      console.error('[NotifyPayment] No WhatsApp phone found for user');
      return NextResponse.json(
        { error: 'User has no WhatsApp number', success: false },
        { status: 200 } // No es error crítico
      );
    }

    const beneficiaryName = userBankAccount?.account_holder || 'tu beneficiario';
    const amount = transaction.amount_received;
    const currency = toCurrency?.code || '';
    const symbol = toCurrency?.symbol || '';

    // Mensaje de confirmación
    const confirmationMessage =
      `✅ *¡Pago realizado exitosamente!*\n\n` +
      `Hola ${user?.first_name || 'Cliente'},\n\n` +
      `Tu transferencia a *${beneficiaryName}* ha sido completada.\n\n` +
      `💰 *Monto:* ${symbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${currency}\n` +
      `📄 *Referencia:* ${paymentReference}\n` +
      `📋 *Operación:* ${transaction.transaction_number}\n\n` +
      `Gracias por confiar en nosotros. ¡Hasta pronto! 🙌`;

    // Enviar mensaje de texto
    const textResult = await sendTextMessage(phoneNumber, confirmationMessage);
    console.log('[NotifyPayment] Text message result:', textResult);

    // Enviar imagen del comprobante
    const imageResult = await sendImageMessage(
      phoneNumber,
      proofUrl,
      `Comprobante de pago - ${transaction.transaction_number}`
    );
    console.log('[NotifyPayment] Image message result:', imageResult);

    return NextResponse.json({
      success: true,
      textMessageSent: textResult.success,
      imageMessageSent: imageResult.success,
    });

  } catch (error) {
    console.error('[NotifyPayment] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
