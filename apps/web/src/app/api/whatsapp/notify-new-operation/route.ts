'use server';

/**
 * API Route: /api/whatsapp/notify-new-operation
 * 
 * Envía notificación vía WhatsApp a todos los usuarios internos activos
 * cuando una nueva operación ingresa al pool
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/whatsapp';

interface NotifyNewOperationRequest {
 transactionId: string;
}

// URL base de la aplicación
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fengxchange.com';

export async function POST(request: NextRequest) {
 try {
  const body: NotifyNewOperationRequest = await request.json();
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
          bank:banks(name),
          banks_platforms(name)
        )
      `)
   .eq('id', transactionId)
   .single();

  if (txError || !transaction) {
   console.error('[NotifyNewOperation] Transaction not found:', txError);
   return NextResponse.json(
    { error: 'Transaction not found' },
    { status: 404 }
   );
  }

  // Obtener usuarios internos activos con whatsapp_number
  const { data: internalUsers, error: usersError } = await supabase
   .from('profiles')
   .select('id, first_name, whatsapp_number, role')
   .in('role', ['SUPER_ADMIN', 'ADMIN', 'CAJERO', 'SUPERVISOR'])
   .eq('is_active', true)
   .not('whatsapp_number', 'is', null);

  if (usersError) {
   console.error('[NotifyNewOperation] Error fetching users:', usersError);
   return NextResponse.json(
    { error: 'Error fetching internal users' },
    { status: 500 }
   );
  }

  if (!internalUsers || internalUsers.length === 0) {
   console.log('[NotifyNewOperation] No internal users with WhatsApp');
   return NextResponse.json({
    success: true,
    message: 'No internal users to notify',
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
  // Usar la misma lógica que la UI: bank (tabla banks) primero, luego banks_platforms como fallback
  const bankName = beneficiary?.bank?.name || beneficiary?.banks_platforms?.name || beneficiary?.bank_name || 'No especificado';

  const fromSymbol = fromCurrency?.symbol || '$';
  const fromCode = fromCurrency?.code || 'USD';
  const toSymbol = toCurrency?.symbol || 'Bs';
  const toCode = toCurrency?.code || 'VES';

  // Construir mensaje de notificación para usuarios operativos (ADMIN, CAJERO, SUPERVISOR)
  const operativeMessage =
   `🔔 *Nueva Operación en Pool*\n\n` +
   `📋 *Operación:* ${transaction.transaction_number}\n` +
   `👤 *Cliente:* ${clientName}\n\n` +
   `💵 *Envía:* ${fromSymbol}${transaction.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${fromCode}\n` +
   `💰 *Recibe:* ${toSymbol}${transaction.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${toCode}\n\n` +
   `🏦 *Beneficiario:* ${beneficiaryName}\n` +
   `🏛️ *Banco:* ${bankName}\n\n` +
   `👉 *Ver en Pool:* ${APP_URL}/panel/pool`;

  // Construir mensaje específico para SUPER_ADMIN (verificación pendiente)
  const superAdminMessage =
   `⚠️ *Operación Pendiente de Verificar*\n\n` +
   `Se ha registrado una nueva operación que requiere tu verificación:\n\n` +
   `📋 *Operación:* ${transaction.transaction_number}\n` +
   `👤 *Cliente:* ${clientName}\n\n` +
   `💵 *Envía:* ${fromSymbol}${transaction.amount_sent.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${fromCode}\n` +
   `💰 *Recibe:* ${toSymbol}${transaction.amount_received.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${toCode}\n\n` +
   `🏦 *Beneficiario:* ${beneficiaryName}\n` +
   `🏛️ *Banco:* ${bankName}\n\n` +
   `🔍 *Por favor verifica esta operación en el Pool:*\n${APP_URL}/panel/pool`;

  // Enviar notificación a cada usuario interno
  const sendResults = await Promise.allSettled(
   internalUsers.map(async (internalUser) => {
    if (!internalUser.whatsapp_number) return { success: false, userId: internalUser.id };

    // Usar mensaje específico según el rol
    const message = internalUser.role === 'SUPER_ADMIN' ? superAdminMessage : operativeMessage;

    try {
     const result = await sendTextMessage(internalUser.whatsapp_number, message);
     console.log(`[NotifyNewOperation] Sent to ${internalUser.first_name} (${internalUser.role}):`, result.success);
     return { success: result.success, userId: internalUser.id };
    } catch (error) {
     console.error(`[NotifyNewOperation] Error sending to ${internalUser.first_name}:`, error);
     return { success: false, userId: internalUser.id };
    }
   })
  );

  const successCount = sendResults.filter(
   (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  console.log(`[NotifyNewOperation] Notified ${successCount}/${internalUsers.length} users`);

  return NextResponse.json({
   success: true,
   notified: successCount,
   total: internalUsers.length,
  });

 } catch (error) {
  console.error('[NotifyNewOperation] Exception:', error);
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}
