/**
 * @fileoverview Enums del sistema Fengxchange
 * Basado en: MODELO_DATOS.md
 */

/**
 * Roles de usuario en el sistema
 * - CLIENT: Usuario final que realiza operaciones de cambio
 * - CAJERO: Procesa operaciones de sus clientes, tiene timer de 15 min
 * - ADMIN: Gestiona transacciones de sus clientes, tiene timer de 15 min
 * - SUPER_ADMIN: Acceso total, crea usuarios, ve ganancias, sin timer
 */
export enum UserRole {
 CLIENT = 'CLIENT',
 CAJERO = 'CAJERO',
 ADMIN = 'ADMIN',
 SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Estados de una transacción/operación
 * - POOL: En cola, esperando ser tomada
 * - TAKEN: Agente la tomó, timer corriendo (15 min)
 * - COMPLETED: Pagada exitosamente
 * - REJECTED: Rechazada por el Super Admin
 */
export enum TransactionStatus {
 POOL = 'POOL',
 TAKEN = 'TAKEN',
 COMPLETED = 'COMPLETED',
 REJECTED = 'REJECTED',
}

/**
 * Tipos de documento de identidad
 */
export enum DocumentType {
 DNI = 'DNI',
 PASAPORTE = 'PASAPORTE',
 CE = 'CE', // Carnet de Extranjería
}

/**
 * Tipos de banco/plataforma
 */
export enum BankPlatformType {
 BANK = 'BANK',
 PLATFORM = 'PLATFORM',
}

/**
 * Tipos de movimiento bancario
 */
export enum MovementType {
 CREDIT = 'CREDIT',
 DEBIT = 'DEBIT',
}
