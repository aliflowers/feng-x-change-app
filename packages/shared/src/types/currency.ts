/**
 * @fileoverview Tipo Currency - Catálogo de monedas
 * Basado en: MODELO_DATOS.md - Sección 2.3
 */

/**
 * Moneda del sistema
 * Tabla: public.currencies
 */
export interface Currency {
 /** Serial, PK - ID autoincremental */
 id: number;
 /** Código ISO de la moneda (USD, VES, COP, PEN) - Único */
 code: string;
 /** Nombre completo (ej: "Dólar Americano") */
 name: string;
 /** Símbolo de la moneda (ej: "$", "Bs") */
 symbol: string;
 /** Si la moneda está disponible para operaciones */
 is_active: boolean;
}

/**
 * Input para crear una nueva moneda
 */
export interface CreateCurrencyInput {
 code: string;
 name: string;
 symbol: string;
 is_active?: boolean;
}

/**
 * Input para actualizar una moneda
 */
export interface UpdateCurrencyInput {
 name?: string;
 symbol?: string;
 is_active?: boolean;
}
