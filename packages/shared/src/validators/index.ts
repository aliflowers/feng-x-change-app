/**
 * @fileoverview Validadores Zod para el sistema Fengxchange
 * Validación de todos los inputs de usuario
 */

import { z } from 'zod';
import type { BeneficiaryAccountCase, BeneficiaryUsdtNetwork } from '../types/user-bank-account';
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

const beneficiaryAccountCaseValues = [
 'STANDARD_BANK',
 'US_BANK',
 'MOBILE_WALLET',
 'USDT_WALLET',
 'BINANCE_PAY',
] as const satisfies readonly BeneficiaryAccountCase[];

const beneficiaryUsdtNetworkValues = [
 'TRC20',
 'ERC20',
 'BEP20',
 'POLYGON',
 'SOL',
 'ARBITRUM',
 'TON',
 'OTHER',
] as const satisfies readonly BeneficiaryUsdtNetwork[];

const optionalText = (maxLength = 200) =>
 z.preprocess(
  (value) => {
   if (typeof value !== 'string') return value;
   const normalized = value.trim();
   return normalized.length === 0 ? undefined : normalized;
  },
  z.string().max(maxLength).optional()
 );

const optionalEmail = z.preprocess(
 (value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
 },
 z.string().email().optional()
);

/**
 * Construye un esquema flexible para beneficiarios con reglas condicionales.
 * Mantiene compatibilidad con el payload histórico (`account_number`, `document_number`)
 * e incorpora reglas para ABA, USDT y Binance Pay.
 */
export const createUserBankAccountSchema = z
 .object({
  bank_platform_id: z.number().positive(),
  account_number: z.string().trim().min(1).max(120),
  account_holder: z.string().trim().min(3).max(100),
  document_number: optionalText(20),
  document_type: optionalText(40),
  account_type: optionalText(30), // Opcional, puede asignarse automáticamente
  email: optionalEmail,
  alias: optionalText(50),
  pago_movil_phone: z.string().regex(/^\d{11}$/).optional(),
  pago_movil_bank_code: z.string().regex(/^\d{4}$/).optional(),
  aba_routing_number: z.string().regex(/^\d{9}$/).optional(),
  usdt_network: z.enum(beneficiaryUsdtNetworkValues).optional(),
  wallet_address: optionalText(120),
  binance_pay_uid: optionalText(120),
  beneficiary_case: z.enum(beneficiaryAccountCaseValues).optional(),
  hide_document: z.boolean().optional(),
  requires_document: z.boolean().optional(),
 })
 .superRefine((data, ctx) => {
  const shouldHideDocument = data.hide_document === true;
  const shouldRequireDocument = data.requires_document !== false;

  if (!shouldHideDocument && shouldRequireDocument && !data.document_number) {
   ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['document_number'],
    message: 'El número de documento es obligatorio para este beneficiario',
   });
  }

  if (data.beneficiary_case === 'US_BANK' && !data.aba_routing_number) {
   ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['aba_routing_number'],
    message: 'El ABA routing number es obligatorio para cuentas bancarias de USA',
   });
  }

  if (data.beneficiary_case === 'USDT_WALLET') {
   if (!data.usdt_network) {
    ctx.addIssue({
     code: z.ZodIssueCode.custom,
     path: ['usdt_network'],
     message: 'La red de USDT es obligatoria',
    });
   }

   if (!data.wallet_address) {
    ctx.addIssue({
     code: z.ZodIssueCode.custom,
     path: ['wallet_address'],
     message: 'La dirección de wallet USDT es obligatoria',
    });
   }
  }

 });

/**
 * Variante para actualización parcial de beneficiarios.
 * Soporta los mismos campos extendidos sin forzar presencia de todos.
 */
export const updateUserBankAccountSchema = z
 .object({
  bank_platform_id: z.number().positive().optional(),
  account_number: z.string().trim().min(1).max(120).optional(),
  account_holder: z.string().trim().min(3).max(100).optional(),
  document_number: optionalText(20),
  document_type: optionalText(40),
  account_type: optionalText(30),
  email: optionalEmail,
  alias: optionalText(50),
  is_active: z.boolean().optional(),
  pago_movil_phone: z.string().regex(/^\d{11}$/).optional(),
  pago_movil_bank_code: z.string().regex(/^\d{4}$/).optional(),
  aba_routing_number: z.string().regex(/^\d{9}$/).optional(),
  usdt_network: z.enum(beneficiaryUsdtNetworkValues).optional(),
  wallet_address: optionalText(120),
  binance_pay_uid: optionalText(120),
  beneficiary_case: z.enum(beneficiaryAccountCaseValues).optional(),
  hide_document: z.boolean().optional(),
  requires_document: z.boolean().optional(),
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
