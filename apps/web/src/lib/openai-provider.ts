// =========================================================================
// Proveedor de OpenAI - Enfoque Híbrido (Clean Architecture)
// API Key desde variable de entorno, configuración desde BD
// =========================================================================

import OpenAI from 'openai';
import type {
  AIConfig,
  ClientContext,
  EnhancedClientContext,
  ExtractedPaymentData,
  ChatMessage,
} from '@/types/ai-types';
import { AI_TOOLS, executeToolCall } from '@/lib/ai-tools';

// =========================================================================
// Interface del proveedor (Port)
// =========================================================================
export interface AIProvider {
  processMessage(
    message: string,
    history: ChatMessage[],
    context: ClientContext
  ): Promise<{ response: string; tokensUsed: number }>;

  analyzeImage(
    imageUrl: string,
    type: 'payment_proof'
  ): Promise<ExtractedPaymentData>;
}

// =========================================================================
// Implementación OpenAI (Adapter) - ENFOQUE HÍBRIDO
// =========================================================================
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    // ✅ API key viene de variable de entorno (NUNCA de BD)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada en variables de entorno');
    }

    this.client = new OpenAI({ apiKey });
    this.config = config; // Configuración (prompt, capacidades) viene de BD
  }

  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ClientContext
  ): Promise<{ response: string; tokensUsed: number }> {
    // Construir prompt con contexto
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ],
      // IMPORTANTE: gpt-5-nano NO soporta temperature
      // Usar reasoning_effort en su lugar
      ...(this.config.model === 'gpt-5-nano' ? {
        reasoning_effort: this.config.reasoning_effort
      } : {
        temperature: 0.7
      }),
      max_completion_tokens: this.config.max_tokens,
      tools: this.getEnabledTools()
    });

    const tokensUsed = response.usage?.total_tokens || 0;
    const responseMessage = await this.handleResponse(response, history, context);

    return { response: responseMessage, tokensUsed };
  }

  async analyzeImage(
    imageUrl: string,
    type: 'payment_proof'
  ): Promise<ExtractedPaymentData> {
    const prompt = type === 'payment_proof'
      ? `Analiza este comprobante de pago y extrae la siguiente información. 
         Responde ÚNICAMENTE en formato JSON con las siguientes claves:
         - amount: número del monto (solo el número, sin símbolos)
         - currency: código de moneda (USD, VES, CLP, etc.)
         - reference: número de referencia o transacción
         - bank: nombre del banco o plataforma
         - date: fecha del pago en formato YYYY-MM-DD
         - confidence: número entre 0 y 1 indicando tu confianza en la extracción
         
         Si no puedes identificar algún campo, usa null.`
      : '';

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_completion_tokens: 500,
      response_format: { type: 'json_object' }
    });

    try {
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return {
        amount: null,
        currency: null,
        reference: null,
        bank: null,
        date: null,
        confidence: 0
      };
    }
  }

  private buildSystemPrompt(context: ClientContext | EnhancedClientContext): string {
    let prompt = this.config.system_prompt || '';

    // Añadir contexto del cliente
    if (context.isRegistered) {
      prompt += `

# CONTEXTO DEL CLIENTE ACTUAL
- Nombre: ${context.clientName}
- Email: ${context.clientEmail || 'No registrado'}
- Documento: ${context.clientDocument || 'No registrado'}
- Teléfono: ${context.phoneNumber}
- Estado: Cliente verificado ✓`;
    } else {
      prompt += `

# NOTA: Usuario NO registrado
Teléfono: ${context.phoneNumber}
Puedes responder consultas de tasas pero NO crear operaciones.`;
    }

    // Inyectar estado de operación si existe (EnhancedClientContext)
    if ('currentFlowState' in context && context.currentFlowState !== 'idle') {
      const enhanced = context as EnhancedClientContext;
      prompt += `

# ESTADO DE OPERACIÓN EN CURSO
Fase actual: ${enhanced.currentFlowState}`;

      if (enhanced.operationDraft) {
        const draft = enhanced.operationDraft;
        prompt += `
Datos recopilados:
- Beneficiario: ${draft.beneficiaryName || 'No seleccionado'}
- Monto: ${draft.amount ? `${draft.amount} ${draft.fromCurrency || ''}` : 'No indicado'}
- Método pago: ${draft.selectedPaymentMethod || 'No seleccionado'}
- Tasa: ${draft.exchangeRate || 'No consultada'}`;
      }

      if (enhanced.conversationSummary && enhanced.conversationSummary.length > 0) {
        prompt += `

Resumen reciente:
${enhanced.conversationSummary.join('\n')}`;
      }

      prompt += `

IMPORTANTE: NO repitas preguntas sobre datos ya recopilados.`;
    }

    return prompt;
  }

  private getEnabledTools(): OpenAI.ChatCompletionTool[] {
    const tools: OpenAI.ChatCompletionTool[] = [];

    if (this.config.can_query_rates) {
      tools.push(AI_TOOLS.get_exchange_rates);
    }

    if (this.config.can_calculate_amounts) {
      tools.push(AI_TOOLS.calculate_amount);
    }

    if (this.config.can_list_beneficiaries) {
      tools.push(AI_TOOLS.get_client_beneficiaries);
    }

    if (this.config.can_create_operations) {
      tools.push(AI_TOOLS.get_company_bank_accounts);
      tools.push(AI_TOOLS.create_operation);
    }

    return tools;
  }

  private async handleResponse(
    response: OpenAI.ChatCompletion,
    history: ChatMessage[],
    context: ClientContext
  ): Promise<string> {
    const message = response.choices[0].message;

    // Si hay tool calls, ejecutarlos
    if (message.tool_calls && message.tool_calls.length > 0) {
      return this.executeToolCalls(message.tool_calls, history, context, message);
    }

    return message.content || 'Lo siento, no pude procesar tu mensaje. ¿Puedo ayudarte en algo más?';
  }

  private async executeToolCalls(
    toolCalls: OpenAI.ChatCompletionMessageToolCall[],
    history: ChatMessage[],
    context: ClientContext,
    assistantMessage: OpenAI.ChatCompletionMessage
  ): Promise<string> {
    // Ejecutar todas las tool calls
    const toolResults: OpenAI.ChatCompletionToolMessageParam[] = [];

    for (const toolCall of toolCalls) {
      let result;
      const toolName = toolCall.function.name;

      try {
        // Parsear argumentos con validación
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`[AI Tool] Executing: ${toolName}`, { args });

        // Ejecutar con timeout de 15 segundos
        result = await Promise.race([
          executeToolCall(toolName, { ...args, client_phone: context.phoneNumber }),
          new Promise<{ success: false; error: { code: string; message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error(`TIMEOUT: ${toolName} tardó más de 15 segundos`)), 15000)
          )
        ]);

        // Logging del resultado
        if (result.success) {
          console.log(`[AI Tool] Success: ${toolName}`, { dataLength: JSON.stringify(result.data).length });
        } else {
          console.warn(`[AI Tool] Failed: ${toolName}`, result.error);
        }

      } catch (error) {
        // Capturar errores de parsing, timeout, u otros
        console.error(`[AI Tool] Error executing ${toolName}:`, error);
        result = {
          success: false,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Error desconocido ejecutando herramienta'
          }
        };
      }

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    // Continuar la conversación con los resultados
    // IMPORTANTE: Incluir instrucción explícita para responder en lenguaje natural
    const continuationResponse = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(context) },
        ...history,
        assistantMessage,
        ...toolResults,
        // Instrucción explícita para evitar que devuelva JSON crudo
        {
          role: 'user',
          content: 'Responde en lenguaje natural, no en JSON. Formatea los datos de manera amigable para el usuario.'
        }
      ],
      ...(this.config.model === 'gpt-5-nano' ? {
        reasoning_effort: this.config.reasoning_effort
      } : {
        temperature: 0.7
      }),
      max_completion_tokens: this.config.max_tokens,
      // Habilitar tools en la continuación por si necesita llamar más
      tools: this.getEnabledTools()
    });

    const responseMessage = continuationResponse.choices[0].message;

    // Si el modelo quiere hacer más tool calls, ejecutarlas recursivamente
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      return this.executeToolCalls(responseMessage.tool_calls, history, context, responseMessage);
    }

    let content = responseMessage.content || 'He procesado tu solicitud. ¿Necesitas algo más?';

    // Validar que la respuesta no sea JSON crudo
    // Si detectamos JSON, pedimos al modelo que lo reformatee
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content); // Si es JSON válido, reformatear
        const reformatResponse = await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: 'Eres un asistente. Convierte este JSON a lenguaje natural amigable en español. NO devuelvas JSON, solo texto.' },
            { role: 'user', content: `Convierte esto a texto natural: ${content}` }
          ],
          max_completion_tokens: 500
        });
        content = reformatResponse.choices[0].message.content || content;
      } catch {
        // No es JSON válido, usar como está
      }
    }

    return content;
  }
}

// =========================================================================
// Factory function para crear el proveedor
// =========================================================================
export function createOpenAIProvider(config: AIConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}

// =========================================================================
// Verificar si la API key está configurada
// =========================================================================
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
