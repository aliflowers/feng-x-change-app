// =========================================================================
// Tipos del dominio para el Agente IA FengBot
// Siguiendo typescript-advanced-types: Discriminated Unions y tipos genéricos
// =========================================================================

import type OpenAI from 'openai';

// =========================================================================
// Discriminated Union para estado de la conversación
// =========================================================================
export type ConversationState =
 | { status: 'idle' }
 | { status: 'awaiting_beneficiary'; options: Beneficiary[] }
 | { status: 'awaiting_payment_method'; methods: PaymentMethod[] }
 | { status: 'awaiting_payment_proof'; expectedAmount: number; currency: string }
 | { status: 'awaiting_confirmation'; extractedData: ExtractedPaymentData }
 | { status: 'operation_created'; operationId: string };

// =========================================================================
// Tipos para herramientas del agente
// =========================================================================
export type AIToolName =
 | 'get_exchange_rates'
 | 'calculate_amount'
 | 'get_client_beneficiaries'
 | 'get_company_bank_accounts'
 | 'create_operation';

export type AIToolResult<T extends AIToolName> =
 T extends 'get_exchange_rates' ? ExchangeRateResult[] :
 T extends 'calculate_amount' ? CalculationResult :
 T extends 'get_client_beneficiaries' ? Beneficiary[] :
 T extends 'get_company_bank_accounts' ? BankAccount[] :
 T extends 'create_operation' ? OperationResult :
 never;

// =========================================================================
// Configuración del modelo
// ⚠️ API key NO está en este tipo - viene de process.env.OPENAI_API_KEY
// =========================================================================
export interface AIConfig {
 id: string;
 is_enabled: boolean;
 provider: 'openai';
 model: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-4o' | 'gpt-4o-mini';
 system_prompt: string | null;
 reasoning_effort: 'low' | 'medium' | 'high'; // NO temperature para gpt-5-nano
 max_tokens: number;
 can_query_rates: boolean;
 can_calculate_amounts: boolean;
 can_list_beneficiaries: boolean;
 can_create_operations: boolean;
 can_analyze_images: boolean;
 notify_on_payment_complete: boolean;
 created_at: string;
 updated_at: string;
}

// =========================================================================
// Datos extraídos de comprobantes
// =========================================================================
export interface ExtractedPaymentData {
 amount: number | null;
 currency: string | null;
 reference: string | null;
 bank: string | null;
 date: string | null;
 confidence: number; // 0-1
}

// =========================================================================
// Contexto del cliente
// =========================================================================
export interface ClientContext {
 isRegistered: boolean;
 clientId: string | null;
 clientName: string | null;
 clientEmail: string | null;
 clientDocument: string | null;
 phoneNumber: string;
 conversationState: ConversationState;
}

// =========================================================================
// Contexto mejorado con estado de operación (Fase 2 refactorización)
// =========================================================================
export type OperationFlowState =
 | 'idle'
 | 'selecting_beneficiary'
 | 'confirming_amount'
 | 'selecting_payment_method'
 | 'awaiting_proof'
 | 'creating_operation';

export interface OperationDraft {
 beneficiaryId?: string;
 beneficiaryName?: string;
 amount?: number;
 fromCurrency?: string;
 toCurrency?: string;
 selectedPaymentMethod?: string;
 exchangeRate?: number;
}

export interface EnhancedClientContext extends ClientContext {
 currentFlowState: OperationFlowState;
 operationDraft: OperationDraft | null;
 conversationSummary: string[]; // Últimas 3 interacciones clave
}

// =========================================================================
// Mensaje entrante
// =========================================================================
export type IncomingMessage =
 | { type: 'text'; content: string }
 | { type: 'image'; url: string; caption?: string };

// =========================================================================
// Resultado de herramientas
// =========================================================================
export interface ExchangeRateResult {
 from_currency: string;
 to_currency: string;
 rate: number;
 // updated_at removido - no mostrar al usuario
}

export interface CalculationResult {
 amount_sent: number;
 from_currency: string;
 amount_received: number;
 to_currency: string;
 rate_applied: number;
}

export interface Beneficiary {
 // ID solo para uso interno del agente, NO mostrar al usuario
 id: string;
 alias: string;
 bank_name: string;
 account_holder: string;
 document_type: string | null;
 document_number: string | null;
 account_number: string | null;
 account_type: string;
 email: string | null;
 currency_code: string; // USD, VES, CLP, etc. para saber moneda destino
}

export interface BankAccount {
 id: string;
 bank_name: string;
 account_holder: string;
 account_number: string;
 account_type: string;
 currency: string;
 is_paypal: boolean;
}

export interface OperationResult {
 success: boolean;
 transaction_id?: string;
 transaction_number?: string;
 error?: string;
}

// =========================================================================
// Métodos de pago
// =========================================================================
export interface PaymentMethod {
 id: string;
 type: 'BANK_TRANSFER' | 'PAYPAL' | 'ZELLE' | 'MOBILE_PAYMENT';
 name: string;
 currency: string;
}

// =========================================================================
// Resultado estándar de herramientas (api-design-principles)
// =========================================================================
export interface ToolResponse<T> {
 success: boolean;
 data?: T;
 error?: {
  code: string;
  message: string;
 };
}

// =========================================================================
// Mensajes de chat (historial)
// =========================================================================
export type ChatMessage = OpenAI.ChatCompletionMessageParam;

// =========================================================================
// Conversación almacenada en BD
// =========================================================================
export interface AIConversation {
 id: string;
 phone_number: string;
 profile_id: string | null;
 message_type: 'incoming' | 'outgoing';
 message_content: string | null;
 message_media_url: string | null;
 extracted_data: ExtractedPaymentData | Record<string, unknown>;
 whatsapp_message_id: string | null;
 tokens_used: number;
 created_at: string;
}

// =========================================================================
// Respuesta del endpoint de configuración
// =========================================================================
export interface AIConfigResponse extends AIConfig {
 api_key_status: 'configured' | 'missing';
}
