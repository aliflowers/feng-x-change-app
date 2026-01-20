/**
 * @fileoverview Tipo Transaction - Operaciones de cambio
 * Basado en: MODELO_DATOS.md - Sección 2.7
 */

import { TransactionStatus } from './enums';
import { Currency } from './currency';
import { ProfileSummary } from './profile';
import { BankPlatform } from './bank-platform';

/**
 * Operación/Transacción de cambio de divisas
 * Tabla: public.transactions
 */
export interface Transaction {
 /** UUID, PK */
 id: string;
 /** Número de operación único (ej: "OP-2026-00042") */
 transaction_number: string;
 /** FK → profiles - Cliente que creó la operación */
 user_id: string;
 /** FK → currencies - Moneda que envía el cliente */
 from_currency_id: number;
 /** FK → currencies - Moneda que recibe el cliente */
 to_currency_id: number;
 /** Monto enviado por el cliente (precisión 18,2) */
 amount_sent: number;
 /** Tasa de cambio congelada al momento de crear la operación (precisión 18,8) */
 exchange_rate_applied: number;
 /** Monto calculado a recibir (precisión 18,2) */
 amount_received: number;
 /** URL del comprobante subido por el cliente */
 client_proof_url: string;
 /** Estado actual de la operación */
 status: TransactionStatus;
 /** FK → profiles - Agente que tomó la operación (null si está en POOL) */
 taken_by: string | null;
 /** Timestamp cuando se tomó la operación */
 taken_at: string | null;
 /** URL del comprobante del pago al beneficiario */
 payment_proof_url: string | null;
 /** Referencia del pago realizado */
 payment_reference: string | null;
 /** Timestamp cuando se marcó como pagada */
 paid_at: string | null;
 /** FK → banks_platforms - Banco usado para pagar */
 bank_platform_id: number | null;
 /** Notas internas (ej: motivo de rechazo) */
 admin_notes: string | null;
 /** Fecha de creación de la operación */
 created_at: string;
 /** Última actualización */
 updated_at: string;
}

/**
 * Transacción con todas las relaciones expandidas (para vistas detalladas)
 */
export interface TransactionWithDetails extends Transaction {
 /** Cliente que creó la operación */
 user: ProfileSummary;
 /** Moneda de origen */
 from_currency: Currency;
 /** Moneda de destino */
 to_currency: Currency;
 /** Agente que procesó (si aplica) */
 taken_by_user: ProfileSummary | null;
 /** Banco/plataforma usada para el pago */
 bank_platform: BankPlatform | null;
}

/**
 * Input para crear una nueva operación (cliente)
 */
export interface CreateTransactionInput {
 /** Moneda que envía */
 from_currency_id: number;
 /** Moneda que quiere recibir */
 to_currency_id: number;
 /** Monto que envía */
 amount_sent: number;
 /** URL del comprobante de pago del cliente */
 client_proof_url: string;
}

/**
 * Input para tomar una operación (agente)
 */
export interface TakeTransactionInput {
 transaction_id: string;
}

/**
 * Input para completar una operación (agente marca como pagada)
 */
export interface CompleteTransactionInput {
 transaction_id: string;
 /** Referencia del pago realizado */
 payment_reference: string;
 /** URL del comprobante del pago */
 payment_proof_url: string;
 /** Banco/plataforma usado para pagar */
 bank_platform_id: number;
}

/**
 * Input para rechazar una operación (solo Super Admin)
 */
export interface RejectTransactionInput {
 transaction_id: string;
 /** Motivo del rechazo */
 reason: string;
}

/**
 * Vista resumida para el Pool de Operaciones
 */
export interface TransactionPoolItem {
 id: string;
 transaction_number: string;
 client_name: string;
 amount_sent: number;
 from_currency_code: string;
 amount_received: number;
 to_currency_code: string;
 bank_destination: string;
 client_proof_url: string;
 status: TransactionStatus;
 created_at: string;
}

/**
 * Filtros para el Pool de Operaciones
 */
export interface TransactionFilters {
 client_name?: string;
 document_number?: string;
 country?: string;
 reference_number?: string;
 bank_platform_id?: number;
 from_date?: string;
 to_date?: string;
 currency_id?: number;
 min_amount?: number;
 max_amount?: number;
 status?: TransactionStatus;
}
