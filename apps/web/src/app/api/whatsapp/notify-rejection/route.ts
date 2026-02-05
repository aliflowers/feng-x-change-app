'use server';

/**
 * API Route: /api/whatsapp/notify-rejection
 * 
 * Envía notificación vía WhatsApp al cliente cuando su transacción es rechazada,
 * incluyendo el motivo del rechazo proporcionado por el SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/whatsapp';

interface NotifyRejectionRequest {
  transactionId: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotifyRejectionRequest = await request.json();
    const { transactionId, reason } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Obtener datos de la transacción y el cliente
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_number,
        amount_sent,
        from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
        user:profiles!transactions_user_id_fkey(
          first_name,
          last_name,
          whatsapp_number
        )
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      console.error('[NotifyRejection] Transaction not found:', txError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = transaction.user as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromCurrency = transaction.from_currency as any;

    // Buscar número de WhatsApp del cliente
    const clientWhatsApp = user?.whatsapp_number;

    if (!clientWhatsApp) {
      console.log('[NotifyRejection] Client has no WhatsApp number');
      return NextResponse.json({
        success: false,
        message: 'Client has no WhatsApp number registered',
        notified: false,
      });
    }

    const clientName = user ? user.first_name : 'Cliente';
    const fromSymbol = fromCurrency?.symbol || '$';
    const fromCode = fromCurrency?.code || 'USD';

    // Construir mensaje de rechazo
    const message =
      `❌ *Transacción Rechazada*\n\n` +
      `Hola ${clientName},\n\n` +
      `Lamentamos informarte que tu transacción ha sido rechazada.\n\n` +
      `📋 *Operación:* ${transaction.transaction_number}\n` +
      `💵 *Monto:* ${fromSymbol}${transaction.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${fromCode}\n\n` +
      `📝 *Motivo del rechazo:*\n${reason.trim()}\n\n` +
      `Si tienes alguna duda, por favor contáctanos.\n\n` +
      `_FengXChange_`;

    try {
      const result = await sendTextMessage(clientWhatsApp, message);
      console.log(`[NotifyRejection] Sent to client ${clientName}:`, result.success);

      return NextResponse.json({
        success: true,
        notified: result.success,
        clientPhone: clientWhatsApp,
      });
    } catch (error) {
      console.error(`[NotifyRejection] Error sending to client:`, error);
      return NextResponse.json({
        success: false,
        message: 'Error sending WhatsApp message',
        notified: false,
      });
    }

  } catch (error) {
    console.error('[NotifyRejection] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
