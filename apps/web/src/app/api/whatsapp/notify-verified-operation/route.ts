'use server';

/**
 * API Route: /api/whatsapp/notify-verified-operation
 * 
 * Envía notificación vía WhatsApp a usuarios operativos (ADMIN, CAJERO, SUPERVISOR)
 * cuando una operación es verificada por el SUPER_ADMIN y está lista para ser tomada
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/whatsapp';

interface NotifyVerifiedOperationRequest {
 transactionId: string;
}

// URL base de la aplicación
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fengxchange.com';

export async function POST(request: NextRequest) {
 try {
  const body: NotifyVerifiedOperationRequest = await request.json();
  const { transactionId } = body;

  if (!transactionId) {
   return NextResponse.json(
    { error: 'Transaction ID is required' },
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
        amount_sent,
        amount_received,
        from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
        to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
        user:profiles!transactions_user_id_fkey(first_name, last_name),
        user_bank_account:user_bank_accounts(
          account_holder,
          bank_name,
          bank:banks(name)
        )
      `)
   .eq('id', transactionId)
   .single();

  if (txError || !transaction) {
   console.error('[NotifyVerifiedOperation] Transaction not found:', txError);
   return NextResponse.json(
    { error: 'Transaction not found' },
    { status: 404 }
   );
  }

  // Obtener usuarios operativos activos (NO SUPER_ADMIN) con whatsapp_number
  const { data: operativeUsers, error: usersError } = await supabase
   .from('profiles')
   .select('id, first_name, whatsapp_number, role')
   .in('role', ['ADMIN', 'CAJERO', 'SUPERVISOR'])
   .eq('is_active', true)
   .not('whatsapp_number', 'is', null);

  if (usersError) {
   console.error('[NotifyVerifiedOperation] Error fetching users:', usersError);
   return NextResponse.json(
    { error: 'Error fetching operative users' },
    { status: 500 }
   );
  }

  if (!operativeUsers || operativeUsers.length === 0) {
   console.log('[NotifyVerifiedOperation] No operative users with WhatsApp');
   return NextResponse.json({
    success: true,
    message: 'No operative users to notify',
    notified: 0,
   });
  }

  // Extraer datos de las relaciones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = transaction.user as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromCurrency = transaction.from_currency as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCurrency = transaction.to_currency as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beneficiary = transaction.user_bank_account as any;

  const clientName = user ? `${user.first_name} ${user.last_name}` : 'Cliente';
  const beneficiaryName = beneficiary?.account_holder || 'No especificado';
  const bankName = beneficiary?.bank?.name || beneficiary?.bank_name || 'No especificado';

  const fromSymbol = fromCurrency?.symbol || '$';
  const fromCode = fromCurrency?.code || 'USD';
  const toSymbol = toCurrency?.symbol || 'Bs';
  const toCode = toCurrency?.code || 'VES';

  // Construir mensaje de notificación
  const message =
   `✅ *Operación Verificada - Lista para Tomar*\n\n` +
   `📋 *Operación:* ${transaction.transaction_number}\n` +
   `👤 *Cliente:* ${clientName}\n\n` +
   `💵 *Envía:* ${fromSymbol}${transaction.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${fromCode}\n` +
   `💰 *Debe Recibir:* ${toSymbol}${transaction.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${toCode}\n\n` +
   `🏦 *Beneficiario:* ${beneficiaryName}\n` +
   `🏛️ *Banco:* ${bankName}\n\n` +
   `👉 *Tomar operación:* ${APP_URL}/panel/pool`;

  // Enviar notificación a cada usuario operativo
  const sendResults = await Promise.allSettled(
   operativeUsers.map(async (operativeUser) => {
    if (!operativeUser.whatsapp_number) return { success: false, userId: operativeUser.id };

    try {
     const result = await sendTextMessage(operativeUser.whatsapp_number, message);
     console.log(`[NotifyVerifiedOperation] Sent to ${operativeUser.first_name} (${operativeUser.role}):`, result.success);
     return { success: result.success, userId: operativeUser.id };
    } catch (error) {
     console.error(`[NotifyVerifiedOperation] Error sending to ${operativeUser.first_name}:`, error);
     return { success: false, userId: operativeUser.id };
    }
   })
  );

  const successCount = sendResults.filter(
   (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  console.log(`[NotifyVerifiedOperation] Notified ${successCount}/${operativeUsers.length} users`);

  return NextResponse.json({
   success: true,
   notified: successCount,
   total: operativeUsers.length,
  });

 } catch (error) {
  console.error('[NotifyVerifiedOperation] Exception:', error);
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}
