/**
 * @fileoverview Tipo DelayedPayment - Registro de pagos demorados
 * Basado en: MODELO_DATOS.md - Sección 2.10
 * Lógica de negocio: LOGICA_NEGOCIO.md - Sección 4
 * 
 * Regla: Si el timer de 15 minutos expira sin completar la operación,
 * se registra 1 "Pago Demorado". 3 demoras en 1 mes = -$10 USD de comisiones.
 */

/**
 * Registro de un pago demorado (penalización)
 * Tabla: public.delayed_payments
 */
export interface DelayedPayment {
 /** UUID, PK */
 id: string;
 /** FK → profiles - Usuario penalizado */
 user_id: string;
 /** FK → transactions - Operación que expiró */
 transaction_id: string;
 /** Timestamp cuando expiró el timer */
 occurred_at: string;
}

/**
 * Resumen de demoras de un agente
 */
export interface DelayedPaymentSummary {
 user_id: string;
 agent_name: string;
 /** Total de demoras en el mes actual */
 count_current_month: number;
 /** Descuento aplicable (-$10 por cada 3 demoras) */
 penalty_amount: number;
}

/**
 * Constantes del sistema de penalizaciones
 */
export const DELAYED_PAYMENT_CONSTANTS = {
 /** Número de demoras para aplicar descuento */
 THRESHOLD: 3,
 /** Monto de descuento en USD por cada threshold */
 PENALTY_USD: 10,
 /** Tiempo del timer en minutos */
 TIMER_MINUTES: 15,
} as const;
