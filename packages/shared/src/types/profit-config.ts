/**
 * @fileoverview Tipo ProfitConfig - Configuración de ganancias USDT
 * Basado en: MODELO_DATOS.md - Sección 2.12
 * Lógica de negocio: LOGICA_NEGOCIO.md - Sección 6
 * 
 * Solo accesible por SUPER_ADMIN
 */

/**
 * Configuración de ganancias USDT
 * Tabla: public.profit_config
 */
export interface ProfitConfig {
 /** Serial, PK */
 id: number;
 /** FK → currencies - Moneda de configuración */
 currency_id: number;
 /** Tasa de compra de USDT (precisión 18,8) */
 usdt_buy_rate: number;
 /** Tasa de venta de USDT (precisión 18,8) */
 usdt_sell_rate: number;
 /** Comisión de Binance en porcentaje (precisión 5,2) */
 binance_commission_percent: number;
 /** Porcentaje de ganancia deseado (precisión 5,2) */
 target_profit_percent: number;
 /** Tasa calculada automáticamente para clientes (precisión 18,8) */
 calculated_client_rate: number;
 /** Última actualización */
 updated_at: string;
}

/**
 * Input para actualizar configuración de ganancias
 */
export interface UpdateProfitConfigInput {
 usdt_buy_rate?: number;
 usdt_sell_rate?: number;
 binance_commission_percent?: number;
 target_profit_percent?: number;
}

/**
 * Resultado del simulador de ganancias
 * El Super Admin ingresa el % deseado y el sistema calcula la tasa
 */
export interface ProfitSimulationResult {
 /** Porcentaje de ganancia deseado */
 target_profit_percent: number;
 /** Tasa de compra */
 buy_rate: number;
 /** Tasa de venta */
 sell_rate: number;
 /** Comisión de plataforma */
 platform_commission: number;
 /** Ganancia neta calculada */
 net_profit: number;
 /** Tasa recomendada para clientes */
 recommended_client_rate: number;
}
