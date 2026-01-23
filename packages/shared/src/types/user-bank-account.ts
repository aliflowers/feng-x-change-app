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
}

/**
 * Input para crear una cuenta de beneficiario
 */
export interface CreateUserBankAccountInput {
 bank_platform_id: number;
 account_number: string;
 account_holder: string;
 document_number: string;
 account_type?: string; // Ahora opcional, se asigna automáticamente
 email?: string;
 alias?: string;
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
}
