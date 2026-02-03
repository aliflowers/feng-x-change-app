// =========================================================================
// Herramientas del Agente IA FengBot
// Siguiendo api-design-principles para error handling consistente
// =========================================================================

import { createServerClient } from '@/lib/supabase/server';
import type {
  ExchangeRateResult,
  CalculationResult,
  Beneficiary,
  BankAccount,
  OperationResult,
  ToolResponse
} from '@/types/ai-types';
import type OpenAI from 'openai';

// =========================================================================
// Definiciones de herramientas para OpenAI Function Calling
// =========================================================================
export const AI_TOOLS: Record<string, OpenAI.ChatCompletionTool> = {
  get_exchange_rates: {
    type: 'function',
    function: {
      name: 'get_exchange_rates',
      description: 'Obtiene las tasas de cambio actuales entre monedas. Usa esta función para consultar las tasas disponibles.',
      parameters: {
        type: 'object',
        properties: {
          from_currency: {
            type: 'string',
            description: 'Código de moneda origen (USD, EUR, etc). Opcional.'
          },
          to_currency: {
            type: 'string',
            description: 'Código de moneda destino (VES, CLP, etc). Opcional.'
          }
        }
      }
    }
  },

  calculate_amount: {
    type: 'function',
    function: {
      name: 'calculate_amount',
      description: 'Calcula el monto que recibirá el cliente aplicando la tasa de cambio actual.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Monto a enviar'
          },
          from_currency: {
            type: 'string',
            description: 'Código de moneda origen'
          },
          to_currency: {
            type: 'string',
            description: 'Código de moneda destino'
          }
        },
        required: ['amount', 'from_currency', 'to_currency']
      }
    }
  },

  get_client_beneficiaries: {
    type: 'function',
    function: {
      name: 'get_client_beneficiaries',
      description: 'Obtiene la lista de beneficiarios registrados del cliente.',
      parameters: {
        type: 'object',
        properties: {
          client_phone: {
            type: 'string',
            description: 'Número de teléfono del cliente (se proporciona automáticamente)'
          }
        }
      }
    }
  },

  get_company_bank_accounts: {
    type: 'function',
    function: {
      name: 'get_company_bank_accounts',
      description: 'Obtiene las cuentas bancarias de la empresa para recibir pagos en una moneda específica.',
      parameters: {
        type: 'object',
        properties: {
          currency_code: {
            type: 'string',
            description: 'Código de moneda (USD, VES, CLP, etc)'
          },
          exclude_paypal: {
            type: 'boolean',
            description: 'Si es true, excluye las cuentas PayPal'
          }
        },
        required: ['currency_code']
      }
    }
  },

  create_operation: {
    type: 'function',
    function: {
      name: 'create_operation',
      description: 'Crea una nueva operación de cambio en el sistema. Solo usar cuando el cliente confirme todos los datos. IMPORTANTE: La moneda de destino (to_currency) se infiere automáticamente de la cuenta del beneficiario, por lo que NO es necesario proporcionarla.',
      parameters: {
        type: 'object',
        properties: {
          amount_sent: {
            type: 'number',
            description: 'Monto que envía el cliente'
          },
          from_currency: {
            type: 'string',
            description: 'Moneda de origen (ej: USD, EUR). Es la moneda que el cliente ENVÍA.'
          },
          to_currency: {
            type: 'string',
            description: 'OPCIONAL. Moneda de destino. Se infiere automáticamente de la cuenta del beneficiario si no se proporciona.'
          },
          beneficiary_id: {
            type: 'string',
            description: 'ID del beneficiario seleccionado (obtenido de get_client_beneficiaries)'
          },
          proof_url: {
            type: 'string',
            description: 'URL del comprobante de pago (opcional)'
          },
          extracted_reference: {
            type: 'string',
            description: 'Referencia extraída del comprobante (opcional)'
          }
        },
        required: ['amount_sent', 'from_currency', 'beneficiary_id']
      }
    }
  }
};

// =========================================================================
// Ejecutor de herramientas
// =========================================================================
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResponse<unknown>> {
  switch (toolName) {
    case 'get_exchange_rates':
      return getExchangeRates(args as { from_currency?: string; to_currency?: string });

    case 'calculate_amount':
      return calculateAmount(args as { amount: number; from_currency: string; to_currency: string });

    case 'get_client_beneficiaries':
      return getClientBeneficiaries(args as { client_phone: string });

    case 'get_company_bank_accounts':
      return getCompanyBankAccounts(args as { currency_code: string; exclude_paypal?: boolean });

    case 'create_operation':
      return createOperation(args as {
        client_phone: string;
        amount_sent: number;
        from_currency: string;
        to_currency: string;
        beneficiary_id: string;
        proof_url?: string;
        extracted_reference?: string;
      });

    default:
      return {
        success: false,
        error: { code: 'UNKNOWN_TOOL', message: `Herramienta desconocida: ${toolName}` }
      };
  }
}

// =========================================================================
// HERRAMIENTA: get_exchange_rates
// =========================================================================
export async function getExchangeRates(
  args: { from_currency?: string; to_currency?: string }
): Promise<ToolResponse<ExchangeRateResult[]>> {
  const supabase = createServerClient();

  try {
    // 1. Obtener todas las monedas activas para mapear códigos a IDs
    const { data: currencies } = await supabase
      .from('currencies')
      .select('id, code')
      .eq('is_active', true);

    if (!currencies) {
      return { success: false, error: { code: 'DB_ERROR', message: 'No currencies found' } };
    }

    const currencyMap = new Map(currencies.map(c => [c.code, c.id]));

    // 2. Construir query base
    // Seleccionamos las relaciones para poder devolver los códigos
    let query = supabase
      .from('exchange_rates')
      .select(`
        rate, 
        updated_at,
        from_currency:currencies!exchange_rates_from_currency_id_fkey(code),
        to_currency:currencies!exchange_rates_to_currency_id_fkey(code)
      `)
      .eq('is_active', true);

    // 3. Aplicar filtros si se proporcionan argumentos
    if (args.from_currency) {
      const fromId = currencyMap.get(args.from_currency);
      if (fromId) {
        query = query.eq('from_currency_id', fromId);
      } else {
        // Si la moneda no existe, no habrá tasas
        return { success: true, data: [] };
      }
    }

    if (args.to_currency) {
      const toId = currencyMap.get(args.to_currency);
      if (toId) {
        query = query.eq('to_currency_id', toId);
      } else {
        return { success: true, data: [] };
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching rates:', error);
      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message }
      };
    }

    // 4. Formatear resultados - SIN updated_at (no mostrar al usuario)
    // TypeScript no sabe automáticamente que las relaciones vienen populadas como objetos
    const formattedData = (data as any[]).map(rate => ({
      from_currency: rate.from_currency.code,
      to_currency: rate.to_currency.code,
      rate: rate.rate
    }));

    return { success: true, data: formattedData };

  } catch (err) {
    console.error('Unexpected error in getExchangeRates:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected error getting rates' }
    };
  }
}

// =========================================================================
// HERRAMIENTA: calculate_amount
// =========================================================================
export async function calculateAmount(
  args: { amount: number; from_currency: string; to_currency: string }
): Promise<ToolResponse<CalculationResult>> {
  // Validación de entrada
  if (args.amount <= 0) {
    return {
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'El monto debe ser mayor a 0' }
    };
  }

  const supabase = createServerClient();

  // 1. Obtener IDs de las monedas por sus códigos
  const { data: currencies, error: currencyError } = await supabase
    .from('currencies')
    .select('id, code')
    .in('code', [args.from_currency.toUpperCase(), args.to_currency.toUpperCase()])
    .eq('is_active', true);

  if (currencyError || !currencies || currencies.length < 2) {
    return {
      success: false,
      error: {
        code: 'CURRENCY_NOT_FOUND',
        message: `Moneda no encontrada: ${args.from_currency} o ${args.to_currency}`
      }
    };
  }

  // Crear mapa de código -> ID
  const currencyMap = new Map(currencies.map(c => [c.code.toUpperCase(), c.id]));
  const fromId = currencyMap.get(args.from_currency.toUpperCase());
  const toId = currencyMap.get(args.to_currency.toUpperCase());

  if (!fromId || !toId) {
    return {
      success: false,
      error: {
        code: 'CURRENCY_NOT_FOUND',
        message: `Moneda no válida: ${!fromId ? args.from_currency : args.to_currency}`
      }
    };
  }

  // 2. Buscar tasa usando IDs (NO códigos)
  const { data: rate, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency_id', fromId)
    .eq('to_currency_id', toId)
    .eq('is_active', true)
    .single();

  if (error || !rate) {
    return {
      success: false,
      error: {
        code: 'RATE_NOT_FOUND',
        message: `No hay tasa de cambio disponible de ${args.from_currency} a ${args.to_currency}`
      }
    };
  }

  const amount_received = args.amount * rate.rate;

  return {
    success: true,
    data: {
      amount_sent: args.amount,
      from_currency: args.from_currency.toUpperCase(),
      amount_received: Number(amount_received.toFixed(2)),
      to_currency: args.to_currency.toUpperCase(),
      rate_applied: rate.rate
    }
  };
}

// =========================================================================
// HERRAMIENTA: get_client_beneficiaries
// =========================================================================
export async function getClientBeneficiaries(
  args: { client_phone: string }
): Promise<ToolResponse<Beneficiary[]>> {
  const supabase = createServerClient();

  // Limpiar número para búsqueda flexible
  const cleanPhone = args.client_phone.replace(/[^0-9]/g, '');
  const phoneWithPlus = `+${cleanPhone}`;

  // Buscar cliente por whatsapp_number o phone_number
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', cleanPhone)
    .single();

  if (!profile) {
    const { data: profileByPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneWithPlus)
      .single();
    profile = profileByPhone;
  }

  if (!profile) {
    return {
      success: false,
      error: { code: 'CLIENT_NOT_FOUND', message: 'Cliente no registrado con este número de WhatsApp' }
    };
  }

  // Obtener beneficiarios del cliente con TODOS los campos necesarios
  // Incluye la moneda de la cuenta mediante JOIN con banks_platforms y currencies
  const { data, error } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      alias,
      bank_name,
      account_holder,
      document_type,
      document_number,
      account_number,
      account_type,
      email,
      bank_platform_id,
      banks_platforms!bank_platform_id (
        currency_id,
        currencies!currency_id (
          code
        )
      )
    `)
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('alias');

  if (error) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: error.message }
    };
  }

  // Mapear la respuesta para incluir currency_code de forma plana
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beneficiaries: Beneficiary[] = (data || []).map((row: any) => ({
    id: row.id,
    alias: row.alias,
    bank_name: row.bank_name,
    account_holder: row.account_holder,
    document_type: row.document_type,
    document_number: row.document_number,
    account_number: row.account_number,
    account_type: row.account_type,
    email: row.email,
    currency_code: row.banks_platforms?.currencies?.code || 'VES' // Default VES para cuentas venezolanas
  }));

  return { success: true, data: beneficiaries };
}

// =========================================================================
// HERRAMIENTA: get_company_bank_accounts
// =========================================================================
export async function getCompanyBankAccounts(
  args: { currency_code: string; exclude_paypal?: boolean }
): Promise<ToolResponse<BankAccount[]>> {
  const supabase = createServerClient();

  // Primero obtener el ID de la moneda por su código
  const { data: currency } = await supabase
    .from('currencies')
    .select('id')
    .eq('code', args.currency_code)
    .single();

  if (!currency) {
    return {
      success: false,
      error: { code: 'CURRENCY_NOT_FOUND', message: `Moneda ${args.currency_code} no encontrada` }
    };
  }

  let query = supabase
    .from('banks_platforms')
    .select(`
      id,
      name,
      account_holder,
      account_number,
      type
    `)
    .eq('currency_id', currency.id)
    .eq('is_active', true);

  if (args.exclude_paypal) {
    query = query.neq('type', 'PAYPAL');
  }

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: error.message }
    };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNTS', message: `No hay cuentas disponibles para ${args.currency_code}` }
    };
  }

  // IMPORTANTE: Nunca incluir saldos
  interface BankRow { id: number; name: string; account_holder: string; account_number: string; type: string }
  const accounts: BankAccount[] = (data || []).map((bank: BankRow) => ({
    id: String(bank.id),
    bank_name: bank.name,
    account_holder: bank.account_holder,
    account_number: bank.account_number,
    account_type: bank.type,
    currency: args.currency_code,
    is_paypal: bank.type === 'PAYPAL'
  }));

  return { success: true, data: accounts };
}

// =========================================================================
// HERRAMIENTA: create_operation
// =========================================================================
export async function createOperation(
  args: {
    client_phone: string;
    amount_sent: number;
    from_currency: string;
    to_currency?: string; // Ahora es OPCIONAL - se infiere del beneficiario si no se proporciona
    beneficiary_id: string;
    proof_url?: string;
    extracted_reference?: string;
  }
): Promise<ToolResponse<OperationResult>> {
  const supabase = createServerClient();

  // Validaciones
  if (args.amount_sent <= 0) {
    return {
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'Monto inválido' }
    };
  }

  // Obtener beneficiario con su moneda asociada
  const { data: beneficiary } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      banks_platforms!bank_platform_id (
        currency_id,
        currencies!currency_id (
          code
        )
      )
    `)
    .eq('id', args.beneficiary_id)
    .single();

  if (!beneficiary) {
    return {
      success: false,
      error: { code: 'BENEFICIARY_NOT_FOUND', message: 'Beneficiario no encontrado' }
    };
  }

  // Inferir moneda destino de la cuenta del beneficiario
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beneficiaryData = beneficiary as any;
  const inferredToCurrency = beneficiaryData.banks_platforms?.currencies?.code;

  // Usar to_currency proporcionado, o inferir del beneficiario
  const to_currency = args.to_currency || inferredToCurrency || 'VES';

  // Validar que las monedas no sean iguales (no tiene sentido)
  if (args.from_currency === to_currency) {
    return {
      success: false,
      error: {
        code: 'SAME_CURRENCY',
        message: `No se puede crear operación con la misma moneda (${args.from_currency} → ${to_currency}). La cuenta del beneficiario está en ${inferredToCurrency || 'moneda desconocida'}.`
      }
    };
  }

  // Obtener cliente
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', args.client_phone)
    .single();

  if (!profile) {
    return {
      success: false,
      error: { code: 'CLIENT_NOT_FOUND', message: 'Cliente no registrado' }
    };
  }

  // Obtener IDs de las monedas
  // Usamos un Set para evitar duplicados si from y to son iguales
  const uniqueCurrencies = [...new Set([args.from_currency, args.to_currency])];

  const { data: currencies } = await supabase
    .from('currencies')
    .select('id, code')
    .in('code', uniqueCurrencies);

  if (!currencies || currencies.length !== uniqueCurrencies.length) {
    // Verificar cuál moneda falta
    const foundCodes = currencies?.map(c => c.code) || [];
    const missingCodes = uniqueCurrencies.filter(c => !foundCodes.includes(c));
    return {
      success: false,
      error: {
        code: 'CURRENCY_NOT_FOUND',
        message: `Moneda(s) no encontrada(s): ${missingCodes.join(', ')}. Monedas válidas: USD, VES, CLP, COP, PEN, EUR`
      }
    };
  }

  const fromCurrencyId = currencies.find(c => c.code === args.from_currency)?.id;
  const toCurrencyId = currencies.find(c => c.code === args.to_currency)?.id;

  if (!fromCurrencyId || !toCurrencyId) {
    return {
      success: false,
      error: { code: 'CURRENCY_NOT_FOUND', message: `Moneda no válida: from=${args.from_currency}, to=${args.to_currency}` }
    };
  }

  // Obtener tasa actual usando IDs de moneda
  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('rate, id')
    .eq('from_currency_id', fromCurrencyId)
    .eq('to_currency_id', toCurrencyId)
    .eq('is_active', true)
    .single();

  if (!rate) {
    return {
      success: false,
      error: { code: 'RATE_NOT_FOUND', message: `Tasa no disponible para ${args.from_currency} → ${args.to_currency}` }
    };
  }

  const amount_received = args.amount_sent * rate.rate;

  // Generar número de transacción único
  const transactionNumber = `FX-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // Crear transacción en el Pool
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: profile.id,
      user_bank_account_id: args.beneficiary_id,
      amount_sent: args.amount_sent,
      amount_received: Number(amount_received.toFixed(2)),
      from_currency: args.from_currency,
      to_currency: args.to_currency,
      exchange_rate_id: rate.id,
      rate_applied: rate.rate,
      status: 'POOL',
      source: 'WHATSAPP_AI',
      transaction_number: transactionNumber,
      customer_proof_url: args.proof_url,
      customer_reference: args.extracted_reference
    })
    .select('id, transaction_number')
    .single();

  if (error) {
    return {
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message }
    };
  }

  // Registrar webhook para notificación cuando se complete la operación
  // Esto habilita el sistema de eventos de la Fase 3
  await supabase.from('operation_webhooks').insert({
    transaction_id: transaction.id,
    phone_number: args.client_phone,
    status: 'pending'
  });

  return {
    success: true,
    data: {
      success: true,
      transaction_id: transaction.id,
      transaction_number: transaction.transaction_number
    }
  };
}
