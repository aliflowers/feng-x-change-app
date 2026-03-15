/**
 * Handlers para el flujo de Envío Múltiple
 * 
 * Permite al cliente agregar múltiples beneficiarios a una lista
 * antes de confirmar y realizar un solo pago.
 */

import { createClient } from '@supabase/supabase-js';
import type { ChatSession, SendListItem, SessionMetadata } from '@/types/chat';
import { transitionTo, updateSession } from '../session-manager';
import {
  sendListMessage,
  sendTextMessage,
  sendButtonMessage,
  sendProofRequest
} from '../message-builder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de banderas para monedas
const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  VES: '🇻🇪',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  PEN: '🇵🇪',
  EUR: '🇪🇺',
  ARS: '🇦🇷',
};

// Límites
const MAX_LIST_ITEMS = 5;

// ============================================================================
// CONSTANTES DE OPCIONES
// ============================================================================

export const SEND_TYPE_OPTIONS = {
  SINGLE: 'send_type_single',
  MULTIPLE: 'send_type_multiple',
};

// ============================================================================
// HANDLER: SELECCIÓN DE TIPO DE ENVÍO
// ============================================================================

/**
 * Muestra el menú para elegir entre envío individual o múltiple
 */
export async function handleSendSelectType(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendButtonMessage(phoneNumber, {
    header: '💸 Tipo de envío',
    body: '¿A cuántos beneficiarios deseas enviar?',
    buttons: [
      { id: SEND_TYPE_OPTIONS.SINGLE, title: '1️⃣ Un beneficiario' },
      { id: SEND_TYPE_OPTIONS.MULTIPLE, title: '👥 Varios beneficiarios' },
      { id: 'nav_main_menu', title: '🏠 Menú' },
    ],
  });

  await transitionTo(session.id, 'SEND_SELECT_TYPE');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - SELECCIÓN DE MONEDA
// ============================================================================

/**
 * Inicia el flujo múltiple mostrando selección de moneda
 */
export async function handleMultiSelectCurrency(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  // Limpiar lista anterior si existe
  await updateSession(session.id, {
    metadata: { send_list_items: [] }
  });

  // Obtener monedas disponibles
  const { data: currencies } = await supabase
    .from('currencies')
    .select('code, name, symbol')
    .eq('is_active', true)
    .order('code');

  if (!currencies || currencies.length === 0) {
    await sendTextMessage(phoneNumber, '❌ No hay monedas disponibles.');
    return;
  }

  const sections = [
    {
      title: 'Moneda a enviar',
      rows: currencies.slice(0, 9).map(c => ({
        id: `multi_currency_${c.code}`,
        title: `${currencyFlags[c.code] || ''} ${c.code}`,
        description: c.name,
      })),
    },
    {
      title: 'Navegación',
      rows: [
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    },
  ];

  await sendListMessage(phoneNumber, {
    body: '💱 *Envío Múltiple*\n\nSelecciona la moneda que enviarás:',
    buttonText: 'Ver monedas',
    sections,
  });

  await transitionTo(session.id, 'MULTI_SELECT_CURRENCY');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - SELECCIÓN DE MÉTODO
// ============================================================================

/**
 * Muestra métodos de pago disponibles para la moneda seleccionada
 */
export async function handleMultiSelectMethod(
  session: ChatSession,
  phoneNumber: string,
  currencyCode: string
): Promise<void> {
  // Guardar moneda seleccionada
  await updateSession(session.id, {
    metadata: { selected_currency_from: currencyCode }
  });

  // Obtener ID de la moneda
  const { data: currency } = await supabase
    .from('currencies')
    .select('id')
    .eq('code', currencyCode)
    .single();

  if (!currency) {
    await sendTextMessage(phoneNumber, '❌ Moneda no encontrada.');
    return;
  }

  // Obtener métodos de pago (cuentas de la empresa para esta moneda)
  const { data: methods } = await supabase
    .from('banks_platforms')
    .select('id, name, type')
    .eq('currency_id', currency.id)
    .eq('is_active', true);

  if (!methods || methods.length === 0) {
    await sendTextMessage(phoneNumber, `❌ No hay métodos de pago disponibles para ${currencyCode}.`);
    await handleMultiSelectCurrency(session, phoneNumber);
    return;
  }

  const sections = [
    {
      title: 'Métodos de pago',
      rows: methods.slice(0, 9).map(m => ({
        id: `multi_method_${m.id}`,
        title: m.name,
        description: m.type || undefined,
      })),
    },
    {
      title: 'Navegación',
      rows: [
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    },
  ];

  await sendListMessage(phoneNumber, {
    body: '💳 *Método de Pago*\n\nSelecciona cómo realizarás el pago:',
    buttonText: 'Ver métodos',
    sections,
  });

  await transitionTo(session.id, 'MULTI_SELECT_METHOD');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - AGREGAR BENEFICIARIO
// ============================================================================

/**
 * Muestra lista de beneficiarios para agregar a la lista
 */
export async function handleMultiSelectBeneficiary(
  session: ChatSession,
  phoneNumber: string,
  methodId: string,
  userId: string
): Promise<void> {
  // Guardar método seleccionado
  await updateSession(session.id, {
    metadata: { selected_payment_method_id: methodId }
  });

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
    .eq('is_active', true)
    .order('alias');

  if (!beneficiaries || beneficiaries.length === 0) {
    await sendButtonMessage(phoneNumber, {
      body: '👥 No tienes beneficiarios registrados.\n\nPuedes agregar beneficiarios desde la app web.',
      buttons: [
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = beneficiaries.slice(0, 9).map((b: any) => {
    const displayName = (b.alias || b.account_holder || 'Sin nombre').slice(0, 20);
    const bankName = b.bank_name || 'Banco';

    return {
      id: `multi_benef_${b.id}`,
      title: displayName,
      description: bankName,
    };
  });

  const sections = [
    {
      title: 'Beneficiarios',
      rows,
    },
    {
      title: 'Navegación',
      rows: [
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    },
  ];

  await sendListMessage(phoneNumber, {
    body: '👥 *Agregar beneficiario*\n\nSelecciona a quién enviar:',
    buttonText: 'Ver beneficiarios',
    sections,
  });

  await transitionTo(session.id, 'MULTI_SELECT_BENEFICIARY');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - INGRESAR MONTO
// ============================================================================

/**
 * Solicita el monto a enviar al beneficiario seleccionado
 */
export async function handleMultiInputAmount(
  session: ChatSession,
  phoneNumber: string,
  beneficiaryId: string
): Promise<void> {
  // Obtener datos del beneficiario
  const { data: beneficiary } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      alias,
      bank_name
    `)
    .eq('id', beneficiaryId)
    .single();

  if (!beneficiary) {
    await sendTextMessage(phoneNumber, '❌ Beneficiario no encontrado.');
    return;
  }

  const bankName = beneficiary.bank_name || 'Banco';
  const displayName = beneficiary.alias || beneficiary.account_holder;

  await updateSession(session.id, {
    metadata: {
      selected_beneficiary_id: beneficiaryId,
      selected_beneficiary_name: displayName,
    }
  });

  const metadata = session.metadata || {};
  const fromCurrency = metadata.selected_currency_from || 'USD';
  const flag = currencyFlags[fromCurrency] || '';

  await sendTextMessage(phoneNumber,
    `💰 *Monto para ${displayName}*\n` +
    `🏦 ${bankName}\n\n` +
    `Escribe el monto en ${flag} ${fromCurrency} que deseas enviar:\n\n` +
    `_Ejemplo: 100_`
  );

  await transitionTo(session.id, 'MULTI_INPUT_AMOUNT');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - AGREGAR A LISTA
// ============================================================================

/**
 * Agrega el beneficiario con monto a la lista de envíos
 */
export async function handleMultiAddToList(
  session: ChatSession,
  phoneNumber: string,
  amount: number,
  userId: string
): Promise<void> {
  const metadata = session.metadata || {};
  const beneficiaryId = metadata.selected_beneficiary_id;
  const beneficiaryName = metadata.selected_beneficiary_name || 'Beneficiario';
  const fromCurrency = metadata.selected_currency_from || 'USD';

  // Obtener tasa actual
  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('rate, to_currency:currencies!exchange_rates_to_currency_id_fkey(code)')
    .eq('from_currency_id', (await getCurrencyId(fromCurrency)))
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!rate) {
    await sendTextMessage(phoneNumber, '❌ No hay tasa disponible para esta moneda.');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCurrency = (rate.to_currency as any)?.code || 'VES';
  const amountReceive = amount * rate.rate;

  // Obtener banco del beneficiario
  const { data: beneficiary } = await supabase
    .from('user_bank_accounts')
    .select('bank_name')
    .eq('id', beneficiaryId)
    .single();

  const bankName = beneficiary?.bank_name || 'Banco';

  // Obtener lista actual
  const currentList: SendListItem[] = metadata.send_list_items || [];

  // Verificar límite
  if (currentList.length >= MAX_LIST_ITEMS) {
    await sendTextMessage(phoneNumber,
      `⚠️ Máximo ${MAX_LIST_ITEMS} beneficiarios por lista.\n\n` +
      `Confirma la lista actual o quita algún envío.`
    );
    await showMultiListView(session, phoneNumber, userId);
    return;
  }

  // Agregar nuevo item
  const newItem: SendListItem = {
    beneficiary_id: beneficiaryId!,
    beneficiary_name: beneficiaryName,
    bank_name: bankName,
    amount_send: amount,
    amount_receive: amountReceive,
    rate: rate.rate,
  };

  const updatedList = [...currentList, newItem];

  await updateSession(session.id, {
    metadata: {
      send_list_items: updatedList,
      selected_currency_to: toCurrency,
    }
  });

  // Mostrar lista actualizada
  await showMultiListView(session, phoneNumber, userId);
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - VER LISTA
// ============================================================================

/**
 * Muestra la lista actual de envíos
 */
export async function showMultiListView(
  session: ChatSession,
  phoneNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  // Obtener sesión fresca desde DB para tener metadata actualizada
  const { data: freshSession } = await supabase
    .from('chat_sessions')
    .select('metadata')
    .eq('id', session.id)
    .single();

  const metadata = (freshSession?.metadata || {}) as SessionMetadata;
  const items: SendListItem[] = metadata.send_list_items || [];
  const fromCurrency = metadata.selected_currency_from || 'USD';
  const toCurrency = metadata.selected_currency_to || 'VES';

  if (items.length === 0) {
    await sendTextMessage(phoneNumber, '📋 Tu lista de envíos está vacía.');
    return;
  }

  const fromFlag = currencyFlags[fromCurrency] || '';
  const toFlag = currencyFlags[toCurrency] || '';

  // Calcular totales
  const totalSend = items.reduce((sum, item) => sum + item.amount_send, 0);
  const totalReceive = items.reduce((sum, item) => sum + item.amount_receive, 0);

  // Construir mensaje
  let message = `📋 *Tu lista de envíos*\n\n`;

  items.forEach((item, index) => {
    message += `${index + 1}. ${fromFlag} $${item.amount_send.toLocaleString('es-VE')} → ${item.beneficiary_name}\n`;
    message += `   🏦 ${item.bank_name}\n`;
    message += `   💰 Recibirá: ${toFlag} ${item.amount_receive.toLocaleString('es-VE')}\n\n`;
  });

  message += `──────────────\n`;
  message += `📊 *Total:* ${fromFlag} $${totalSend.toLocaleString('es-VE')} → ${toFlag} ${totalReceive.toLocaleString('es-VE')}`;

  await sendButtonMessage(phoneNumber, {
    body: message,
    buttons: [
      { id: 'multi_add_another', title: '➕ Agregar otro' },
      { id: 'multi_confirm', title: '✅ Confirmar' },
      { id: 'multi_remove_last', title: '🗑️ Quitar último' },
    ],
  });

  await transitionTo(session.id, 'MULTI_LIST_VIEW');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - QUITAR ÚLTIMO
// ============================================================================

/**
 * Quita el último item de la lista
 */
export async function handleMultiRemoveLast(
  session: ChatSession,
  phoneNumber: string,
  userId: string
): Promise<void> {
  const metadata = session.metadata || {};
  const items: SendListItem[] = metadata.send_list_items || [];

  if (items.length === 0) {
    await sendTextMessage(phoneNumber, '📋 La lista ya está vacía.');
    await handleSendSelectType(session, phoneNumber);
    return;
  }

  const removedItem = items.pop();

  await updateSession(session.id, {
    metadata: { send_list_items: items }
  });

  await sendTextMessage(phoneNumber,
    `🗑️ Eliminado: ${removedItem?.beneficiary_name}`
  );

  if (items.length === 0) {
    await sendButtonMessage(phoneNumber, {
      body: '📋 Tu lista está vacía.\n\n¿Deseas agregar un beneficiario?',
      buttons: [
        { id: 'multi_add_another', title: '➕ Agregar' },
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    });
    await transitionTo(session.id, 'MULTI_LIST_VIEW');
  } else {
    await showMultiListView(session, phoneNumber, userId);
  }
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - CONFIRMAR Y MOSTRAR CUENTA
// ============================================================================

/**
 * Muestra la cuenta de la empresa para pago total
 */
export async function handleMultiShowAccount(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  // Obtener sesión fresca desde DB
  const { data: freshSession } = await supabase
    .from('chat_sessions')
    .select('metadata')
    .eq('id', session.id)
    .single();

  const metadata = (freshSession?.metadata || {}) as SessionMetadata;
  const items: SendListItem[] = metadata.send_list_items || [];
  const fromCurrency = metadata.selected_currency_from || 'USD';
  const methodId = metadata.selected_payment_method_id;

  if (items.length === 0) {
    await sendTextMessage(phoneNumber, '❌ No hay envíos en tu lista.');
    return;
  }

  // methodId es el ID de banks_platforms (la cuenta de la empresa)
  const { data: account } = await supabase
    .from('banks_platforms')
    .select('*')
    .eq('id', methodId)
    .eq('is_active', true)
    .single();

  if (!account) {
    await sendTextMessage(phoneNumber,
      '⚠️ No hay cuenta disponible para este método.\n\n' +
      'Por favor contacta soporte.'
    );
    return;
  }

  const totalSend = items.reduce((sum, item) => sum + item.amount_send, 0);
  const fromFlag = currencyFlags[fromCurrency] || '';

  let accountMessage = `💳 *Realiza tu pago*\n\n`;
  accountMessage += `📊 *Total a pagar:* ${fromFlag} $${totalSend.toLocaleString('es-VE')} ${fromCurrency}\n`;
  accountMessage += `👥 *Beneficiarios:* ${items.length}\n\n`;
  accountMessage += `──────────────\n`;
  accountMessage += `🏦 *${account.bank_name}*\n`;
  accountMessage += `📝 *Titular:* ${account.account_holder}\n`;
  accountMessage += `🔢 *Cuenta:* ${account.account_number}\n`;
  if (account.account_type) {
    accountMessage += `📋 *Tipo:* ${account.account_type}\n`;
  }
  accountMessage += `\n⚠️ *Importante:*\n`;
  accountMessage += `- Transfiere exactamente ${fromFlag} $${totalSend.toLocaleString('es-VE')}\n`;
  accountMessage += `- NO escribas nada en el concepto`;

  await sendButtonMessage(phoneNumber, {
    header: '💳 Datos para Pago',
    body: accountMessage,
    buttons: [
      { id: 'multi_payment_done', title: '✅ Ya pagué' },
      { id: 'multi_cancel', title: '❌ Cancelar' },
      { id: 'nav_main_menu', title: '🏠 Menú' },
    ],
  });

  await updateSession(session.id, {
    metadata: { company_account_id: account.id.toString() }
  });

  await transitionTo(session.id, 'MULTI_SHOW_ACCOUNT');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - SUBIR COMPROBANTE
// ============================================================================

/**
 * Solicita el comprobante de pago
 */
export async function handleMultiUploadProof(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendProofRequest(phoneNumber);
  await transitionTo(session.id, 'MULTI_UPLOAD_PROOF');
}

// ============================================================================
// HANDLER: FLUJO MÚLTIPLE - CREAR TRANSACCIONES
// ============================================================================

/**
 * Procesa el comprobante y crea las transacciones
 */
export async function handleMultiCreateTransactions(
  session: ChatSession,
  phoneNumber: string,
  proofUrl: string,
  userId: string
): Promise<{ success: boolean; transactionNumbers: string[] }> {
  // Obtener sesión fresca desde DB para tener metadata actualizada
  const { data: freshSession } = await supabase
    .from('chat_sessions')
    .select('metadata')
    .eq('id', session.id)
    .single();

  const metadata = (freshSession?.metadata || {}) as SessionMetadata;
  const items: SendListItem[] = metadata.send_list_items || [];
  const fromCurrency = metadata.selected_currency_from || 'USD';
  const toCurrency = metadata.selected_currency_to || 'VES';

  console.log('[Multi] handleMultiCreateTransactions - Items:', items.length, 'proofUrl:', proofUrl?.slice(0, 50));

  if (items.length === 0) {
    console.log('[Multi] No hay items en send_list_items');
    return { success: false, transactionNumbers: [] };
  }

  // Obtener IDs de monedas
  const fromCurrencyId = await getCurrencyId(fromCurrency);
  const toCurrencyId = await getCurrencyId(toCurrency);

  // Generar batch_id para agrupar transacciones
  const batchId = crypto.randomUUID();
  const transactionNumbers: string[] = [];

  // Crear transacciones
  for (const item of items) {


    console.log('[Multi] Insertando transacción:', {
      userId,
      fromCurrencyId,
      toCurrencyId,
      amount_sent: item.amount_send,
      amount_received: item.amount_receive,
      exchange_rate_applied: item.rate,
      beneficiary_id: item.beneficiary_id,
    });

    const { data: insertedTransaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        from_currency_id: fromCurrencyId,
        to_currency_id: toCurrencyId,
        amount_sent: item.amount_send,
        amount_received: item.amount_receive,
        exchange_rate_applied: item.rate, // Corregido: era exchange_rate
        status: 'POOL',
        user_bank_account_id: item.beneficiary_id,
        client_proof_url: proofUrl, // Corregido: era proof_url
        admin_notes: `Batch: ${batchId} (${items.length} envíos)`, // Corregido: era notes
      })
      .select('transaction_number')
      .single();

    if (error) {
      console.error('[Multi] Error insertando transacción:', error.message, error.details);
    } else if (insertedTransaction) {
      console.log('[Multi] Transacción creada:', insertedTransaction.transaction_number);
      transactionNumbers.push(insertedTransaction.transaction_number);
    }
  }

  // Limpiar lista
  await updateSession(session.id, {
    metadata: { send_list_items: [] }
  });

  // Enviar confirmación
  const totalSend = items.reduce((sum, item) => sum + item.amount_send, 0);
  const totalReceive = items.reduce((sum, item) => sum + item.amount_receive, 0);
  const fromFlag = currencyFlags[fromCurrency] || '';
  const toFlag = currencyFlags[toCurrency] || '';

  let message = `✅ *¡Operaciones registradas!*\n\n`;
  message += `📋 *${transactionNumbers.length} envíos creados:*\n`;
  transactionNumbers.forEach((num, i) => {
    message += `${i + 1}. ${num} → ${items[i].beneficiary_name}\n`;
  });
  message += `\n📊 *Total:* ${fromFlag} $${totalSend.toLocaleString('es-VE')} → ${toFlag} ${totalReceive.toLocaleString('es-VE')}\n\n`;
  message += `⏳ Tus operaciones están en cola y serán procesadas a la brevedad.`;

  await sendButtonMessage(phoneNumber, {
    body: message,
    buttons: [
      { id: 'menu_send', title: '💸 Nuevo envío' },
      { id: 'nav_main_menu', title: '🏠 Menú principal' },
    ],
  });

  await transitionTo(session.id, 'COMPLETED');

  return { success: true, transactionNumbers };
}

// ============================================================================
// UTILIDADES
// ============================================================================

async function getCurrencyId(code: string): Promise<string> {
  const { data } = await supabase
    .from('currencies')
    .select('id')
    .eq('code', code)
    .single();
  return data?.id || '';
}
