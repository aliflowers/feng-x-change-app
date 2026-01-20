/**
 * @fileoverview Constantes del sistema Fengxchange
 * Valores fijos que no deben cambiar en runtime
 */

/**
 * Configuración del Timer de Operaciones
 */
export const TIMER_CONFIG = {
 /** Tiempo en minutos para completar una operación */
 DURATION_MINUTES: 15,
 /** Tiempo en segundos */
 DURATION_SECONDS: 15 * 60,
 /** Tiempo en milisegundos */
 DURATION_MS: 15 * 60 * 1000,
} as const;

/**
 * Configuración de Comisiones
 */
export const COMMISSION_CONFIG = {
 /** Porcentaje de comisión para el agente */
 AGENT_PERCENT: 50,
 /** Porcentaje de comisión para el negocio */
 BUSINESS_PERCENT: 50,
} as const;

/**
 * Configuración de Penalizaciones
 */
export const PENALTY_CONFIG = {
 /** Número de demoras para aplicar penalización */
 DELAYED_THRESHOLD: 3,
 /** Monto de penalización en USD */
 PENALTY_AMOUNT_USD: 10,
} as const;

/**
 * Formatos de códigos
 */
export const CODE_FORMATS = {
 /** Prefijo para código de agente: AG-XXXXX */
 AGENT_CODE_PREFIX: 'AG-',
 /** Prefijo para número de operación: OP-YYYY-NNNNN */
 TRANSACTION_PREFIX: 'OP-',
} as const;

/**
 * Rutas de la aplicación por rol
 */
export const APP_ROUTES = {
 /** Landing page pública */
 LANDING: '/',
 /** Panel de cliente */
 CLIENT: '/app',
 /** Panel de Admin/Cajero */
 PANEL: '/panel',
 /** Panel de Super Admin */
 ADMIN: '/admin',
 /** Autenticación */
 AUTH: {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
 },
} as const;

/**
 * Colores del Design System
 * Basado en: MASTER_PLAN_FENGXCHANGE.md
 */
export const COLORS = {
 /** Rojo Marca (Primary) - Logo, enlaces activos, CTAs */
 PRIMARY: '#AB2820',
 /** Azul Marino (Hero Gradient Start) */
 HERO_START: '#05294F',
 /** Azul (Hero Gradient End) */
 HERO_END: '#07478F',
 /** Borgoña/Vino (Botones) */
 BURGUNDY: '#8B2E34',
 /** Gris Oscuro (Texto) */
 TEXT_DARK: '#201816',
 /** Gris Claro (Fondo Formulario) */
 BG_FORM: '#F1F1F1',
 /** Blanco Puro */
 WHITE: '#FFFFFF',
 /** Verde WhatsApp */
 WHATSAPP: '#25D366',
} as const;

/**
 * Tipografía
 */
export const TYPOGRAPHY = {
 /** Fuente principal */
 FONT_FAMILY: 'Montserrat',
 /** Peso para títulos */
 TITLE_WEIGHT: 800,
 /** Peso para cuerpo */
 BODY_WEIGHT: 400,
 /** Tamaño máximo de título */
 TITLE_SIZE_MAX: '50px',
 /** Tamaño de cuerpo */
 BODY_SIZE: '16px',
} as const;
