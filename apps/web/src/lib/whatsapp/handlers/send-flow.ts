/**
 * Handlers para el flujo de envío de dinero
 * 
 * Flujo completo:
 * 1. Seleccionar moneda a enviar
 * 2. Seleccionar método de pago
 * 3. Seleccionar beneficiario
 * 4. Ingresar monto
 * 5. Confirmar operación
 * 6. Mostrar cuenta de empresa
 * 7. Recibir comprobante
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ChatSession } from '@/types/chat';
import { NAVIGATION_ACTIONS } from '@/types/chat';
import { transitionTo, resetSession } from '../session-manager';
import {
  sendCurrencySelector,
  sendListMessage,
  sendTextMessage,
  sendConfirmation,
  sendCompanyAccount,
  sendProofRequest,
  sendOperationCreated,
  sendMainMenu
} from '../message-builder';

// ============================================================================
// PASO 1: SELECCIONAR MONEDA A ENVIAR
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
// PASO 3: SELECCIONAR BENEFICIARIO
// ============================================================================

export async function handleSendSelectBeneficiary(
  session: ChatSession,
  phoneNumber: string,
  methodId: string,
  methodName: string
): Promise<void> {
  const supabase = createServerClient();

  // Obtener beneficiarios del usuario
  const userId = session.user_id;

  if (!userId) {
    await sendTextMessage(phoneNumber, 'Error: Usuario no identificado.');
    return;
  }

  const { data: beneficiaries } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder_name,
      bank_name,
      currency:currencies(code)
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

  // Construir opciones con NOMBRE COMPLETO (no alias)
  const options = beneficiaries.map((b: any) => ({
    id: `benef_${b.id}`,
    title: b.account_holder_name.slice(0, 24), // Límite WhatsApp
    description: `${b.bank_name} - ${b.currency?.code || ''}`,
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
  beneficiaryId: string,
  beneficiaryName: string
): Promise<void> {
  const currencyFrom = session.metadata.selected_currency_from || 'USD';

  await sendTextMessage(
    phoneNumber,
    `💵 *Ingresa el monto a enviar*\n\n` +
    `Escribe la cantidad en ${currencyFrom} que deseas enviar.\n\n` +
    `Ejemplo: 100 o 100.50`
  );

  await transitionTo(session.id, 'SEND_INPUT_AMOUNT', {
    selected_beneficiary_id: beneficiaryId,
    selected_beneficiary_name: beneficiaryName,
  });
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
      account_holder_name,
      bank_name,
      currency:currencies(code)
    `)
    .eq('id', metadata.selected_beneficiary_id)
    .single();

  if (!beneficiary) {
    await sendTextMessage(phoneNumber, 'Error: Beneficiario no encontrado.');
    return;
  }

  const currencyFrom = metadata.selected_currency_from || 'USD';
  const currencyTo = (beneficiary.currency as any)?.code || 'VES';

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
      `No hay tasa disponible para ${currencyFrom} → ${currencyTo}.`
    );
    return;
  }

  const amountReceived = amount * rate.rate;

  // Enviar confirmación
  await sendConfirmation(phoneNumber, {
    amountSent: amount,
    currencyFrom,
    beneficiaryName: beneficiary.account_holder_name,
    bankName: beneficiary.bank_name,
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
// PASO 6: MOSTRAR CUENTA DE EMPRESA
// ============================================================================

export async function handleSendShowAccount(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  const supabase = createServerClient();
  const metadata = session.metadata;

  // Obtener cuenta de la empresa para el método de pago seleccionado
  const { data: account } = await supabase
    .from('company_accounts')
    .select(`
      id,
      account_number,
      account_holder,
      bank:banks_platforms(name)
    `)
    .eq('bank_platform_id', metadata.selected_payment_method_id)
    .eq('is_active', true)
    .single();

  if (!account) {
    await sendTextMessage(
      phoneNumber,
      'Error: No hay cuenta disponible para este método de pago.'
    );
    return;
  }

  await sendCompanyAccount(phoneNumber, {
    amount: metadata.amount_to_send || 0,
    currency: metadata.selected_currency_from || 'USD',
    methodName: metadata.selected_payment_method_name || '',
    accountDetails: account.account_number,
    holderName: account.account_holder,
  });

  await transitionTo(session.id, 'SEND_SHOW_ACCOUNT', {
    company_account_id: account.id,
  });
}

// ============================================================================
// PASO 7: PROCESAR COMPROBANTE
// ============================================================================

export async function handleSendUploadProof(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendProofRequest(phoneNumber);
  await transitionTo(session.id, 'SEND_UPLOAD_PROOF');
}

/**
 * Procesa la imagen del comprobante y crea la operación
 */
export async function handleProofReceived(
  session: ChatSession,
  phoneNumber: string,
  proofUrl: string,
  _ocrData?: { amount?: number; reference?: string; date?: string }
): Promise<void> {
  const supabase = createServerClient();
  const metadata = session.metadata;

  try {
    // Generar número de transacción único
    const transactionNumber = `FX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Obtener IDs necesarios
    const { data: currencies } = await supabase
      .from('currencies')
      .select('id, code')
      .in('code', [metadata.selected_currency_from, metadata.selected_currency_to]);

    const fromCurrencyId = currencies?.find(c => c.code === metadata.selected_currency_from)?.id;
    const toCurrencyId = currencies?.find(c => c.code === metadata.selected_currency_to)?.id;

    // Crear la transacción en el pool
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        transaction_number: transactionNumber,
        user_id: session.user_id,
        from_currency_id: fromCurrencyId,
        to_currency_id: toCurrencyId,
        amount_sent: metadata.amount_to_send,
        amount_received: metadata.calculated_amount_received,
        exchange_rate: metadata.calculated_rate,
        beneficiary_account_id: metadata.selected_beneficiary_id,
        payment_method_id: metadata.selected_payment_method_id,
        client_payment_proof_url: proofUrl,
        status: 'pending',
        source: 'whatsapp',
      });

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      await sendTextMessage(
        phoneNumber,
        '❌ Hubo un error al registrar tu operación. Por favor intenta nuevamente.'
      );
      return;
    }

    // Confirmar al usuario
    await sendOperationCreated(phoneNumber, transactionNumber);

    // Resetear sesión
    await resetSession(session.id);

  } catch (error) {
    console.error('Error processing proof:', error);
    await sendTextMessage(
      phoneNumber,
      '❌ Error al procesar tu comprobante. Por favor intenta nuevamente.'
    );
  }
}
