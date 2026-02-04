/**
 * Handlers para el flujo de menú principal y navegación
 */

import type { ChatSession, ConversationStep } from '@/types/chat';
import { MAIN_MENU_OPTIONS, NAVIGATION_ACTIONS } from '@/types/chat';
import { transitionTo, resetSession } from '../session-manager';
import {
  sendMainMenu,
  sendWelcomeUnregistered,
  sendTextMessage
} from '../message-builder';

// ============================================================================
// HANDLER: MENÚ PRINCIPAL
// ============================================================================

/**
 * Muestra el menú principal y transiciona al estado MAIN_MENU
 */
export async function handleShowMainMenu(
  session: ChatSession,
  phoneNumber: string,
  userName?: string
): Promise<void> {
  // Enviar menú
  await sendMainMenu(phoneNumber, userName);

  // Actualizar estado
  await transitionTo(session.id, 'MAIN_MENU');
}

/**
 * Procesa la selección del menú principal
 */
export async function handleMainMenuSelection(
  _session: ChatSession,
  phoneNumber: string,
  selectionId: string,
  userName?: string
): Promise<{ nextStep: ConversationStep; handled: boolean }> {

  switch (selectionId) {
    case MAIN_MENU_OPTIONS.RATES:
      // Ir al flujo de tasas
      return { nextStep: 'RATES_SELECT_CURRENCY', handled: true };

    case MAIN_MENU_OPTIONS.SEND:
      // Ir al flujo de envío
      return { nextStep: 'SEND_SELECT_CURRENCY', handled: true };

    case MAIN_MENU_OPTIONS.BENEFICIARIES:
      // Ir al flujo de beneficiarios
      return { nextStep: 'BENEFICIARIES_LIST', handled: true };

    case MAIN_MENU_OPTIONS.OPERATIONS:
    case MAIN_MENU_OPTIONS.PROFILE:
    case MAIN_MENU_OPTIONS.SUPPORT:
      // Opciones deshabilitadas (próximas fases)
      await sendTextMessage(
        phoneNumber,
        '🚧 Esta función estará disponible próximamente.\n\nPor ahora puedes consultar tasas, hacer envíos o ver tus beneficiarios.'
      );
      await sendMainMenu(phoneNumber, userName);
      return { nextStep: 'MAIN_MENU', handled: true };

    default:
      // Opción no reconocida
      return { nextStep: 'MAIN_MENU', handled: false };
  }
}

// ============================================================================
// HANDLER: USUARIO NO REGISTRADO
// ============================================================================

/**
 * Muestra mensaje de bienvenida para usuarios no registrados
 */
export async function handleUnregisteredUser(phoneNumber: string): Promise<void> {
  await sendWelcomeUnregistered(phoneNumber);
}

// ============================================================================
// HANDLER: NAVEGACIÓN GLOBAL
// ============================================================================

/**
 * Verifica si es una acción de navegación global y la procesa
 * @returns true si fue manejada, false si debe continuar procesamiento normal
 */
export async function handleNavigationAction(
  session: ChatSession,
  phoneNumber: string,
  actionId: string,
  userName?: string
): Promise<boolean> {

  switch (actionId) {
    case NAVIGATION_ACTIONS.MAIN_MENU:
      // Resetear y volver al menú principal
      await resetSession(session.id);
      await sendMainMenu(phoneNumber, userName);
      return true;

    case NAVIGATION_ACTIONS.CANCEL:
      // Cancelar operación actual
      await resetSession(session.id);
      await sendTextMessage(phoneNumber, '❌ Operación cancelada.');
      await sendMainMenu(phoneNumber, userName);
      return true;

    case NAVIGATION_ACTIONS.BACK:
      // Volver al paso anterior (usar goBack del session-manager)
      // Implementar luego cuando tengamos los handlers de cada paso
      return false;

    default:
      return false;
  }
}

// ============================================================================
// HANDLER: MENSAJE DE TEXTO LIBRE (cuando no esperamos input estructurado)
// ============================================================================

/**
 * Procesa mensajes de texto cuando el usuario está en IDLE
 * Cualquier mensaje lleva al menú principal si está registrado
 */
export async function handleIdleState(
  session: ChatSession,
  phoneNumber: string,
  isRegistered: boolean,
  userName?: string
): Promise<void> {
  if (!isRegistered) {
    await handleUnregisteredUser(phoneNumber);
    return;
  }

  await handleShowMainMenu(session, phoneNumber, userName);
}
