/**
 * @fileoverview Tipo Profile - Extiende auth.users con datos de negocio
 * Basado en: MODELO_DATOS.md - Sección 2.2
 */

import { DocumentType, UserRole } from './enums';

/**
 * Perfil completo de usuario
 * Tabla: public.profiles
 */
export interface Profile {
 /** UUID, PK, FK → auth.users - Mismo ID que auth.users */
 id: string;
 /** Nombre del usuario */
 first_name: string;
 /** Apellido del usuario */
 last_name: string;
 /** Email (duplicado de auth.users para queries rápidas) */
 email: string;
 /** Teléfono con código de país (ej: +51999888777) */
 phone_number: string | null;
 /** País de residencia */
 country: string | null;
 /** Tipo de documento de identidad */
 document_type: DocumentType | null;
 /** Número de documento (único en el sistema) */
 document_number: string | null;
 /** Rol del usuario en el sistema */
 role: UserRole;
 /** Código de agente único (solo para ADMIN/CAJERO) - Ej: AG-X7K2P */
 agent_code: string | null;
 /** FK → profiles.id - Agente asociado (solo para CLIENT) */
 agent_id: string | null;
 /** Estado de verificación KYC */
 is_kyc_verified: boolean;
 /** True para nuevos ADMIN/CAJERO que deben cambiar contraseña */
 must_change_password: boolean;
 /** Fecha de registro */
 created_at: string;
}

/**
 * Input para crear un nuevo perfil de cliente
 */
export interface CreateClientProfileInput {
 first_name: string;
 last_name: string;
 email: string;
 phone_number?: string;
 country?: string;
 document_type?: DocumentType;
 document_number?: string;
 /** Código de agente opcional para asociación */
 agent_code?: string;
}

/**
 * Input para crear un usuario interno (ADMIN/CAJERO)
 * Solo el Super Admin puede ejecutar esta acción
 */
export interface CreateInternalUserInput {
 first_name: string;
 last_name: string;
 email: string;
 phone_number?: string;
 /** Rol a asignar (ADMIN o CAJERO) */
 role: UserRole.ADMIN | UserRole.CAJERO;
 /** Contraseña temporal que el usuario deberá cambiar */
 temporary_password: string;
}

/**
 * Input para actualizar un perfil
 */
export interface UpdateProfileInput {
 first_name?: string;
 last_name?: string;
 phone_number?: string;
 country?: string;
 document_type?: DocumentType;
 document_number?: string;
}

/**
 * Vista resumida de un perfil para listados
 */
export interface ProfileSummary {
 id: string;
 first_name: string;
 last_name: string;
 email: string;
 role: UserRole;
 is_kyc_verified: boolean;
 agent_code: string | null;
 created_at: string;
}
