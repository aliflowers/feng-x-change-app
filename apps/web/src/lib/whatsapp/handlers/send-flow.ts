/**
 * Handlers para el flujo de envío de dinero
 * 
 * Flujo completo:
 * 1. Seleccionar moneda a enviar
 * 2. Seleccionar método de pago (cómo va a pagar)
 * 3. Seleccionar beneficiario (a quién envía) - SOLO si no viene preseleccionado
 * 4. Ingresar monto
 * 5. Confirmar operación
 * 6. Mostrar cuenta recaudadora de la empresa
 * 7. Recibir comprobante de pago
 * 8. Crear operación en el pool
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ChatSession } from '@/types/chat';
import { NAVIGATION_ACTIONS } from '@/types/chat';
import { transitionTo, resetSession } from '../session-manager';
import {
  sendListMessage,
  sendTextMessage,
  sendButtonMessage,
  sendMainMenu,
  sendCurrencySelector,
  sendConfirmation,
  sendOperationCreated
} from '../message-builder';

// ============================================================================
// MAPEO DE MONEDAS A BANDERAS
// ============================================================================

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  VES: '🇻🇪',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  PEN: '🇵🇪',
  PAB: '🇵🇦',
};

// ============================================================================
// PASO 1: SELECCIONAR MONEDA
// ============================================================================

export async function handleSendSelectCurrency(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendCurrencySelector(phoneNumber, {
    header: '💸 Hacer un Envío',
    body: 'Selecciona la moneda que vas a enviar:',
    includeBackButton: true,
  });

  await transitionTo(session.id, 'SEND_SELECT_CURRENCY');
}

// ============================================================================
// PASO 2: SELECCIONAR MÉTODO DE PAGO
// ============================================================================

export async function handleSendSelectMethod(
  session: ChatSession,
  phoneNumber: string,
  currencyCode: string
): Promise<void> {
  const supabase = createServerClient();

  // Obtener ID de la moneda
  const { data: currency } = await supabase
    .from('currencies')
    .select('id')
    .eq('code', currencyCode)
    .single();

  if (!currency) {
    await sendTextMessage(phoneNumber, 'Error: Moneda no encontrada.');
    return;
  }

  // Obtener métodos de pago disponibles para esta moneda
  // Estos son los banks_platforms de la EMPRESA donde el cliente puede pagar
  const { data: methods } = await supabase
    .from('banks_platforms')
    .select('id, name, type')
    .eq('currency_id', currency.id)
    .eq('is_active', true);

  if (!methods || methods.length === 0) {
    await sendTextMessage(
      phoneNumber,
      `No hay métodos de pago disponibles para ${currencyCode} en este momento.`
    );
    await handleSendSelectCurrency(session, phoneNumber);
    return;
  }

  // Construir opciones
  const options = methods.map(m => ({
    id: `method_${m.id}`,
    title: m.name,
    description: m.type || undefined,
  }));

  options.push({
    id: NAVIGATION_ACTIONS.MAIN_MENU,
    title: '🏠 Menú principal',
    description: 'Cancelar y volver',
  });

  await sendListMessage(phoneNumber, {
    header: 'Método de Pago',
    body: `¿Cómo vas a enviar los ${currencyCode}?`,
    buttonText: 'Seleccionar',
    sections: [{
      title: 'Métodos disponibles',
      rows: options,
    }],
  });

  await transitionTo(session.id, 'SEND_SELECT_METHOD', {
    selected_currency_from: currencyCode,
  });
}

// ============================================================================
// PASO 3: SELECCIONAR BENEFICIARIO (si no viene preseleccionado)
// ============================================================================

export async function handleSendSelectBeneficiary(
  session: ChatSession,
  phoneNumber: string,
  methodId: string,
  methodName: string
): Promise<void> {
  const supabase = createServerClient();
  const userId = session.user_id;

  if (!userId) {
    await sendTextMessage(phoneNumber, 'Error: Usuario no identificado.');
    return;
  }

  // Verificar si ya tiene beneficiario preseleccionado
  if (session.metadata.selected_beneficiary_id) {
    // Guardar método de pago en metadata antes de saltar
    await transitionTo(session.id, session.current_step, {
      selected_payment_method_id: methodId,
      selected_payment_method_name: methodName,
    });
    // Actualizar la sesión local con los nuevos datos
    session.metadata.selected_payment_method_id = methodId;
    session.metadata.selected_payment_method_name = methodName;
    // Saltar al paso de monto
    await handleSendInputAmount(session, phoneNumber);
    return;
  }

  // Obtener beneficiarios del usuario
  const { data: beneficiaries } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      alias,
      bank_name
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!beneficiaries || beneficiaries.length === 0) {
    await sendTextMessage(
      phoneNumber,
      '❌ No tienes beneficiarios registrados.\n\n' +
      'Para agregar beneficiarios, visita:\n' +
      '👉 https://fengxchange.com/app/beneficiarios'
    );
    await sendMainMenu(phoneNumber);
    await resetSession(session.id);
    return;
  }

  // Construir opciones
  const options = beneficiaries.map((b: any) => ({
    id: `benef_${b.id}`,
    title: (b.alias || b.account_holder || 'Sin nombre').slice(0, 24),
    description: b.bank_name || '',
  }));

  options.push({
    id: NAVIGATION_ACTIONS.MAIN_MENU,
    title: '🏠 Menú principal',
    description: 'Cancelar',
  });

  await sendListMessage(phoneNumber, {
    header: 'Seleccionar Beneficiario',
    body: '¿A quién le envías el dinero?',
    buttonText: 'Seleccionar',
    sections: [{
      title: 'Tus beneficiarios',
      rows: options,
    }],
  });

  await transitionTo(session.id, 'SEND_SELECT_BENEFICIARY', {
    selected_payment_method_id: methodId,
    selected_payment_method_name: methodName,
  });
}

// ============================================================================
// PASO 4: INGRESAR MONTO
// ============================================================================

export async function handleSendInputAmount(
  session: ChatSession,
  phoneNumber: string,
  beneficiaryId?: string,
  beneficiaryName?: string
): Promise<void> {
  const currencyFrom = session.metadata.selected_currency_from || 'USD';

  await sendTextMessage(
    phoneNumber,
    `💵 *Ingresa el monto a enviar*\n\n` +
    `Escribe la cantidad en ${currencyFrom} que deseas enviar.\n\n` +
    `Ejemplo: 100 o 100.50`
  );

  const updateData: any = {};
  if (beneficiaryId) {
    updateData.selected_beneficiary_id = beneficiaryId;
  }
  if (beneficiaryName) {
    updateData.selected_beneficiary_name = beneficiaryName;
  }

  await transitionTo(session.id, 'SEND_INPUT_AMOUNT', updateData);
}

// ============================================================================
// PASO 5: CALCULAR Y CONFIRMAR
// ============================================================================

export async function handleSendConfirm(
  session: ChatSession,
  phoneNumber: string,
  amount: number
): Promise<void> {
  const supabase = createServerClient();
  const metadata = session.metadata;

  // Obtener datos del beneficiario
  const { data: beneficiary } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      alias,
      bank_name,
      bank:banks(
        name,
        currency_code
      )
    `)
    .eq('id', metadata.selected_beneficiary_id)
    .single();

  if (!beneficiary) {
    await sendTextMessage(phoneNumber, 'Error: Beneficiario no encontrado.');
    return;
  }

  const currencyFrom = metadata.selected_currency_from || 'USD';
  const currencyTo = (beneficiary as any).bank?.currency_code || 'VES';

  // Obtener tasa de cambio
  const { data: currencies } = await supabase
    .from('currencies')
    .select('id, code')
    .in('code', [currencyFrom, currencyTo]);

  const fromId = currencies?.find(c => c.code === currencyFrom)?.id;
  const toId = currencies?.find(c => c.code === currencyTo)?.id;

  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency_id', fromId)
    .eq('to_currency_id', toId)
    .eq('is_active', true)
    .single();

  if (!rate) {
    await sendTextMessage(
      phoneNumber,
      `No hay tasa disponible para ${currencyFrom} a ${currencyTo}.`
    );
    return;
  }

  const amountReceived = amount * rate.rate;
  const benefName = (beneficiary as any).alias || (beneficiary as any).account_holder || 'Beneficiario';
  const bankName = (beneficiary as any).bank_name || '';

  // Enviar confirmación
  await sendConfirmation(phoneNumber, {
    amountSent: amount,
    currencyFrom,
    beneficiaryName: benefName,
    bankName,
    rate: rate.rate,
    amountReceived,
    currencyTo,
  });

  await transitionTo(session.id, 'SEND_CONFIRM', {
    amount_to_send: amount,
    calculated_rate: rate.rate,
    calculated_amount_received: amountReceived,
    selected_currency_to: currencyTo,
  });
}

// ============================================================================
// PASO 6: MOSTRAR CUENTA RECAUDADORA DE LA EMPRESA
// ============================================================================

export async function handleSendShowAccount(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  const supabase = createServerClient();
  const metadata = session.metadata;

  // Obtener la cuenta recaudadora (banks_platforms) según el método seleccionado
  const { data: account } = await supabase
    .from('banks_platforms')
    .select(`
      id,
      name,
      account_number,
      account_holder,
      type
    `)
    .eq('id', metadata.selected_payment_method_id)
    .eq('is_active', true)
    .single();

  if (!account) {
    await sendTextMessage(
      phoneNumber,
      'Error: No hay cuenta disponible para este método de pago.'
    );
    return;
  }

  const isZelle = account.name.toLowerCase().includes('zelle');
  const currencyFrom = metadata.selected_currency_from || 'USD';
  const flag = currencyFlags[currencyFrom] || '';

  // Construir mensaje con datos de la cuenta
  let accountMessage = `🏦 *Datos para tu pago*\n\n`;
  accountMessage += `💰 Monto a enviar: *${flag} ${metadata.amount_to_send?.toLocaleString()} ${currencyFrom}*\n\n`;
  accountMessage += `📋 *${account.name}*\n`;
  accountMessage += `• Titular: ${account.account_holder}\n`;
  accountMessage += `• Cuenta/Email: ${account.account_number}\n`;

  // Advertencia especial para Zelle
  if (isZelle) {
    accountMessage += `\n⚠️ *IMPORTANTE para Zelle:*\n`;
    accountMessage += `❌ NO coloques NADA en el área de CONCEPTO/MEMO\n`;
    accountMessage += `❌ Déjalo completamente vacío\n`;
    accountMessage += `⚠️ Si escribes algo, tu pago será REVERSADO`;
  }

  await sendButtonMessage(phoneNumber, {
    header: '💳 Realiza tu Pago',
    body: accountMessage,
    buttons: [
      { id: 'payment_done', title: '✅ Ya hice el pago' },
      { id: 'payment_back', title: '⬅️ Menú anterior' },
      { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú Principal' },
    ],
  });

  await transitionTo(session.id, 'SEND_SHOW_ACCOUNT', {
    company_account_id: account.id.toString(),
  });
}

// ============================================================================
// PASO 7: SOLICITAR COMPROBANTE
// ============================================================================

export async function handleSendUploadProof(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendTextMessage(
    phoneNumber,
    `📸 *Envía tu comprobante de pago*\n\n` +
    `Por favor, envía una imagen clara de la captura de pantalla de tu pago realizado.\n\n` +
    `Asegúrate de que se vea:\n` +
    `• El monto transferido\n` +
    `• La fecha y hora\n` +
    `• El número de referencia`
  );

  await transitionTo(session.id, 'SEND_UPLOAD_PROOF');
}

// ============================================================================
// PASO 8: PROCESAR COMPROBANTE Y CREAR OPERACIÓN
// ============================================================================

export async function handleProofReceived(
  session: ChatSession,
  phoneNumber: string,
  proofUrl: string,
  ocrData?: { amount?: number; reference?: string; date?: string; bank?: string }
): Promise<void> {
  const supabase = createServerClient();
  const metadata = session.metadata;

  try {


    // Obtener IDs de monedas
    const { data: currencies } = await supabase
      .from('currencies')
      .select('id, code')
      .in('code', [metadata.selected_currency_from, metadata.selected_currency_to]);

    const fromCurrencyId = currencies?.find(c => c.code === metadata.selected_currency_from)?.id;
    const toCurrencyId = currencies?.find(c => c.code === metadata.selected_currency_to)?.id;

    if (!fromCurrencyId || !toCurrencyId) {
      await sendTextMessage(phoneNumber, '❌ Error: No se pudieron identificar las monedas.');
      return;
    }

    // Preparar los datos del OCR
    let ocrNotes = null;
    if (ocrData && (ocrData.amount || ocrData.reference || ocrData.date || ocrData.bank)) {
      ocrNotes = JSON.stringify({
        amount: ocrData.amount,
        reference: ocrData.reference,
        date: ocrData.date,
        bank: ocrData.bank,
      });
    }

    // Crear la transacción en el pool
    const { data: newTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user_id,
        from_currency_id: fromCurrencyId,
        to_currency_id: toCurrencyId,
        amount_sent: metadata.amount_to_send,
        amount_received: metadata.calculated_amount_received,
        exchange_rate_applied: metadata.calculated_rate,
        user_bank_account_id: metadata.selected_beneficiary_id,
        bank_platform_id: parseInt(metadata.selected_payment_method_id || '0'),
        client_proof_url: proofUrl,
        status: 'POOL', // Va al pool de operaciones
        admin_notes: ocrNotes,
      })
      .select('id, transaction_number')
      .single();

    if (insertError || !newTransaction) {
      console.error('[SendFlow] Error creating transaction:', insertError);
      await sendTextMessage(
        phoneNumber,
        '❌ Hubo un error al registrar tu operación. Por favor intenta nuevamente.'
      );
      return;
    }

    // Notificar a usuarios internos que hay nueva operación en pool
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${appUrl}/api/whatsapp/notify-new-operation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: newTransaction.id }),
      });
      console.log('[SendFlow] Internal users notified of new operation');
    } catch (notifyError) {
      console.error('[SendFlow] Error notifying internal users:', notifyError);
      // No es crítico, la operación ya fue creada
    }

    // Obtener datos del beneficiario para el mensaje de confirmación
    const { data: beneficiary } = await supabase
      .from('user_bank_accounts')
      .select('account_holder, alias, bank:banks(name)')
      .eq('id', metadata.selected_beneficiary_id)
      .single();

    const benefName = beneficiary?.alias || beneficiary?.account_holder || 'tu beneficiario';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bankName = (beneficiary?.bank as any)?.name || 'No especificado';

    // Confirmar al usuario
    await sendOperationCreated(phoneNumber, newTransaction.transaction_number);

    // Mensaje adicional con resumen
    const currencyFrom = metadata.selected_currency_from || 'USD';
    const currencyTo = metadata.selected_currency_to || 'VES';
    const fromFlag = currencyFlags[currencyFrom] || '';
    const toFlag = currencyFlags[currencyTo] || '';

    await sendTextMessage(
      phoneNumber,
      `📋 *Resumen de tu operación:*\n\n` +
      `• Enviaste: ${fromFlag} ${metadata.amount_to_send?.toLocaleString()} ${currencyFrom}\n` +
      `• Recibirá: ${toFlag} ${metadata.calculated_amount_received?.toLocaleString()} ${currencyTo}\n` +
      `• Beneficiario: ${benefName}\n` +
      `• Banco: ${bankName}\n\n` +
      `Tu operación está en cola y será procesada a la brevedad. 🚀`
    );

    // Resetear sesión
    await resetSession(session.id);

  } catch (error) {
    console.error('[SendFlow] Error processing proof:', error);
    await sendTextMessage(
      phoneNumber,
      '❌ Error al procesar tu comprobante. Por favor intenta nuevamente.'
    );
  }
}
