/**
 * @fileoverview Tipos BankPlatform y BankMovement
 * Basado en: MODELO_DATOS.md - Secciones 2.5 y 2.6
 */

import { BankPlatformType, MovementType } from './enums';
import { Currency } from './currency';

/**
 * Banco o plataforma con saldo
 * Tabla: public.banks_platforms
 */
export interface BankPlatform {
 /** Serial, PK - ID autoincremental */
 id: number;
 /** Nombre del banco/plataforma (ej: "Banesco", "Binance") */
 name: string;
 /** Tipo: BANK o PLATFORM */
 type: BankPlatformType;
 /** FK → currencies - Moneda que maneja esta cuenta */
 currency_id: number;
 /** Número de cuenta */
 account_number: string;
 /** Nombre del titular de la cuenta */
 account_holder: string;
 /** Saldo actual (precisión 18,2) */
 current_balance: number;
 /** Si el banco/plataforma está activo */
 is_active: boolean;
}

/**
 * Banco/Plataforma con moneda expandida (para vistas)
 */
export interface BankPlatformWithCurrency extends BankPlatform {
 currency: Currency;
}

/**
 * Input para crear un banco/plataforma
 */
export interface CreateBankPlatformInput {
 name: string;
 type: BankPlatformType;
 currency_id: number;
 account_number: string;
 account_holder: string;
 current_balance?: number;
 is_active?: boolean;
}

/**
 * Input para actualizar un banco/plataforma
 */
export interface UpdateBankPlatformInput {
 name?: string;
 account_number?: string;
 account_holder?: string;
 is_active?: boolean;
}

/**
 * Movimiento bancario (entrada/salida)
 * Tabla: public.bank_movements
 */
export interface BankMovement {
 /** UUID, PK */
 id: string;
 /** FK → banks_platforms - Cuenta afectada */
 bank_platform_id: number;
 /** Tipo de movimiento: CREDIT o DEBIT */
 type: MovementType;
 /** Monto del movimiento (precisión 18,2) */
 amount: number;
 /** FK → transactions - Operación relacionada (opcional) */
 transaction_id: string | null;
 /** Descripción del movimiento */
 description: string | null;
 /** Fecha del movimiento */
 created_at: string;
}

/**
 * Input para registrar un movimiento
 */
export interface CreateBankMovementInput {
 bank_platform_id: number;
 type: MovementType;
 amount: number;
 transaction_id?: string;
 description?: string;
}
