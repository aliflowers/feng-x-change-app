/**
 * @fileoverview Validadores Zod para el sistema Fengxchange
 * Validación de todos los inputs de usuario
 */

import { z } from 'zod';
import {
 UserRole,
 TransactionStatus,
 DocumentType,
 BankPlatformType,
} from '../types/enums';

// ============================================
// PROFILE VALIDATORS
// ============================================

export const createClientProfileSchema = z.object({
 first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
 last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50),
 email: z.string().email('Email inválido'),
 phone_number: z.string().optional(),
 country: z.string().optional(),
 document_type: z.nativeEnum(DocumentType).optional(),
 document_number: z.string().optional(),
});

export const createInternalUserSchema = z.object({
 first_name: z.string().min(2).max(50),
 last_name: z.string().min(2).max(50),
 email: z.string().email(),
 phone_number: z.string().optional(),
 role: z.enum([UserRole.ADMIN, UserRole.CAJERO, UserRole.SUPERVISOR]),
 temporary_password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const updateProfileSchema = z.object({
 first_name: z.string().min(2).max(50).optional(),
 last_name: z.string().min(2).max(50).optional(),
 phone_number: z.string().optional(),
 country: z.string().optional(),
 document_type: z.nativeEnum(DocumentType).optional(),
 document_number: z.string().optional(),
});

// ============================================
// CURRENCY VALIDATORS
// ============================================

export const createCurrencySchema = z.object({
 code: z.string().min(3).max(3).toUpperCase(),
 name: z.string().min(3).max(50),
 symbol: z.string().min(1).max(5),
 is_active: z.boolean().optional().default(true),
});

export const updateCurrencySchema = z.object({
 name: z.string().min(3).max(50).optional(),
 symbol: z.string().min(1).max(5).optional(),
 is_active: z.boolean().optional(),
});

// ============================================
// EXCHANGE RATE VALIDATORS
// ============================================

export const upsertExchangeRateSchema = z.object({
 from_currency_id: z.number().positive(),
 to_currency_id: z.number().positive(),
 rate: z.number().positive('La tasa debe ser mayor a 0'),
}).refine(
 (data) => data.from_currency_id !== data.to_currency_id,
 { message: 'Las monedas de origen y destino deben ser diferentes' }
);

// ============================================
// BANK PLATFORM VALIDATORS
// ============================================

export const createBankPlatformSchema = z.object({
 name: z.string().min(2).max(100),
 type: z.nativeEnum(BankPlatformType),
 currency_id: z.number().positive(),
 account_number: z.string().min(5).max(50),
 account_holder: z.string().min(5).max(100),
 current_balance: z.number().min(0).optional().default(0),
 is_active: z.boolean().optional().default(true),
});

export const updateBankPlatformSchema = z.object({
 name: z.string().min(2).max(100).optional(),
 account_number: z.string().min(5).max(50).optional(),
 account_holder: z.string().min(5).max(100).optional(),
 is_active: z.boolean().optional(),
});

// ============================================
// TRANSACTION VALIDATORS
// ============================================

export const createTransactionSchema = z.object({
 from_currency_id: z.number().positive(),
 to_currency_id: z.number().positive(),
 amount_sent: z.number().positive('El monto debe ser mayor a 0'),
 client_proof_url: z.string().url('URL de comprobante inválida'),
}).refine(
 (data) => data.from_currency_id !== data.to_currency_id,
 { message: 'Las monedas de origen y destino deben ser diferentes' }
);

export const completeTransactionSchema = z.object({
 transaction_id: z.string().uuid(),
 payment_reference: z.string().min(3, 'La referencia es requerida'),
 payment_proof_url: z.string().url('URL de comprobante inválida'),
 bank_platform_id: z.number().positive(),
});

export const rejectTransactionSchema = z.object({
 transaction_id: z.string().uuid(),
 reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
});

// ============================================
// USER BANK ACCOUNT VALIDATORS
// ============================================

export const createUserBankAccountSchema = z.object({
 bank_platform_id: z.number().positive(),
 account_number: z.string().min(5).max(50),
 account_holder: z.string().min(3).max(100),
 document_number: z.string().min(4).max(20),
 account_type: z.string().optional(), // Ahora opcional, se asigna automáticamente
 email: z.string().email().optional().or(z.literal('')),
 alias: z.string().max(50).optional(),
});

export const updateUserBankAccountSchema = z.object({
 bank_platform_id: z.number().positive().optional(),
 account_number: z.string().min(5).max(50).optional(),
 account_holder: z.string().min(3).max(100).optional(),
 document_number: z.string().min(4).max(20).optional(),
 account_type: z.string().optional(),
 email: z.string().email().optional().or(z.literal('')),
 alias: z.string().max(50).optional(),
 is_active: z.boolean().optional(),
});

// ============================================
// PROFIT CONFIG VALIDATORS
// ============================================

export const updateProfitConfigSchema = z.object({
 usdt_buy_rate: z.number().positive().optional(),
 usdt_sell_rate: z.number().positive().optional(),
 binance_commission_percent: z.number().min(0).max(100).optional(),
 target_profit_percent: z.number().min(0).max(100).optional(),
});

// ============================================
// AUTH VALIDATORS
// ============================================

export const loginSchema = z.object({
 email: z.string().email('Email inválido'),
 password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
 email: z.string().email('Email inválido'),
 password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
 confirmPassword: z.string(),
 first_name: z.string().min(2),
 last_name: z.string().min(2),
 phone_number: z.string().optional(),
}).refine(
 (data) => data.password === data.confirmPassword,
 { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] }
);

// ============================================
// FILTER VALIDATORS
// ============================================

export const transactionFiltersSchema = z.object({
 client_name: z.string().optional(),
 document_number: z.string().optional(),
 country: z.string().optional(),
 reference_number: z.string().optional(),
 bank_platform_id: z.number().positive().optional(),
 from_date: z.string().datetime().optional(),
 to_date: z.string().datetime().optional(),
 currency_id: z.number().positive().optional(),
 min_amount: z.number().min(0).optional(),
 max_amount: z.number().positive().optional(),
 status: z.nativeEnum(TransactionStatus).optional(),
});

export const commissionFiltersSchema = z.object({
 user_id: z.string().uuid().optional(),
 month: z.number().min(1).max(12).optional(),
 year: z.number().min(2024).max(2100).optional(),
 from_date: z.string().datetime().optional(),
 to_date: z.string().datetime().optional(),
});
