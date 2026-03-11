/**
 * Utilidades de navegación y estabilización
 * 
 * - Timeout de sesión (24h)
 * - Manejo de inputs inválidos
 * - Mensajes de ayuda
 */

import { createServerClient } from '@/lib/supabase/server';
import { sendTextMessage, sendMainMenu } from './message-builder';
import { resetSession } from './session-manager';

// ============================================================================
// CONSTANTES
// ============================================================================

const SESSION_TIMEOUT_HOURS = 24;

// ============================================================================
// TIMEOUT DE SESIÓN
// ============================================================================

/**
 * Verifica si una sesión ha expirado (más de 24h sin actividad)
 * y la resetea si es necesario
 */
export async function checkSessionTimeout(
 sessionId: string,
 lastMessageAt: Date | string
): Promise<boolean> {
 const lastMessage = new Date(lastMessageAt);
 const now = new Date();
 const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);

 if (hoursDiff > SESSION_TIMEOUT_HOURS) {
  console.log(`[Session] Timeout detected for session ${sessionId}, resetting...`);
  await resetSession(sessionId);
  return true; // Sesión expiró
 }

 return false; // Sesión activa
}

/**
 * Limpia sesiones inactivas (para ejecutar como cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
 const supabase = createServerClient();

 const cutoffDate = new Date();
 cutoffDate.setHours(cutoffDate.getHours() - SESSION_TIMEOUT_HOURS);

 const { data, error } = await supabase
  .from('chat_sessions')
  .update({
   current_step: 'IDLE',
   metadata: {},
   updated_at: new Date().toISOString(),
  })
  .lt('last_message_at', cutoffDate.toISOString())
  .neq('current_step', 'IDLE')
  .select('id');

 if (error) {
  console.error('[Cleanup] Error:', error);
  return 0;
 }

 console.log(`[Cleanup] Reset ${data?.length || 0} expired sessions`);
 return data?.length || 0;
}

// ============================================================================
// MENSAJES DE ERROR Y AYUDA
// ============================================================================

/**
 * Envía mensaje de error genérico con opción de volver al menú
 */
export async function sendErrorMessage(
 phoneNumber: string,
 customMessage?: string
): Promise<void> {
 await sendTextMessage(
  phoneNumber,
  customMessage || '❌ Ha ocurrido un error. Por favor, intenta nuevamente.'
 );
}

/**
 * Envía mensaje cuando el input no es del tipo esperado
 */
export async function sendInvalidInputMessage(
 phoneNumber: string,
 expectedType: 'selection' | 'text' | 'image' | 'amount'
): Promise<void> {
 const messages: Record<string, string> = {
  selection: '⚠️ Por favor, selecciona una opción del menú.',
  text: '⚠️ Por favor, escribe tu respuesta.',
  image: '📸 Por favor, envía una imagen.',
  amount: '⚠️ Por favor, ingresa un monto válido. Ejemplo: 100 o 100.50',
 };

 await sendTextMessage(phoneNumber, messages[expectedType] || messages.selection);
}

/**
 * Mensaje de bienvenida de retorno (cuando la sesión expiró)
 */
export async function sendSessionExpiredMessage(
 phoneNumber: string,
 userName?: string
): Promise<void> {
 const greeting = userName ? `Hola *${userName}*` : 'Hola';

 await sendTextMessage(
  phoneNumber,
  `${greeting}, ha pasado un tiempo desde tu última interacción. Tu sesión anterior ha sido reiniciada.\n\n¿En qué puedo ayudarte hoy?`
 );

 await sendMainMenu(phoneNumber, userName);
}

// ============================================================================
// COMANDOS DE TEXTO ESPECIALES
// ============================================================================

/**
 * Verifica si el mensaje es un comando especial
 * (para usuarios que escriben texto en lugar de usar botones)
 */
export function detectTextCommand(text: string): 'menu' | 'cancel' | 'help' | null {
 const normalized = text.toLowerCase().trim();

 // Detectar "menú" o "menu"
 if (/^(men[uú]|inicio|home|volver)$/i.test(normalized)) {
  return 'menu';
 }

 // Detectar "cancelar"
 if (/^(cancelar|cancel|salir|exit)$/i.test(normalized)) {
  return 'cancel';
 }

 // Detectar "ayuda"
 if (/^(ayuda|help|\?)$/i.test(normalized)) {
  return 'help';
 }

 return null;
}

/**
 * Envía mensaje de ayuda
 */
export async function sendHelpMessage(phoneNumber: string): Promise<void> {
 await sendTextMessage(
  phoneNumber,
  `ℹ️ *Ayuda - FengXchange Bot*

Comandos disponibles:
• Escribe *menú* para volver al menú principal
• Escribe *cancelar* para detener la operación actual

Flujos disponibles:
• 💱 *Consultar tasas* - Ver tasas de cambio actuales
• 💸 *Hacer un envío* - Transferir dinero a tus beneficiarios

¿Necesitas más ayuda? Contáctanos en soporte@fengxchange.com`
 );
}

// ============================================================================
// VALIDADORES DE MONTO
// ============================================================================

/**
 * Valida y parsea un monto ingresado por el usuario
 */
export function parseAmount(input: string): {
 valid: boolean;
 amount: number;
 error?: string;
} {
 // Limpiar el input
 const cleaned = input.trim().replace(/\s/g, '');

 // Intentar parsear (aceptar punto o coma como decimal)
 const normalized = cleaned.replace(',', '.');
 const amount = parseFloat(normalized);

 if (isNaN(amount)) {
  return {
   valid: false,
   amount: 0,
   error: 'El valor ingresado no es un número válido.',
  };
 }

 if (amount <= 0) {
  return {
   valid: false,
   amount: 0,
   error: 'El monto debe ser mayor a cero.',
  };
 }

 if (amount > 100000) {
  return {
   valid: false,
   amount: 0,
   error: 'El monto máximo permitido es 100,000.',
  };
 }

 // Redondear a 2 decimales
 return {
  valid: true,
  amount: Math.round(amount * 100) / 100,
 };
}
