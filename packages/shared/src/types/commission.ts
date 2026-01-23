/**
 * @fileoverview Tipos para sistema de comisiones
 * Basado en: MODELO_DATOS.md - Secciones 2.9 y 2.11
 * Lógica de negocio: LOGICA_NEGOCIO.md - Sección 5
 */

/**
 * Comisión generada por una transacción
 * Tabla: public.commissions
 * 
 * Regla: Cuando un cliente asociado realiza una operación,
 * la ganancia se divide 50% negocio, 50% agente
 */
export interface Commission {
 /** UUID, PK */
 id: string;
 /** FK → profiles - Usuario que gana la comisión */
 user_id: string;
 /** FK → transactions - Operación que generó la comisión */
 transaction_id: string;
 /** Ganancia total de la operación (precisión 18,2) */
 total_profit: number;
 /** Porcentaje asignado al agente (50.00) */
 commission_percent: number;
 /** Monto de comisión para el agente (precisión 18,2) */
 commission_amount: number;
 /** Mes de la comisión (1-12) */
 month: number;
 /** Año de la comisión */
 year: number;
 /** Fecha de creación */
 created_at: string;
}

/**
 * Comisión con datos expandidos para vistas
 */
export interface CommissionWithDetails extends Commission {
 /** Número de operación */
 transaction_number: string;
 /** Nombre del cliente */
 client_name: string;
}

/**
 * Historial mensual de comisiones por agente
 * Tabla: public.commission_history
 */
export interface CommissionHistory {
 /** UUID, PK */
 id: string;
 /** FK → profiles - Usuario */
 user_id: string;
 /** Mes */
 month: number;
 /** Año */
 year: number;
 /** Total de comisiones ganadas en el mes */
 total_earned: number;
 /** Total de descuentos por demoras (-$10 por cada 3 demoras) */
 total_deducted: number;
 /** Monto final a pagar (total_earned - total_deducted) */
 final_amount: number;
 /** Si ya se pagó la comisión */
 is_paid: boolean;
 /** Fecha de pago (si aplica) */
 paid_at: string | null;
}

/**
 * Resumen de comisiones para el dashboard de agente
 */
export interface AgentCommissionSummary {
 /** Total acumulado del mes actual */
 current_month_total: number;
 /** Número de pagos demorados en el mes */
 delayed_payments_count: number;
 /** Descuento aplicable ($10 por cada 3 demoras) */
 pending_deduction: number;
 /** Total neto estimado */
 estimated_net: number;
}

/**
 * Vista de comisiones para Super Admin
 */
export interface AgentCommissionOverview {
 user_id: string;
 agent_name: string;
 role: string;
 commissions_accumulated: number;
 delayed_payments_count: number;
 total_deducted: number;
 is_paid: boolean;
}

/**
 * Filtros para historial de comisiones
 */
export interface CommissionFilters {
 user_id?: string;
 month?: number;
 year?: number;
 from_date?: string;
 to_date?: string;
}
