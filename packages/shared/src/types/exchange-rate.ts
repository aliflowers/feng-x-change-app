/**
 * @fileoverview Tipo ExchangeRate - Tasas de cambio entre pares
 * Basado en: MODELO_DATOS.md - Sección 2.4
 */

import { Currency } from './currency';

/**
 * Tasa de cambio entre dos monedas
 * Tabla: public.exchange_rates
 */
export interface ExchangeRate {
 /** Serial, PK - ID autoincremental */
 id: number;
 /** FK → currencies - Moneda origen */
 from_currency_id: number;
 /** FK → currencies - Moneda destino */
 to_currency_id: number;
 /** Valor de la tasa de cambio (precisión 18,8) */
 rate: number;
 /** Última actualización */
 updated_at: string;
 /** FK → profiles - Quién modificó la tasa */
 updated_by: string;
}

/**
 * Tasa de cambio con monedas expandidas (para vistas)
 */
export interface ExchangeRateWithCurrencies extends ExchangeRate {
 from_currency: Currency;
 to_currency: Currency;
}

/**
 * Input para crear/actualizar una tasa de cambio
 */
export interface UpsertExchangeRateInput {
 from_currency_id: number;
 to_currency_id: number;
 rate: number;
}

/**
 * Historial de cambios de tasa (para auditoría)
 */
export interface ExchangeRateHistory {
 id: number;
 exchange_rate_id: number;
 old_rate: number;
 new_rate: number;
 changed_by: string;
 changed_at: string;
}
