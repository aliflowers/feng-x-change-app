/**
 * Tipos para el sistema de chat determinista de WhatsApp
 * 
 * Define los estados de conversación y la estructura de datos
 * para el flujo basado en menús interactivos.
 */

// ============================================================================
// ESTADOS DE CONVERSACIÓN
// ============================================================================

/**
 * Estados posibles del flujo conversacional.
 * Cada estado determina qué tipo de mensaje espera el bot.
 */
export type ConversationStep =
 // Estados base
 | 'IDLE'                      // Sin sesión activa
 | 'MAIN_MENU'                 // Menú principal mostrado

 // Flujo: Consultar tasas
 | 'RATES_SELECT_CURRENCY'     // Seleccionar moneda origen
 | 'RATES_SELECT_PAIR'         // Seleccionar par de cambio
 | 'RATES_SHOW'                // Tasa mostrada

 // Flujo: Hacer envío
 | 'SEND_SELECT_CURRENCY'      // Seleccionar moneda a enviar
 | 'SEND_SELECT_METHOD'        // Seleccionar método de pago
 | 'SEND_SELECT_BENEFICIARY'   // Seleccionar beneficiario
 | 'SEND_INPUT_AMOUNT'         // Esperando monto (texto)
 | 'SEND_CONFIRM'              // Confirmación de operación
 | 'SEND_SHOW_ACCOUNT'         // Cuenta de empresa mostrada
 | 'SEND_UPLOAD_PROOF'         // Esperando comprobante

 // Flujo: Mis beneficiarios
 | 'BENEFICIARIES_LIST'        // Lista de beneficiarios
 | 'BENEFICIARIES_EMPTY'       // Sin beneficiarios
 | 'BENEFICIARIES_DETAIL'      // Detalle de un beneficiario

 // Flujo: Mis operaciones (Historial)
 | 'HISTORY_SELECT_STATUS'     // Seleccionar filtro de estado
 | 'HISTORY_SELECT_PERIOD'     // Seleccionar período de tiempo
 | 'HISTORY_SHOW_RESULTS'      // Mostrar operaciones

 // Flujo: Mis datos (Perfil)
 | 'PROFILE_SHOW'              // Mostrar datos personales

 | 'COMPLETED';                // Operación creada

// ============================================================================
// METADATA DE SESIÓN
// ============================================================================

/**
 * Datos extraídos del comprobante mediante OCR
 */
export interface ExtractedOCRData {
 amount?: number;
 reference?: string;
 date?: string;
 bank?: string;
 confidence: number; // 0-1
}

/**
 * Metadata almacenada en el campo JSONB de chat_sessions.
 * Contiene los datos temporales del flujo en curso.
 */
export interface SessionMetadata {
 // Flujo de tasas
 selected_currency_from?: string;
 selected_currency_to?: string;

 // Flujo de envío
 selected_payment_method_id?: string;
 selected_payment_method_name?: string;
 selected_beneficiary_id?: string;
 selected_beneficiary_name?: string;
 amount_to_send?: number;
 calculated_rate?: number;
 calculated_amount_received?: number;
 company_account_id?: string;

 // Comprobante
 proof_url?: string;
 extracted_ocr_data?: ExtractedOCRData;

 // Navegación
 navigation_history?: ConversationStep[];

 // ID del último mensaje interactivo (para validación)
 last_interactive_message_id?: string;

 // Flujo de historial
 selected_history_status?: string;
}

// ============================================================================
// ENTIDAD DE SESIÓN
// ============================================================================

/**
 * Representa una fila de la tabla chat_sessions
 */
export interface ChatSession {
 id: string;
 phone_number: string;
 user_id: string | null;
 current_step: ConversationStep;
 metadata: SessionMetadata;
 last_message_at: string;
 created_at: string;
 updated_at: string;
}

/**
 * Datos para crear o actualizar una sesión
 */
export interface ChatSessionUpdate {
 current_step?: ConversationStep;
 metadata?: Partial<SessionMetadata>;
 user_id?: string | null;
}

// ============================================================================
// TIPOS DE MENSAJES WHATSAPP
// ============================================================================

/**
 * Opción de una lista interactiva
 */
export interface ListOption {
 id: string;
 title: string;
 description?: string;
}

/**
 * Sección de una lista interactiva
 */
export interface ListSection {
 title: string;
 rows: ListOption[];
}

/**
 * Botón de respuesta rápida
 */
export interface ReplyButton {
 id: string;
 title: string;
}

/**
 * Tipos de mensaje interactivo que podemos enviar
 */
export type InteractiveMessageType = 'list' | 'button' | 'text';

// ============================================================================
// OPCIONES DEL MENÚ PRINCIPAL
// ============================================================================

export const MAIN_MENU_OPTIONS = {
 RATES: 'menu_rates',
 SEND: 'menu_send',
 BENEFICIARIES: 'menu_beneficiaries',   // Fase 2
 OPERATIONS: 'menu_operations',         // Fase 2
 PROFILE: 'menu_profile',               // Fase 2
 SUPPORT: 'menu_support',               // Fase 2
} as const;

export type MainMenuOption = typeof MAIN_MENU_OPTIONS[keyof typeof MAIN_MENU_OPTIONS];

// ============================================================================
// MONEDAS SOPORTADAS
// ============================================================================

export const SUPPORTED_CURRENCIES = [
 { code: 'USD', name: 'Dólares', emoji: '🇺🇸' },
 { code: 'VES', name: 'Bolívares', emoji: '🇻🇪' },
 { code: 'COP', name: 'Pesos Colombianos', emoji: '🇨🇴' },
 { code: 'CLP', name: 'Pesos Chilenos', emoji: '🇨🇱' },
 { code: 'PEN', name: 'Soles Peruanos', emoji: '🇵🇪' },
 { code: 'PAB', name: 'Dólares Panamá', emoji: '🇵🇦' },
 { code: 'EUR', name: 'Euros', emoji: '🇪🇺' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

// ============================================================================
// ACCIONES DE NAVEGACIÓN
// ============================================================================

export const NAVIGATION_ACTIONS = {
 BACK: 'nav_back',
 MAIN_MENU: 'nav_main_menu',
 CANCEL: 'nav_cancel',
} as const;

export type NavigationAction = typeof NAVIGATION_ACTIONS[keyof typeof NAVIGATION_ACTIONS];
