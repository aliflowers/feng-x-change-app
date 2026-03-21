/**
 * @fileoverview Tipo UserBankAccount - Cuentas bancarias de beneficiarios (clientes)
 * Basado en: MODELO_DATOS.md - Sección 2.8
 */

/**
 * Cuenta bancaria de un cliente (beneficiario)
 * Tabla: public.user_bank_accounts
 */
export interface UserBankAccount {
 /** UUID, PK */
 id: string;
 /** FK → profiles - Dueño de la cuenta */
 user_id: string;
 /** FK → banks_platforms - Banco o plataforma */
 bank_platform_id: number;
 /** Número de cuenta */
 account_number: string;
 /** Nombre del titular */
 account_holder: string;
 /** Documento del titular (C.I., RIF, NIT) */
 document_number: string;
 /** Tipo de cuenta (SAVINGS, CHECKING, WALLET) - ahora opcional */
 account_type?: string | null;
 /** Email asociado (opcional, para Zelle/Zinli) */
 email: string | null;
 /** Alias para identificar la cuenta */
 alias: string | null;
 /** Si la cuenta está activa */
 is_active: boolean;
 /** Tipo de documento (CI-V, CI-E, RIF-J, RIF-G, etc.) */
 document_type?: string | null;
 /** Teléfono para Pago Móvil (11 dígitos) */
 pago_movil_phone?: string | null;
 /** Código de banco para Pago Móvil (4 dígitos) */
 pago_movil_bank_code?: string | null;
 /** Código ABA para transferencias en USA (9 dígitos) */
 aba_routing_number?: string | null;
 /** Red de la wallet USDT (TRC20, ERC20, BEP20, etc.) */
 usdt_network?: BeneficiaryUsdtNetwork | null;
 /** Dirección explícita de wallet cuando aplica */
 wallet_address?: string | null;
 /** UID numérico para Binance Pay */
 binance_pay_uid?: string | null;
}

/**
 * Casos de captura de beneficiario para validaciones condicionales.
 */
export type BeneficiaryAccountCase =
 | 'STANDARD_BANK'
 | 'US_BANK'
 | 'MOBILE_WALLET'
 | 'USDT_WALLET'
 | 'BINANCE_PAY';

/**
 * Redes soportadas para wallets USDT.
 */
export type BeneficiaryUsdtNetwork =
 | 'TRC20'
 | 'ERC20'
 | 'BEP20'
 | 'POLYGON'
 | 'SOL'
 | 'ARBITRUM'
 | 'TON'
 | 'OTHER';

/**
 * Input para crear una cuenta de beneficiario
 */
export interface CreateUserBankAccountInput {
 bank_platform_id: number;
 account_number: string;
 account_holder: string;
 document_number?: string;
 account_type?: string;
 email?: string;
 alias?: string;
 document_type?: string;
 pago_movil_phone?: string;
 pago_movil_bank_code?: string;
 aba_routing_number?: string;
 usdt_network?: BeneficiaryUsdtNetwork;
 wallet_address?: string;
 binance_pay_uid?: string;
 beneficiary_case?: BeneficiaryAccountCase;
 hide_document?: boolean;
 requires_document?: boolean;
}

/**
 * Input para actualizar una cuenta de beneficiario
 */
export interface UpdateUserBankAccountInput {
 bank_platform_id?: number;
 account_number?: string;
 account_holder?: string;
 document_number?: string;
 account_type?: string;
 email?: string;
 alias?: string;
 is_active?: boolean;
 document_type?: string;
 pago_movil_phone?: string;
 pago_movil_bank_code?: string;
 aba_routing_number?: string;
 usdt_network?: BeneficiaryUsdtNetwork;
 wallet_address?: string;
 binance_pay_uid?: string;
 beneficiary_case?: BeneficiaryAccountCase;
 hide_document?: boolean;
 requires_document?: boolean;
}
