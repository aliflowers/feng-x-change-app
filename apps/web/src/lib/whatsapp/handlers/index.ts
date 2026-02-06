/**
 * Dispatcher Principal - Orquesta el flujo según el estado actual
 * 
 * Este es el cerebro del bot: recibe el mensaje y decide qué handler ejecutar
 * basándose en el current_step de la sesión.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ChatSession, ConversationStep } from '@/types/chat';
import { NAVIGATION_ACTIONS } from '@/types/chat';
import {
  getOrCreateSession,
  transitionTo,
  resetSession
} from '../session-manager';
import { sendTextMessage, sendMainMenu } from '../message-builder';
import {
  checkSessionTimeout,
  sendSessionExpiredMessage,
  detectTextCommand,
  sendHelpMessage
} from '../navigation-utils';

// Handlers
import {
  handleIdleState,
  handleMainMenuSelection,
  handleNavigationAction
} from './main-menu';
import {
  handleRatesSelectCurrency,
  handleRatesCurrencySelected,
  handleRatesShowRate
} from './rates-flow';
import {
  handleSendSelectCurrency,
  handleSendSelectMethod,
  handleSendSelectBeneficiary,
  handleSendInputAmount,
  handleSendConfirm,
  handleSendShowAccount,
  handleSendUploadProof,
  handleProofReceived
} from './send-flow';
import {
  handleBeneficiariesList,
  handleBeneficiaryDetail
} from './beneficiaries-flow';
import {
  handleHistorySelectStatus,
  handleHistoryStatusSelection,
  handleHistoryPeriodSelection,
  HISTORY_STATUS_OPTIONS,
  HISTORY_PERIOD_OPTIONS
} from './history-flow';
import { handleProfileShow } from './profile-flow';
import {
  handleSendSelectType,
  handleMultiSelectCurrency,
  handleMultiSelectMethod,
  handleMultiSelectBeneficiary,
  handleMultiInputAmount,
  handleMultiAddToList,
  showMultiListView,
  handleMultiRemoveLast,
  handleMultiShowAccount,
  handleMultiUploadProof,
  handleMultiCreateTransactions,
  SEND_TYPE_OPTIONS
} from './multi-send-flow';

// ============================================================================
// TIPOS DE MENSAJE ENTRANTES
// ============================================================================

export interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | 'audio' | 'video';
  text?: { body: string };
  interactive?: {
    type: 'list_reply' | 'button_reply';
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
  image?: { id: string; mime_type: string };
}

// ============================================================================
// DISPATCHER PRINCIPAL
// ============================================================================

/**
 * Procesa un mensaje entrante y lo despacha al handler correcto
 */
export async function dispatchMessage(
  message: IncomingMessage,
  _phoneNumberId: string
): Promise<void> {
  const phoneNumber = message.from;

  try {
    // 1. Obtener o crear sesión (también verifica si está registrado)
    const { session, isRegistered, userName, userRole } = await getOrCreateSession(phoneNumber);

    console.log('[Dispatcher] Session state:', {
      phoneNumber,
      isRegistered,
      currentStep: session.current_step,
      userName,
      userRole,
    });

    // 2. Verificar si es usuario interno (solo clientes usan el bot de WhatsApp)
    // Los usuarios internos (ADMIN, CAJERO, SUPERVISOR, SUPER_ADMIN) no deben usar el flujo del bot
    const INTERNAL_ROLES = ['ADMIN', 'CAJERO', 'SUPERVISOR', 'SUPER_ADMIN'];
    if (userRole && INTERNAL_ROLES.includes(userRole)) {
      console.log('[Dispatcher] Ignoring message from internal user:', { phoneNumber, userRole });
      // No enviar mensaje para no confundir, simplemente ignorar
      return;
    }

    // 3. Verificar timeout de sesión (24h sin actividad)
    if (session.last_message_at) {
      const expired = await checkSessionTimeout(session.id, session.last_message_at);
      if (expired) {
        await sendSessionExpiredMessage(phoneNumber, userName);
        return;
      }
    }

    // 3. Detectar comandos de texto especiales (menú, cancelar, ayuda)
    if (message.type === 'text' && message.text?.body) {
      const command = detectTextCommand(message.text.body);

      if (command === 'menu') {
        await resetSession(session.id);
        await sendMainMenu(phoneNumber, userName);
        return;
      }

      if (command === 'cancel') {
        await resetSession(session.id);
        await sendTextMessage(phoneNumber, '❌ Operación cancelada.');
        await sendMainMenu(phoneNumber, userName);
        return;
      }

      if (command === 'help') {
        await sendHelpMessage(phoneNumber);
        return;
      }
    }

    // 4. Verificar acciones de navegación global (botones)
    const actionId = extractActionId(message);
    if (actionId) {
      const handled = await handleNavigationAction(session, phoneNumber, actionId, userName);
      if (handled) return;
    }

    // 5. Despachar según el estado actual
    await routeByCurrentStep(session, message, phoneNumber, isRegistered, userName);

  } catch (error) {
    console.error('[Dispatcher] Error:', error);
    await sendTextMessage(
      phoneNumber,
      '❌ Ocurrió un error. Por favor, intenta nuevamente.'
    );
  }
}

// ============================================================================
// ROUTER POR ESTADO
// ============================================================================

async function routeByCurrentStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  isRegistered: boolean,
  userName?: string
): Promise<void> {
  const step = session.current_step as ConversationStep;

  switch (step) {
    // =========================================================================
    // ESTADOS BASE
    // =========================================================================
    case 'IDLE':
      await handleIdleState(session, phoneNumber, isRegistered, userName);
      break;

    case 'MAIN_MENU':
      await handleMainMenuStep(session, message, phoneNumber, userName);
      break;

    // =========================================================================
    // FLUJO: CONSULTAR TASAS
    // =========================================================================
    case 'RATES_SELECT_CURRENCY':
      await handleRatesSelectCurrencyStep(session, message, phoneNumber);
      break;

    case 'RATES_SELECT_PAIR':
      await handleRatesSelectPairStep(session, message, phoneNumber);
      break;

    case 'RATES_SHOW':
      await handleRatesShowStep(session, message, phoneNumber, userName);
      break;

    // =========================================================================
    // FLUJO: HACER ENVÍO
    // =========================================================================
    case 'SEND_SELECT_CURRENCY':
      await handleSendSelectCurrencyStep(session, message, phoneNumber);
      break;

    case 'SEND_SELECT_METHOD':
      await handleSendSelectMethodStep(session, message, phoneNumber);
      break;

    case 'SEND_SELECT_BENEFICIARY':
      await handleSendSelectBeneficiaryStep(session, message, phoneNumber);
      break;

    case 'SEND_INPUT_AMOUNT':
      await handleSendInputAmountStep(session, message, phoneNumber);
      break;

    case 'SEND_CONFIRM':
      await handleSendConfirmStep(session, message, phoneNumber, userName);
      break;

    case 'SEND_SHOW_ACCOUNT':
      await handleSendShowAccountStep(session, message, phoneNumber, userName);
      break;

    case 'SEND_UPLOAD_PROOF':
      await handleSendUploadProofStep(session, message, phoneNumber);
      break;

    // =========================================================================
    // FLUJO: MIS BENEFICIARIOS
    // =========================================================================
    case 'BENEFICIARIES_LIST':
      await handleBeneficiariesListStep(session, message, phoneNumber);
      break;

    case 'BENEFICIARIES_EMPTY':
      await handleBeneficiariesEmptyStep(session, message, phoneNumber, userName);
      break;

    case 'BENEFICIARIES_DETAIL':
      await handleBeneficiariesDetailStep(session, message, phoneNumber, userName);
      break;

    // =========================================================================
    // FLUJO: MIS OPERACIONES (HISTORIAL)
    // =========================================================================
    case 'HISTORY_SELECT_STATUS':
      await handleHistorySelectStatusStep(session, message, phoneNumber);
      break;

    case 'HISTORY_SELECT_PERIOD':
      await handleHistorySelectPeriodStep(session, message, phoneNumber);
      break;

    case 'HISTORY_SHOW_RESULTS':
      await handleHistoryShowResultsStep(session, message, phoneNumber, userName);
      break;

    // =========================================================================
    // FLUJO: MIS DATOS (PERFIL)
    // =========================================================================
    case 'PROFILE_SHOW':
      await handleProfileShowStep(session, message, phoneNumber, userName);
      break;

    // =========================================================================
    // FLUJO: ENVÍO MÚLTIPLE
    // =========================================================================
    case 'SEND_SELECT_TYPE':
      await handleSendSelectTypeStep(session, message, phoneNumber);
      break;

    case 'MULTI_SELECT_CURRENCY':
      await handleMultiSelectCurrencyStep(session, message, phoneNumber);
      break;

    case 'MULTI_SELECT_METHOD':
      await handleMultiSelectMethodStep(session, message, phoneNumber);
      break;

    case 'MULTI_SELECT_BENEFICIARY':
      await handleMultiSelectBeneficiaryStep(session, message, phoneNumber);
      break;

    case 'MULTI_INPUT_AMOUNT':
      await handleMultiInputAmountStep(session, message, phoneNumber);
      break;

    case 'MULTI_LIST_VIEW':
      await handleMultiListViewStep(session, message, phoneNumber);
      break;

    case 'MULTI_SHOW_ACCOUNT':
      await handleMultiShowAccountStep(session, message, phoneNumber);
      break;

    case 'MULTI_UPLOAD_PROOF':
      await handleMultiUploadProofStep(session, message, phoneNumber);
      break;

    // =========================================================================
    // DEFAULT
    // =========================================================================
    default:
      console.warn('[Dispatcher] Unknown step:', step);
      await handleIdleState(session, phoneNumber, isRegistered, userName);
  }
}

// ============================================================================
// HANDLERS POR PASO
// ============================================================================

async function handleMainMenuStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    // Si escribió texto libre, mostrar menú de nuevo
    await sendMainMenu(phoneNumber, userName);
    return;
  }

  const { nextStep, handled } = await handleMainMenuSelection(
    session, phoneNumber, selectionId, userName
  );

  if (handled && nextStep !== 'MAIN_MENU') {
    // Transicionar al siguiente paso
    switch (nextStep) {
      case 'RATES_SELECT_CURRENCY':
        await handleRatesSelectCurrency(session, phoneNumber);
        break;
      case 'SEND_SELECT_CURRENCY':
        await handleSendSelectCurrency(session, phoneNumber);
        break;
      case 'SEND_SELECT_TYPE':
        await handleSendSelectType(session, phoneNumber);
        break;
      case 'BENEFICIARIES_LIST':
        await handleBeneficiariesList(session, phoneNumber);
        break;
      case 'HISTORY_SELECT_STATUS':
        await handleHistorySelectStatus(session, phoneNumber);
        break;
      case 'PROFILE_SHOW':
        // Obtener userId y mostrar perfil
        const supabase = createServerClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('whatsapp_number', session.phone_number)
          .single();
        if (profile) {
          await handleProfileShow(session, phoneNumber, profile.id);
        } else {
          await sendTextMessage(phoneNumber, '❌ No encontramos tu perfil.');
          await sendMainMenu(phoneNumber, userName);
        }
        break;
    }
  }
}

async function handleRatesSelectCurrencyStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId || !selectionId.startsWith('currency_')) {
    await handleRatesSelectCurrency(session, phoneNumber);
    return;
  }

  const currencyCode = selectionId.replace('currency_', '');
  await handleRatesCurrencySelected(session, phoneNumber, currencyCode);
}

async function handleRatesSelectPairStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId || !selectionId.startsWith('rate_')) {
    // Volver a mostrar opciones
    const currencyFrom = session.metadata.selected_currency_from || 'USD';
    await handleRatesCurrencySelected(session, phoneNumber, currencyFrom);
    return;
  }

  // Extraer par: rate_USD_VES -> USD, VES
  const [, from, to] = selectionId.split('_');
  await handleRatesShowRate(session, phoneNumber, from, to);
}

async function handleRatesShowStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  switch (selectionId) {
    case 'start_send_with_rate':
      // Iniciar envío con la tasa actual
      await handleSendSelectCurrency(session, phoneNumber);
      break;
    case 'rate_another':
      await handleRatesSelectCurrency(session, phoneNumber);
      break;
    default:
      await sendMainMenu(phoneNumber, userName);
  }
}

async function handleSendSelectCurrencyStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId || !selectionId.startsWith('currency_')) {
    await handleSendSelectCurrency(session, phoneNumber);
    return;
  }

  const currencyCode = selectionId.replace('currency_', '');
  await handleSendSelectMethod(session, phoneNumber, currencyCode);
}

async function handleSendSelectMethodStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId || !selectionId.startsWith('method_')) {
    // Volver a mostrar métodos
    const currencyFrom = session.metadata.selected_currency_from || 'USD';
    await handleSendSelectMethod(session, phoneNumber, currencyFrom);
    return;
  }

  const methodId = selectionId.replace('method_', '');
  // Obtener nombre del método de la BD
  const supabase = createServerClient();
  const { data: method } = await supabase
    .from('banks_platforms')
    .select('name')
    .eq('id', methodId)
    .single();

  await handleSendSelectBeneficiary(session, phoneNumber, methodId, method?.name || '');
}

async function handleSendSelectBeneficiaryStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId || !selectionId.startsWith('benef_')) {
    // Volver a mostrar beneficiarios
    await handleSendSelectBeneficiary(
      session,
      phoneNumber,
      session.metadata.selected_payment_method_id || '',
      session.metadata.selected_payment_method_name || ''
    );
    return;
  }

  const beneficiaryId = selectionId.replace('benef_', '');

  // Obtener nombre del beneficiario
  const supabase = createServerClient();
  const { data: benef } = await supabase
    .from('user_bank_accounts')
    .select('account_holder, alias')
    .eq('id', beneficiaryId)
    .single();

  const benefName = benef?.alias || benef?.account_holder || '';
  await handleSendInputAmount(session, phoneNumber, beneficiaryId, benefName);
}

async function handleSendInputAmountStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  // Esperamos texto con el monto
  if (message.type !== 'text' || !message.text?.body) {
    await sendTextMessage(
      phoneNumber,
      'Por favor, escribe el monto a enviar. Ejemplo: 100 o 100.50'
    );
    return;
  }

  const amountText = message.text.body.trim();
  const amount = parseFloat(amountText.replace(',', '.'));

  if (isNaN(amount) || amount <= 0) {
    await sendTextMessage(
      phoneNumber,
      '❌ Monto inválido. Por favor, ingresa un número válido.\n\nEjemplo: 100 o 100.50'
    );
    return;
  }

  await handleSendConfirm(session, phoneNumber, amount);
}

async function handleSendConfirmStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (selectionId === 'confirm_yes') {
    await handleSendShowAccount(session, phoneNumber);
  } else if (selectionId === 'confirm_no') {
    await sendTextMessage(phoneNumber, '❌ Operación cancelada.');
    await sendMainMenu(phoneNumber, userName);
    await transitionTo(session.id, 'MAIN_MENU');
  } else {
    // Volver a mostrar confirmación
    await handleSendConfirm(session, phoneNumber, session.metadata.amount_to_send || 0);
  }
}

async function handleSendShowAccountStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (selectionId === 'payment_done') {
    // Usuario indica que ya hizo el pago, pedir comprobante
    await handleSendUploadProof(session, phoneNumber);
  } else if (selectionId === 'payment_back') {
    // Volver a confirmación
    await handleSendConfirm(session, phoneNumber, session.metadata.amount_to_send || 0);
  } else {
    // Menú principal o texto libre
    await sendMainMenu(phoneNumber, userName);
    await resetSession(session.id);
  }
}

async function handleSendUploadProofStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  // Esperamos una imagen
  if (message.type !== 'image' || !message.image) {
    await sendTextMessage(
      phoneNumber,
      '📸 Por favor, envía una imagen de tu comprobante de pago.'
    );
    return;
  }

  // Notificar que estamos procesando
  await sendTextMessage(
    phoneNumber,
    '⏳ Procesando tu comprobante, espera un momento...'
  );

  // Obtener token de WhatsApp para descargar media
  const supabase = createServerClient();
  const { data: waConfig } = await supabase
    .from('notification_config')
    .select('config')
    .eq('provider', 'whatsapp')
    .single();

  let proofUrl = `whatsapp://media/${message.image.id}`;
  let ocrData: { amount?: number; reference?: string; date?: string; bank?: string } | undefined;

  if (waConfig?.config) {
    const config = waConfig.config as { access_token_encrypted?: string };
    if (config.access_token_encrypted) {
      try {
        const { decrypt, isEncrypted } = await import('@/lib/crypto');
        const token = isEncrypted(config.access_token_encrypted)
          ? await decrypt(config.access_token_encrypted)
          : config.access_token_encrypted;

        // Importar y usar OCR
        const { processWhatsAppMedia } = await import('../ocr-service');
        const ocrResult = await processWhatsAppMedia(message.image.id, token);

        if (ocrResult.success && ocrResult.confidence > 0.3) {
          ocrData = {
            amount: ocrResult.extractedData.amount,
            reference: ocrResult.extractedData.reference,
            date: ocrResult.extractedData.date,
            bank: ocrResult.extractedData.bank,
          };
          console.log('[OCR] Extracted data:', ocrData);
        }

        // Descargar imagen para guardarla en storage
        const mediaInfoResponse = await fetch(
          `https://graph.facebook.com/v21.0/${message.image.id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (mediaInfoResponse.ok) {
          const mediaInfo = await mediaInfoResponse.json();
          const downloadResponse = await fetch(mediaInfo.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (downloadResponse.ok) {
            const arrayBuffer = await downloadResponse.arrayBuffer();
            const fileName = `proofs/${session.user_id}/${Date.now()}.jpg`;

            // Subir a Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('proofs')
              .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false
              });

            if (!uploadError && uploadData) {
              const { data: publicUrl } = supabase.storage
                .from('proofs')
                .getPublicUrl(fileName);
              proofUrl = publicUrl.publicUrl;
            }
          }
        }
      } catch (error) {
        console.error('[Handler] Error processing media:', error);
      }
    }
  }

  await handleProofReceived(session, phoneNumber, proofUrl, ocrData);
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Extrae el ID de una selección interactiva o botón
 */
function extractSelectionId(message: IncomingMessage): string | null {
  if (message.type !== 'interactive' || !message.interactive) {
    return null;
  }

  if (message.interactive.type === 'list_reply' && message.interactive.list_reply) {
    return message.interactive.list_reply.id;
  }

  if (message.interactive.type === 'button_reply' && message.interactive.button_reply) {
    return message.interactive.button_reply.id;
  }

  return null;
}

/**
 * Extrae el ID de acción de navegación si existe
 */
function extractActionId(message: IncomingMessage): string | null {
  const selectionId = extractSelectionId(message);

  if (!selectionId) return null;

  // Verificar si es una acción de navegación
  const navActions = Object.values(NAVIGATION_ACTIONS);
  if (navActions.includes(selectionId as any)) {
    return selectionId;
  }

  return null;
}

// ============================================================================
// HANDLERS PASO: BENEFICIARIOS
// ============================================================================

async function handleBeneficiariesListStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    // Mostrar lista de nuevo
    await handleBeneficiariesList(session, phoneNumber);
    return;
  }

  // Si seleccionó un beneficiario, mostrar detalle
  if (selectionId.startsWith('beneficiary_')) {
    const beneficiaryId = selectionId.replace('beneficiary_', '');
    await handleBeneficiaryDetail(session, phoneNumber, beneficiaryId);
  }
}

async function handleBeneficiariesEmptyStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await sendMainMenu(phoneNumber, userName);
    await transitionTo(session.id, 'MAIN_MENU');
    return;
  }

  // Si quiere hacer un envío
  if (selectionId === 'menu_send') {
    await handleSendSelectCurrency(session, phoneNumber);
  }
}

async function handleBeneficiariesDetailStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await sendMainMenu(phoneNumber, userName);
    await transitionTo(session.id, 'MAIN_MENU');
    return;
  }

  // Volver a lista de beneficiarios
  if (selectionId === 'beneficiaries_back') {
    await handleBeneficiariesList(session, phoneNumber);
    return;
  }

  // Enviar a este beneficiario
  if (selectionId.startsWith('send_to_')) {
    const beneficiaryId = selectionId.replace('send_to_', '');
    // Guardar beneficiario en metadata y luego pedir moneda
    await transitionTo(session.id, 'IDLE', {
      selected_beneficiary_id: beneficiaryId,
      selected_beneficiary_name: session.metadata.selected_beneficiary_name,
    });
    // Iniciar flujo de envío con beneficiario preseleccionado
    await handleSendSelectCurrency(session, phoneNumber);
  }
}

// ============================================================================
// HANDLERS PASO: MIS OPERACIONES (HISTORIAL)
// ============================================================================

async function handleHistorySelectStatusStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    // Primera vez: mostrar menú de estados
    await handleHistorySelectStatus(session, phoneNumber);
    return;
  }

  // Si selecciona volver al menú principal
  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  // Verificar si es una opción de estado válida
  const validOptions = Object.values(HISTORY_STATUS_OPTIONS);
  if (validOptions.includes(selectionId)) {
    await handleHistoryStatusSelection(session, phoneNumber, selectionId);
    return;
  }

  // Opción no válida, volver a mostrar
  await handleHistorySelectStatus(session, phoneNumber);
}

async function handleHistorySelectPeriodStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await sendTextMessage(phoneNumber, '❌ Por favor selecciona un período de la lista.');
    return;
  }

  // Si selecciona volver al menú principal
  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  // Obtener userId de la sesión
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', session.phone_number)
    .single();

  if (!profile) {
    await sendTextMessage(phoneNumber, '❌ No encontramos tu perfil. Por favor contacta soporte.');
    return;
  }

  // Verificar si es una opción de período válida
  const validOptions = Object.values(HISTORY_PERIOD_OPTIONS);
  if (validOptions.includes(selectionId)) {
    await handleHistoryPeriodSelection(session, phoneNumber, selectionId, profile.id);
    return;
  }

  await sendTextMessage(phoneNumber, '❌ Por favor selecciona un período válido.');
}

async function handleHistoryShowResultsStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (selectionId === 'history_back') {
    // Volver al menú de estados
    await handleHistorySelectStatus(session, phoneNumber);
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber, userName);
    return;
  }

  // Default: volver al menú principal
  await sendMainMenu(phoneNumber, userName);
  await transitionTo(session.id, 'MAIN_MENU');
}

// ============================================================================
// HANDLERS PASO: MIS DATOS (PERFIL)
// ============================================================================

async function handleProfileShowStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  // Primera vez: obtener userId y mostrar perfil
  if (!selectionId) {
    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_number', session.phone_number)
      .single();

    if (!profile) {
      await sendTextMessage(phoneNumber, '❌ No encontramos tu perfil. Por favor contacta soporte.');
      await sendMainMenu(phoneNumber, userName);
      await transitionTo(session.id, 'MAIN_MENU');
      return;
    }

    await handleProfileShow(session, phoneNumber, profile.id);
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber, userName);
    return;
  }

  // Default: volver al menú principal
  await sendMainMenu(phoneNumber, userName);
  await transitionTo(session.id, 'MAIN_MENU');
}

// ============================================================================
// HANDLERS PASO: ENVÍO MÚLTIPLE
// ============================================================================

async function handleSendSelectTypeStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await handleSendSelectType(session, phoneNumber);
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId === SEND_TYPE_OPTIONS.SINGLE) {
    // Flujo individual: ir a selección de moneda normal
    await handleSendSelectCurrency(session, phoneNumber);
    return;
  }

  if (selectionId === SEND_TYPE_OPTIONS.MULTIPLE) {
    // Flujo múltiple: ir a selección de moneda múltiple
    await handleMultiSelectCurrency(session, phoneNumber);
    return;
  }

  await handleSendSelectType(session, phoneNumber);
}

async function handleMultiSelectCurrencyStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await handleMultiSelectCurrency(session, phoneNumber);
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId.startsWith('multi_currency_')) {
    const currencyCode = selectionId.replace('multi_currency_', '');
    await handleMultiSelectMethod(session, phoneNumber, currencyCode);
    return;
  }

  await handleMultiSelectCurrency(session, phoneNumber);
}

async function handleMultiSelectMethodStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await sendTextMessage(phoneNumber, '❌ Por favor selecciona un método de pago.');
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId.startsWith('multi_method_')) {
    const methodId = selectionId.replace('multi_method_', '');
    const userId = await getUserId(session.phone_number);
    if (userId) {
      await handleMultiSelectBeneficiary(session, phoneNumber, methodId, userId);
    } else {
      await sendTextMessage(phoneNumber, '❌ No encontramos tu perfil.');
    }
    return;
  }

  await sendTextMessage(phoneNumber, '❌ Método no válido.');
}

async function handleMultiSelectBeneficiaryStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    const userId = await getUserId(session.phone_number);
    const methodId = session.metadata?.selected_payment_method_id || '';
    if (userId) {
      await handleMultiSelectBeneficiary(session, phoneNumber, methodId, userId);
    }
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId.startsWith('multi_benef_')) {
    const beneficiaryId = selectionId.replace('multi_benef_', '');
    await handleMultiInputAmount(session, phoneNumber, beneficiaryId);
    return;
  }

  await sendTextMessage(phoneNumber, '❌ Beneficiario no válido.');
}

async function handleMultiInputAmountStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  // El usuario debe escribir un monto en texto
  const text = message.type === 'text' ? message.text?.body?.trim() : null;

  if (!text) {
    await sendTextMessage(phoneNumber, '❌ Por favor escribe el monto a enviar.');
    return;
  }

  // Parsear monto
  const amount = parseFloat(text.replace(/[^0-9.]/g, ''));

  if (isNaN(amount) || amount <= 0) {
    await sendTextMessage(phoneNumber, '❌ Monto no válido. Escribe solo números.\n\n_Ejemplo: 100_');
    return;
  }

  const userId = await getUserId(session.phone_number);
  if (userId) {
    await handleMultiAddToList(session, phoneNumber, amount, userId);
  }
}

async function handleMultiListViewStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);
  const userId = await getUserId(session.phone_number);

  if (!selectionId) {
    if (userId) {
      await showMultiListView(session, phoneNumber, userId);
    }
    return;
  }

  if (selectionId === 'nav_main_menu') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId === 'multi_add_another') {
    const methodId = session.metadata?.selected_payment_method_id || '';
    if (userId) {
      await handleMultiSelectBeneficiary(session, phoneNumber, methodId, userId);
    }
    return;
  }

  if (selectionId === 'multi_confirm') {
    await handleMultiShowAccount(session, phoneNumber);
    return;
  }

  if (selectionId === 'multi_remove_last') {
    if (userId) {
      await handleMultiRemoveLast(session, phoneNumber, userId);
    }
    return;
  }

  if (userId) {
    await showMultiListView(session, phoneNumber, userId);
  }
}

async function handleMultiShowAccountStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  const selectionId = extractSelectionId(message);

  if (!selectionId) {
    await handleMultiShowAccount(session, phoneNumber);
    return;
  }

  if (selectionId === 'nav_main_menu' || selectionId === 'multi_cancel') {
    await resetSession(session.id);
    await sendMainMenu(phoneNumber);
    return;
  }

  if (selectionId === 'multi_payment_done') {
    await handleMultiUploadProof(session, phoneNumber);
    return;
  }

  await handleMultiShowAccount(session, phoneNumber);
}

async function handleMultiUploadProofStep(
  session: ChatSession,
  message: IncomingMessage,
  phoneNumber: string
): Promise<void> {
  // Verificar si es imagen
  if (message.type !== 'image') {
    await sendTextMessage(phoneNumber,
      '📸 Por favor envía una *imagen* de tu comprobante de pago.\n\n' +
      '_Puedes tomar una foto o enviar una captura de pantalla._'
    );
    return;
  }

  const imageId = message.image?.id;
  if (!imageId) {
    await sendTextMessage(phoneNumber, '❌ No pudimos procesar la imagen. Intenta de nuevo.');
    return;
  }

  let proofUrl: string | null = null;
  const supabase = createServerClient();

  try {
    console.log('[Multi] handleMultiUploadProofStep - Iniciando proceso de comprobante');
    // Obtener config de WhatsApp (igual que flujo individual)
    const { data: waConfig, error: configError } = await supabase
      .from('notification_config')
      .select('config')
      .eq('provider', 'whatsapp')
      .single();

    console.log('[Multi] Config obtenida:', waConfig ? 'SI' : 'NO', 'Error:', configError?.message);

    if (waConfig?.config) {
      const config = waConfig.config as { access_token_encrypted?: string };
      if (config.access_token_encrypted) {
        const { decrypt, isEncrypted } = await import('@/lib/crypto');
        const token = isEncrypted(config.access_token_encrypted)
          ? await decrypt(config.access_token_encrypted)
          : config.access_token_encrypted;

        console.log('[Multi] Descargando imagen con token desencriptado...');

        // Descargar imagen para guardarla en storage
        const mediaInfoResponse = await fetch(
          `https://graph.facebook.com/v21.0/${imageId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (mediaInfoResponse.ok) {
          const mediaInfo = await mediaInfoResponse.json();
          console.log('[Multi] Media URL obtenida:', mediaInfo.url?.slice(0, 50));

          const downloadResponse = await fetch(mediaInfo.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (downloadResponse.ok) {
            const arrayBuffer = await downloadResponse.arrayBuffer();
            console.log('[Multi] Imagen descargada, tamaño:', arrayBuffer.byteLength);

            const fileName = `proofs/${session.user_id || phoneNumber}/${Date.now()}.jpg`;

            // Subir a Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('proofs')
              .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false
              });

            if (!uploadError && uploadData) {
              const { data: publicUrl } = supabase.storage
                .from('proofs')
                .getPublicUrl(fileName);
              proofUrl = publicUrl.publicUrl;
              console.log('[Multi] Comprobante subido:', proofUrl);
            } else {
              console.error('[Multi] Error subiendo:', uploadError);
            }
          }
        } else {
          console.error('[Multi] Error obteniendo mediaInfo:', await mediaInfoResponse.text());
        }
      }
    }
  } catch (error) {
    console.error('[Multi] Error procesando comprobante:', error);
  }

  if (!proofUrl) {
    await sendTextMessage(phoneNumber, '❌ Error al procesar el comprobante. Intenta de nuevo.');
    return;
  }

  const userId = await getUserId(session.phone_number);
  if (userId) {
    await handleMultiCreateTransactions(session, phoneNumber, proofUrl, userId);
  }
}

// Utilidad para obtener userId
async function getUserId(whatsappNumber: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', whatsappNumber)
    .single();
  return data?.id || null;
}
