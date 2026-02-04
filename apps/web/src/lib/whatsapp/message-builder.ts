/**
 * MessageBuilder - Construcción de mensajes interactivos de WhatsApp
 * 
 * Genera payloads para List Messages, Reply Buttons y mensajes de texto
 * según la API de WhatsApp Business.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ListSection, ReplyButton } from '@/types/chat';
import { SUPPORTED_CURRENCIES, MAIN_MENU_OPTIONS, NAVIGATION_ACTIONS } from '@/types/chat';

// ============================================================================
// CONSTANTES
// ============================================================================

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface WhatsAppTextMessage {
 messaging_product: 'whatsapp';
 to: string;
 type: 'text';
 text: { body: string };
}

interface WhatsAppListMessage {
 messaging_product: 'whatsapp';
 to: string;
 type: 'interactive';
 interactive: {
  type: 'list';
  header?: { type: 'text'; text: string };
  body: { text: string };
  footer?: { text: string };
  action: {
   button: string;
   sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
   }>;
  };
 };
}

interface WhatsAppButtonMessage {
 messaging_product: 'whatsapp';
 to: string;
 type: 'interactive';
 interactive: {
  type: 'button';
  header?: { type: 'text'; text: string };
  body: { text: string };
  footer?: { text: string };
  action: {
   buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
  };
 };
}

type WhatsAppMessage = WhatsAppTextMessage | WhatsAppListMessage | WhatsAppButtonMessage;

// ============================================================================
// OBTENCIÓN DE CREDENCIALES DE WHATSAPP
// ============================================================================

interface WhatsAppCredentials {
 phoneNumberId: string;
 accessToken: string;
}

let cachedCredentials: WhatsAppCredentials | null = null;
let credentialsCacheTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene las credenciales de WhatsApp de la base de datos
 * con cache para evitar consultas repetidas
 */
async function getWhatsAppCredentials(): Promise<WhatsAppCredentials | null> {
 // Usar cache si es válido
 if (cachedCredentials && Date.now() - credentialsCacheTime < CACHE_TTL_MS) {
  return cachedCredentials;
 }

 const supabase = createServerClient();

 const { data: waData, error } = await supabase
  .from('notification_config')
  .select('config, is_enabled')
  .eq('provider', 'whatsapp')
  .single();

 if (error || !waData?.is_enabled) {
  console.error('[MessageBuilder] WhatsApp config not found or disabled');
  return null;
 }

 const config = waData.config as {
  phone_number_id?: string;
  access_token_encrypted?: string;
 };

 if (!config.phone_number_id || !config.access_token_encrypted) {
  console.error('[MessageBuilder] WhatsApp config incomplete');
  return null;
 }

 // Descifrar token
 try {
  const { decrypt, isEncrypted } = await import('@/lib/crypto');
  const accessToken = isEncrypted(config.access_token_encrypted)
   ? await decrypt(config.access_token_encrypted)
   : config.access_token_encrypted;

  cachedCredentials = {
   phoneNumberId: config.phone_number_id,
   accessToken,
  };
  credentialsCacheTime = Date.now();

  return cachedCredentials;
 } catch (err) {
  console.error('[MessageBuilder] Error decrypting token:', err);
  return null;
 }
}

// ============================================================================
// FUNCIONES DE ENVÍO
// ============================================================================

/**
 * Envía un mensaje a WhatsApp
 */
export async function sendMessage(payload: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
 try {
  const credentials = await getWhatsAppCredentials();

  if (!credentials) {
   return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const response = await fetch(`${WHATSAPP_API_URL}/${credentials.phoneNumberId}/messages`, {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${credentials.accessToken}`,
    'Content-Type': 'application/json',
   },
   body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
   console.error('[MessageBuilder] Error sending message:', data);
   return { success: false, error: data.error?.message || 'Unknown error' };
  }

  return { success: true, messageId: data.messages?.[0]?.id };
 } catch (error) {
  console.error('[MessageBuilder] Exception:', error);
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
 }
}

// ============================================================================
// CONSTRUCTORES DE MENSAJES
// ============================================================================

/**
 * Construye y envía un mensaje de texto simple
 */
export async function sendTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string }> {
 const payload: WhatsAppTextMessage = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body: text },
 };
 return sendMessage(payload);
}

/**
 * Construye y envía un mensaje con lista interactiva
 */
export async function sendListMessage(
 to: string,
 options: {
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: ListSection[];
 }
): Promise<{ success: boolean; messageId?: string }> {
 const payload: WhatsAppListMessage = {
  messaging_product: 'whatsapp',
  to,
  type: 'interactive',
  interactive: {
   type: 'list',
   ...(options.header && { header: { type: 'text', text: options.header } }),
   body: { text: options.body },
   ...(options.footer && { footer: { text: options.footer } }),
   action: {
    button: options.buttonText,
    sections: options.sections.map(section => ({
     title: section.title,
     rows: section.rows.map(row => ({
      id: row.id,
      title: row.title.slice(0, 24), // Límite WhatsApp: 24 caracteres
      ...(row.description && { description: row.description.slice(0, 72) }),
     })),
    })),
   },
  },
 };
 return sendMessage(payload);
}

/**
 * Construye y envía un mensaje con botones de respuesta
 */
export async function sendButtonMessage(
 to: string,
 options: {
  header?: string;
  body: string;
  footer?: string;
  buttons: ReplyButton[];
 }
): Promise<{ success: boolean; messageId?: string }> {
 // WhatsApp limita a 3 botones
 const buttons = options.buttons.slice(0, 3);

 const payload: WhatsAppButtonMessage = {
  messaging_product: 'whatsapp',
  to,
  type: 'interactive',
  interactive: {
   type: 'button',
   ...(options.header && { header: { type: 'text', text: options.header } }),
   body: { text: options.body },
   ...(options.footer && { footer: { text: options.footer } }),
   action: {
    buttons: buttons.map(btn => ({
     type: 'reply',
     reply: {
      id: btn.id,
      title: btn.title.slice(0, 20), // Límite WhatsApp: 20 caracteres
     },
    })),
   },
  },
 };
 return sendMessage(payload);
}

// ============================================================================
// MENSAJES PREDEFINIDOS
// ============================================================================

/**
 * Mensaje de bienvenida para usuarios NO registrados
 */
export async function sendWelcomeUnregistered(to: string): Promise<{ success: boolean }> {
 const text = `¡Hola! 👋 Bienvenido a *FengXchange*.

Para realizar envíos de dinero, primero debes registrarte en nuestra plataforma.

👉 Visita https://fengxchange.com y crea tu cuenta en minutos.

Una vez registrado, podrás:
✅ Consultar tasas de cambio
✅ Enviar dinero a tus beneficiarios
✅ Ver el historial de tus operaciones

¿Ya tienes cuenta? Asegúrate de usar el mismo número de WhatsApp.`;

 return sendTextMessage(to, text);
}

/**
 * Menú principal para usuarios registrados
 */
export async function sendMainMenu(to: string, userName?: string): Promise<{ success: boolean; messageId?: string }> {
 const greeting = userName ? `Hola *${userName}*` : 'Hola';

 return sendListMessage(to, {
  header: '📋 Menú Principal',
  body: `${greeting}, ¿qué deseas hacer hoy?`,
  buttonText: 'Ver opciones',
  sections: [
   {
    title: 'Operaciones',
    rows: [
     { id: MAIN_MENU_OPTIONS.RATES, title: '💱 Consultar tasas' },
     { id: MAIN_MENU_OPTIONS.SEND, title: '💸 Hacer un envío' },
    ],
   },
   {
    title: 'Mi Cuenta (Próximamente)',
    rows: [
     { id: MAIN_MENU_OPTIONS.BENEFICIARIES, title: '👥 Mis beneficiarios', description: 'Próximamente' },
     { id: MAIN_MENU_OPTIONS.OPERATIONS, title: '📋 Mis operaciones', description: 'Próximamente' },
     { id: MAIN_MENU_OPTIONS.PROFILE, title: '👤 Mis datos', description: 'Próximamente' },
    ],
   },
   {
    title: 'Ayuda',
    rows: [
     { id: MAIN_MENU_OPTIONS.SUPPORT, title: '💬 Hablar con alguien', description: 'Próximamente' },
    ],
   },
  ],
 });
}

/**
 * Menú de selección de moneda (para tasas o envío)
 */
export async function sendCurrencySelector(
 to: string,
 options: {
  header: string;
  body: string;
  includeBackButton?: boolean;
 }
): Promise<{ success: boolean; messageId?: string }> {
 const currencyRows = SUPPORTED_CURRENCIES.map(c => ({
  id: `currency_${c.code}`,
  title: `${c.emoji} ${c.name} (${c.code})`,
 }));

 const sections: ListSection[] = [
  {
   title: 'Monedas disponibles',
   rows: currencyRows,
  },
 ];

 // Agregar opción de navegación si se solicita
 if (options.includeBackButton) {
  sections.push({
   title: 'Navegación',
   rows: [
    { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú principal' },
   ],
  });
 }

 return sendListMessage(to, {
  header: options.header,
  body: options.body,
  buttonText: 'Seleccionar',
  sections,
 });
}

/**
 * Confirmación de operación (Sí/No)
 */
export async function sendConfirmation(
 to: string,
 options: {
  amountSent: number;
  currencyFrom: string;
  beneficiaryName: string;
  bankName: string;
  rate: number;
  amountReceived: number;
  currencyTo: string;
 }
): Promise<{ success: boolean; messageId?: string }> {
 const body = `📋 *Resumen de tu operación*

*Envías:* ${options.amountSent.toLocaleString()} ${options.currencyFrom}
*Beneficiario:* ${options.beneficiaryName}
*Banco destino:* ${options.bankName}

💱 *Tasa aplicada:* 1 ${options.currencyFrom} = ${options.rate} ${options.currencyTo}
💰 *Recibirá:* ${options.amountReceived.toLocaleString()} ${options.currencyTo}

¿Estás de acuerdo con esta operación?`;

 return sendButtonMessage(to, {
  header: '✅ Confirmación',
  body,
  buttons: [
   { id: 'confirm_yes', title: '✅ Sí, de acuerdo' },
   { id: 'confirm_no', title: '❌ No, cancelar' },
  ],
 });
}

/**
 * Mostrar cuenta de la empresa para pago
 */
export async function sendCompanyAccount(
 to: string,
 options: {
  amount: number;
  currency: string;
  methodName: string;
  accountDetails: string; // Ej: "Email: pagos@fengxchange.com"
  holderName: string;
 }
): Promise<{ success: boolean; messageId?: string }> {
 const body = `🏦 *Datos para tu transferencia*

Realiza tu pago de *${options.amount.toLocaleString()} ${options.currency}* a:

*Método:* ${options.methodName}
${options.accountDetails}
*Nombre:* ${options.holderName}

⚠️ *Importante:*
- Usa exactamente el monto indicado
- No incluyas notas o mensajes, debes dejar el área de concepto en BLANCO.

Una vez hayas realizado la transferencia, presiona el botón de abajo.`;

 return sendButtonMessage(to, {
  body,
  buttons: [
   { id: 'transfer_done', title: '✅ Ya hice la transferencia' },
   { id: 'transfer_cancel', title: '❌ Cancelar' },
  ],
 });
}

/**
 * Solicitar comprobante de pago
 */
export async function sendProofRequest(to: string): Promise<{ success: boolean }> {
 const text = `📸 *Envía tu comprobante*

Por favor, envía una *captura de pantalla* clara de tu transferencia.

La imagen debe mostrar:
✅ Monto enviado
✅ Fecha y hora
✅ Número de referencia (si aplica)

Esperando tu imagen...`;

 return sendTextMessage(to, text);
}

/**
 * Operación creada exitosamente
 */
export async function sendOperationCreated(
 to: string,
 transactionNumber: string
): Promise<{ success: boolean; messageId?: string }> {
 const body = `✅ *¡Operación registrada exitosamente!*

Tu operación ha sido recibida y está siendo procesada.

*Número de operación:* #${transactionNumber}

Recibirás una notificación cuando el dinero haya sido enviado a tu beneficiario.

Tiempo estimado: 15 minutos`;

 return sendButtonMessage(to, {
  body,
  buttons: [
   { id: MAIN_MENU_OPTIONS.SEND, title: '💸 Hacer otro envío' },
   { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú principal' },
  ],
 });
}
