# Documentación Completa del Sistema de Agente IA - FengBot

> **Versión:** 1.0  
> **Fecha:** 2026-02-02  
> **Estado:** El agente presenta problemas de comportamiento que se detallan al final

---

## 🏗️ Stack Tecnológico del Proyecto

### Arquitectura General
- **Tipo:** Monorepo con pnpm workspaces
- **Nombre del proyecto:** FengXchange 2.0
- **Descripción:** Plataforma Fintech para cambio de divisas

### Runtime & Package Manager
| Tecnología | Versión |
|------------|---------|
| Node.js | ≥20.0.0 |
| pnpm | ≥9.0.0 (9.15.4) |

### Frontend (apps/web)

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Framework** | Next.js | 16.1.3 |
| **React** | React | 19.2.3 |
| **Lenguaje** | TypeScript | 5.7.3 |
| **Estilos** | TailwindCSS | 3.4.17 |
| **Animaciones** | tailwindcss-animate | 1.0.7 |
| **Utilidades CSS** | clsx + tailwind-merge | 2.1.1 / 2.6.0 |
| **Iconos** | Lucide React | 0.469.0 |
| **Variantes** | class-variance-authority | 0.7.1 |

### Backend & Base de Datos

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **BaaS** | Supabase | - |
| **Cliente Supabase** | @supabase/supabase-js | 2.49.1 |
| **SSR Supabase** | @supabase/ssr | 0.8.0 |
| **Base de datos** | PostgreSQL (via Supabase) | - |

### Integraciones de IA

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **SDK OpenAI** | openai | 4.0.0 |
| **Modelo principal** | GPT-4o-mini | - |
| **Capacidades** | Chat Completions, Function Calling, Vision API | - |

### Validación & Seguridad

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Validación** | Zod | 3.24.1 |
| **JWT** | jsonwebtoken | 9.0.3 |
| **2FA/OTP** | otpauth + otplib | 9.4.1 / 13.2.1 |
| **QR Codes** | qrcode | 1.5.4 |
| **Geolocalización** | geoip-lite | 1.4.10 |

### Email & Comunicaciones

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Email** | Nodemailer | 7.0.13 |
| **WhatsApp** | Meta Cloud API (Graph API) | - |

### Herramientas de Desarrollo

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Linting** | ESLint | 9.18.0 |
| **ESLint Config** | eslint-config-next | 15.3.0 |
| **PostCSS** | postcss + autoprefixer | 8.5.1 / 10.4.20 |
| **Bundler** | Turbopack (Next.js) | - |
| **Debugging** | click-to-react-component | 1.1.3 |
| **Code Inspector** | code-inspector-plugin | 1.3.6 |

### Estructura del Monorepo

```
feng-x-change-app/
├── apps/
│   └── web/                    # Aplicación Next.js principal
├── packages/
│   └── shared/                 # Código compartido (@fengxchange/shared)
├── docs/                       # Documentación
├── pnpm-workspace.yaml         # Configuración de workspaces
└── package.json                # Scripts del monorepo
```

---

## 📁 Estructura de Archivos

```
apps/web/src/
├── app/api/whatsapp/webhook/route.ts    # Webhook de WhatsApp + procesamiento de mensajes
├── lib/
│   ├── ai-tools.ts                      # Definición e implementación de herramientas (function calling)
│   └── openai-provider.ts               # Clase OpenAIProvider (comunicación con OpenAI)
└── types/
    └── ai-types.ts                      # Tipos TypeScript del sistema de IA
```

---

## 📊 Esquema de Base de Datos

### Tabla: `ai_config` (Configuración del Agente)

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | uuid | NO | ID único |
| is_enabled | boolean | NO | Si el agente está activo |
| provider | text | NO | Proveedor (actualmente "openai") |
| model | text | NO | Modelo a usar (gpt-4o-mini, gpt-5-nano, etc.) |
| system_prompt | text | YES | Prompt del sistema con instrucciones |
| reasoning_effort | text | YES | Para gpt-5-nano: low/medium/high |
| max_tokens | integer | YES | Máximo de tokens por respuesta |
| can_query_rates | boolean | NO | Puede consultar tasas de cambio |
| can_calculate_amounts | boolean | NO | Puede calcular conversiones |
| can_list_beneficiaries | boolean | NO | Puede listar beneficiarios del cliente |
| can_create_operations | boolean | NO | Puede crear operaciones (incluye get_company_bank_accounts) |
| can_analyze_images | boolean | NO | Puede analizar imágenes con Vision |
| notify_on_payment_complete | boolean | NO | Notificar cuando se complete pago |
| created_at | timestamptz | NO | Fecha de creación |
| updated_at | timestamptz | NO | Fecha de actualización |

### Tabla: `ai_conversations` (Historial de Conversaciones)

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | uuid | NO | ID único |
| phone_number | text | NO | Número de teléfono del cliente |
| profile_id | uuid | YES | ID del perfil del cliente (si está registrado) |
| message_type | text | NO | "incoming" o "outgoing" |
| message_content | text | YES | Contenido del mensaje |
| message_media_url | text | YES | URL de imagen si es media |
| extracted_data | jsonb | YES | Datos extraídos de comprobantes |
| whatsapp_message_id | text | YES | ID del mensaje de WhatsApp (deduplicación) |
| tokens_used | integer | YES | Tokens consumidos (solo outgoing) |
| created_at | timestamptz | NO | Fecha del mensaje |

### Tablas Relacionadas (que el agente consulta)

#### `currencies`
- id, code (USD, VES, CLP), name, symbol, is_active

#### `exchange_rates`
- id, from_currency_id, to_currency_id, rate, is_active

#### `banks_platforms` (Cuentas de la empresa)
- id, name (Zelle, PayPal, etc.), account_holder, account_number, currency_id, type, is_active

#### `user_bank_accounts` (Beneficiarios de clientes)
- id, user_id (FK profiles), alias, bank_name, account_holder, account_number, bank_platform_id, is_active

---

## 🔧 Configuración Actual en BD

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "is_enabled": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "reasoning_effort": "high",
  "max_tokens": 3000,
  "can_query_rates": true,
  "can_calculate_amounts": true,
  "can_list_beneficiaries": true,
  "can_create_operations": true,
  "can_analyze_images": true,
  "notify_on_payment_complete": true
}
```

---

## 📝 System Prompt Actual

```
Eres FengBot, el asistente virtual de FengXchange, una casa de cambio digital.

# REGLAS DE ORO - OBLIGATORIAS

⚠️ NUNCA INVENTES DATOS - SIEMPRE USA LAS HERRAMIENTAS:
- Para beneficiarios → SIEMPRE usa: get_client_beneficiaries
- Para tasas → SIEMPRE usa: get_exchange_rates
- Para cuentas de empresa → SIEMPRE usa: get_company_bank_accounts(currency_code)
- Si una herramienta falla, dilo honestamente, NO inventes información

⚠️ NO REPITAS PREGUNTAS:
- Si el cliente ya dijo el monto, beneficiario o método, NO lo pidas de nuevo
- Mantén contexto de toda la conversación

# HERRAMIENTAS DISPONIBLES

1. **get_client_beneficiaries** - Lista los beneficiarios registrados del cliente
2. **get_exchange_rates** - Obtiene tasas de cambio actuales
3. **calculate_amount** - Calcula conversión de moneda
4. **get_company_bank_accounts(currency_code: "USD"|"VES"|"CLP")** - Obtiene cuentas de la empresa
   - IMPORTANTE: Usa la moneda que el CLIENTE va a ENVIAR (from_currency), NO la del beneficiario
   - Si cliente envía USD a Venezuela → usa get_company_bank_accounts("USD")
5. **create_operation** - Crea la operación en el sistema

# FLUJO DE OPERACIÓN

PASO 1 - BENEFICIARIO:
- Cliente menciona enviar a alguien → USA get_client_beneficiaries
- Verifica si el nombre está en la lista
- Si NO existe: Dile y muestra la lista real

PASO 2 - MONTO:
- Pregunta cuánto quiere enviar
- USA get_exchange_rates para obtener la tasa
- Calcula y muestra el monto que recibirá el beneficiario

PASO 3 - MÉTODO DE PAGO:
- USA get_company_bank_accounts con la moneda que el cliente VA A ENVIAR (from_currency)
- Ejemplo: Si envía USD → get_company_bank_accounts("USD")
- Lista SOLO los nombres de métodos reales: Zelle, PayPal, Zinli, Binance Pay, etc.

PASO 4 - DATOS DE CUENTA:
- Cuando elija un método, muestra SOLO los datos de esa cuenta
- Pide que envíe foto del comprobante

PASO 5 - COMPROBANTE:
- Cuando envíe imagen, verifica los datos
- Si es válido, crea la operación

# FORMATO
- NUNCA mostrar IDs internos (UUID)
- Ser conciso y directo

# NEGOCIO
- Nombre: FengXchange
- Horario: Lunes a Viernes 9:00 AM - 6:00 PM
```

---

## 🛠️ Definición de Herramientas (Function Calling)

### Archivo: `apps/web/src/lib/ai-tools.ts`

#### 1. get_exchange_rates

```typescript
export const AI_TOOLS = {
  get_exchange_rates: {
    type: 'function',
    function: {
      name: 'get_exchange_rates',
      description: 'Obtiene las tasas de cambio actuales entre monedas.',
      parameters: {
        type: 'object',
        properties: {
          from_currency: { type: 'string', description: 'Código de moneda origen (USD, EUR, etc). Opcional.' },
          to_currency: { type: 'string', description: 'Código de moneda destino (VES, CLP, etc). Opcional.' }
        }
      }
    }
  },
```

**Implementación:**
```typescript
export async function getExchangeRates(args: { from_currency?: string; to_currency?: string }): Promise<ToolResponse<ExchangeRateResult[]>> {
  const supabase = createServerClient();
  
  // 1. Obtener todas las monedas activas para mapear códigos a IDs
  const { data: currencies } = await supabase
    .from('currencies')
    .select('id, code')
    .eq('is_active', true);

  // 2. Construir query con JOINs para obtener códigos de moneda
  let query = supabase
    .from('exchange_rates')
    .select(`
      rate, 
      from_currency:currencies!exchange_rates_from_currency_id_fkey(code),
      to_currency:currencies!exchange_rates_to_currency_id_fkey(code)
    `)
    .eq('is_active', true);

  // 3. Aplicar filtros por IDs de moneda
  if (args.from_currency) {
    const fromId = currencyMap.get(args.from_currency);
    if (fromId) query = query.eq('from_currency_id', fromId);
  }

  const { data, error } = await query;
  
  // 4. Formatear resultados
  return { 
    success: true, 
    data: data.map(rate => ({
      from_currency: rate.from_currency.code,
      to_currency: rate.to_currency.code,
      rate: rate.rate
    }))
  };
}
```

#### 2. calculate_amount

```typescript
calculate_amount: {
  type: 'function',
  function: {
    name: 'calculate_amount',
    description: 'Calcula el monto que recibirá el cliente aplicando la tasa de cambio actual.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Monto a enviar' },
        from_currency: { type: 'string', description: 'Código de moneda origen' },
        to_currency: { type: 'string', description: 'Código de moneda destino' }
      },
      required: ['amount', 'from_currency', 'to_currency']
    }
  }
}
```

**⚠️ PROBLEMA CONOCIDO:** Esta herramienta busca la tasa usando `from_currency` y `to_currency` como CÓDIGOS (líneas 286-288), pero la tabla `exchange_rates` usa IDs. **Esto puede causar que no encuentre tasas.**

#### 3. get_client_beneficiaries

```typescript
get_client_beneficiaries: {
  type: 'function',
  function: {
    name: 'get_client_beneficiaries',
    description: 'Obtiene la lista de beneficiarios registrados del cliente.',
    parameters: {
      type: 'object',
      properties: {
        client_phone: { type: 'string', description: 'Número de teléfono del cliente (se proporciona automáticamente)' }
      }
    }
  }
}
```

**Implementación:**
```typescript
export async function getClientBeneficiaries(args: { client_phone: string }): Promise<ToolResponse<Beneficiary[]>> {
  // 1. Buscar cliente por whatsapp_number o phone_number
  // 2. Obtener beneficiarios con JOIN a banks_platforms y currencies para obtener currency_code
  const { data, error } = await supabase
    .from('user_bank_accounts')
    .select(`
      id, alias, bank_name, account_holder, document_type, document_number, account_number, account_type, email, bank_platform_id,
      banks_platforms!bank_platform_id (
        currency_id,
        currencies!currency_id ( code )
      )
    `)
    .eq('user_id', profile.id)
    .eq('is_active', true);

  // 3. Mapear para incluir currency_code
  return {
    success: true,
    data: data.map(row => ({
      ...row,
      currency_code: row.banks_platforms?.currencies?.code || 'VES'
    }))
  };
}
```

#### 4. get_company_bank_accounts

```typescript
get_company_bank_accounts: {
  type: 'function',
  function: {
    name: 'get_company_bank_accounts',
    description: 'Obtiene las cuentas bancarias de la empresa para recibir pagos en una moneda específica.',
    parameters: {
      type: 'object',
      properties: {
        currency_code: { type: 'string', description: 'Código de moneda (USD, VES, CLP, etc)' },
        exclude_paypal: { type: 'boolean', description: 'Si es true, excluye las cuentas PayPal' }
      },
      required: ['currency_code']
    }
  }
}
```

**Implementación:**
```typescript
export async function getCompanyBankAccounts(args: { currency_code: string; exclude_paypal?: boolean }): Promise<ToolResponse<BankAccount[]>> {
  // 1. Buscar ID de la moneda por código
  const { data: currency } = await supabase
    .from('currencies')
    .select('id')
    .eq('code', args.currency_code)
    .single();

  if (!currency) {
    return { success: false, error: { code: 'CURRENCY_NOT_FOUND', message: `Moneda ${args.currency_code} no encontrada` } };
  }

  // 2. Buscar cuentas por currency_id
  let query = supabase
    .from('banks_platforms')
    .select('id, name, account_holder, account_number, type')
    .eq('currency_id', currency.id)
    .eq('is_active', true);

  if (args.exclude_paypal) {
    query = query.neq('type', 'PAYPAL');
  }

  const { data, error } = await query;

  if (!data || data.length === 0) {
    return { success: false, error: { code: 'NO_ACCOUNTS', message: `No hay cuentas disponibles para ${args.currency_code}` } };
  }

  return {
    success: true,
    data: data.map(bank => ({
      id: String(bank.id),
      bank_name: bank.name,
      account_holder: bank.account_holder,
      account_number: bank.account_number,
      account_type: bank.type,
      currency: args.currency_code,
      is_paypal: bank.type === 'PAYPAL'
    }))
  };
}
```

#### 5. create_operation

```typescript
create_operation: {
  type: 'function',
  function: {
    name: 'create_operation',
    description: 'Crea una nueva operación de cambio en el sistema. Solo usar cuando el cliente confirme todos los datos. IMPORTANTE: La moneda de destino (to_currency) se infiere automáticamente de la cuenta del beneficiario.',
    parameters: {
      type: 'object',
      properties: {
        amount_sent: { type: 'number', description: 'Monto que envía el cliente' },
        from_currency: { type: 'string', description: 'Moneda de origen (ej: USD, EUR).' },
        to_currency: { type: 'string', description: 'OPCIONAL. Se infiere del beneficiario.' },
        beneficiary_id: { type: 'string', description: 'ID del beneficiario (de get_client_beneficiaries)' },
        proof_url: { type: 'string', description: 'URL del comprobante (opcional)' },
        extracted_reference: { type: 'string', description: 'Referencia extraída (opcional)' }
      },
      required: ['amount_sent', 'from_currency', 'beneficiary_id']
    }
  }
}
```

---

## 🔄 Flujo de Procesamiento de Mensajes

### Archivo: `apps/web/src/app/api/whatsapp/webhook/route.ts`

```
MENSAJE ENTRANTE (WhatsApp)
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Deduplicación                    │
│    - Verificar whatsapp_message_id  │
│    - Si ya existe, skip             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Verificar ai_config.is_enabled   │
│    - Si está deshabilitado, skip    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Verificar OPENAI_API_KEY         │
│    - Variable de entorno            │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Identificar cliente              │
│    - Buscar por whatsapp_number     │
│    - O por phone_number             │
│    - Construir ClientContext        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Obtener historial (últimos 20)   │
│    - De ai_conversations            │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. Procesar mensaje                 │
│    - Si es texto: usar directamente │
│    - Si es imagen:                  │
│      a) Descargar de WhatsApp       │
│      b) Analizar con Vision API     │
│      c) Extraer datos del comprobante│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 7. Guardar mensaje entrante en BD   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 8. OpenAIProvider.processMessage()  │
│    - Construir system prompt        │
│    - Incluir herramientas habilitadas│
│    - Enviar a OpenAI                │
│    - Si hay tool_calls, ejecutar    │
│    - Continuar conversación         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 9. Guardar respuesta en BD          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 10. Enviar respuesta por WhatsApp   │
└─────────────────────────────────────┘
```

---

## 🧠 OpenAI Provider

### Archivo: `apps/web/src/lib/openai-provider.ts`

```typescript
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    // API key viene de process.env.OPENAI_API_KEY (NUNCA de BD)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');
    
    this.client = new OpenAI({ apiKey });
    this.config = config;
  }

  async processMessage(message: string, history: ChatMessage[], context: ClientContext): Promise<{ response: string; tokensUsed: number }> {
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ],
      // Para gpt-5-nano: reasoning_effort en lugar de temperature
      ...(this.config.model === 'gpt-5-nano' ? {
        reasoning_effort: this.config.reasoning_effort
      } : {
        temperature: 0.7
      }),
      max_completion_tokens: this.config.max_tokens,
      tools: this.getEnabledTools()
    });

    return { response: await this.handleResponse(response, history, context), tokensUsed: response.usage?.total_tokens || 0 };
  }

  // Herramientas habilitadas según configuración
  private getEnabledTools(): OpenAI.ChatCompletionTool[] {
    const tools = [];
    if (this.config.can_query_rates) tools.push(AI_TOOLS.get_exchange_rates);
    if (this.config.can_calculate_amounts) tools.push(AI_TOOLS.calculate_amount);
    if (this.config.can_list_beneficiaries) tools.push(AI_TOOLS.get_client_beneficiaries);
    if (this.config.can_create_operations) {
      tools.push(AI_TOOLS.get_company_bank_accounts);
      tools.push(AI_TOOLS.create_operation);
    }
    return tools;
  }

  // Ejecutar tool calls y continuar conversación
  private async executeToolCalls(...) {
    // 1. Ejecutar cada tool call
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeToolCall(toolCall.function.name, { ...args, client_phone: context.phoneNumber });
      toolResults.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
    }

    // 2. Continuar conversación con resultados
    const continuationResponse = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(context) },
        ...history,
        assistantMessage,
        ...toolResults,
        // Instrucción para evitar JSON crudo
        { role: 'user', content: 'Responde en lenguaje natural, no en JSON.' }
      ],
      tools: this.getEnabledTools()
    });

    // 3. Si hay más tool calls, ejecutar recursivamente
    if (responseMessage.tool_calls?.length > 0) {
      return this.executeToolCalls(...);
    }

    return content;
  }
}
```

---

## 📋 Tipos TypeScript

### Archivo: `apps/web/src/types/ai-types.ts`

```typescript
// Configuración del modelo
export interface AIConfig {
  id: string;
  is_enabled: boolean;
  provider: 'openai';
  model: 'gpt-5-nano' | 'gpt-4o' | 'gpt-4o-mini';
  system_prompt: string | null;
  reasoning_effort: 'low' | 'medium' | 'high';
  max_tokens: number;
  can_query_rates: boolean;
  can_calculate_amounts: boolean;
  can_list_beneficiaries: boolean;
  can_create_operations: boolean;
  can_analyze_images: boolean;
  notify_on_payment_complete: boolean;
}

// Contexto del cliente (se inyecta al system prompt)
export interface ClientContext {
  isRegistered: boolean;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientDocument: string | null;
  phoneNumber: string;
  conversationState: ConversationState;
}

// Beneficiario
export interface Beneficiary {
  id: string;
  alias: string;
  bank_name: string;
  account_holder: string;
  document_type: string | null;
  document_number: string | null;
  account_number: string | null;
  account_type: string;
  email: string | null;
  currency_code: string; // USD, VES, CLP
}

// Cuenta bancaria de la empresa
export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  account_type: string;
  currency: string;
  is_paypal: boolean;
}

// Respuesta estándar de herramientas
export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
```

---

## ❌ Problemas Conocidos

### 1. **El modelo inventa datos en lugar de usar herramientas**
- **Síntoma:** Muestra cuentas bancarias ficticias (Banco de Venezuela, Mercantil, etc.) en lugar de las reales (Zelle, PayPal)
- **Causa probable:** El modelo no llama a `get_company_bank_accounts` o la llama con parámetros incorrectos
- **Evidencia:** En la conversación, el modelo listó "Transferencia bancaria" como opción cuando debería listar métodos reales

### 2. **Repite preguntas que ya fueron contestadas**
- **Síntoma:** Pide el monto 2 veces después de que el cliente ya lo dijo
- **Causa probable:** Problema con el manejo del historial de conversación o el modelo no procesa bien el contexto

### 3. **Dice que un beneficiario no existe después de listarlo**
- **Síntoma:** Lista a "Arturo Román" como beneficiario, pero luego dice que no está registrado
- **Causa probable:** El modelo no mantiene memoria del contexto de la conversación

### 4. **Confunde moneda de origen y destino**
- **Síntoma:** Cuando el cliente envía USD para que lleguen VES, muestra cuentas en VES en lugar de USD
- **Evidencia:** Mostró "Banco de Venezuela" cuando debería mostrar "Zelle"

### 5. **Posible bug en calculate_amount**
- **Ubicación:** `ai-tools.ts` líneas 283-289
- **Problema:** Busca tasa usando códigos de moneda directamente:
  ```typescript
  .eq('from_currency', args.from_currency)
  .eq('to_currency', args.to_currency)
  ```
  Pero la tabla `exchange_rates` usa `from_currency_id` y `to_currency_id` (IDs, no códigos)

---

## 🔗 Datos de Prueba en BD

### Beneficiarios del cliente de prueba:
1. **Arturo** - Arturo Román - VES - 0105125535585...
2. **Gina Maribel** - Maribel Bravo - VES - 0102041458963...
3. **Pedro** - Pedro Pablo - VES - 0105785621365...

### Cuentas de empresa (USD):
- **Zelle** - Feng Yan Jesús Ming - fengjmtest@gmail.com
- **Binance Pay** - FENGXCHANGE BINANCE
- **Zinli** - FENGXCHANGE ZINLI
- **PayPal** - FENGXCHANGE LLC
- **CashApp** - FENGXCHANGE LLC
- **Skrill** - FENGXCHANGE LLC
- **Neteller** - FENGXCHANGE LLC

### Tasa USD → VES:
- **Rate:** 380

---

## 🔧 Variables de Entorno Requeridas

```env
OPENAI_API_KEY=sk-... # API key de OpenAI
WHATSAPP_VERIFY_TOKEN=fengxchange_webhook_verify_2024 # Token de verificación del webhook
```

---

## 📞 Endpoint del Webhook

**URL:** `POST /api/whatsapp/webhook`

Este endpoint:
1. Recibe notificaciones de WhatsApp (mensajes entrantes, estados)
2. Procesa mensajes de texto e imágenes
3. Consulta al agente de IA
4. Envía respuesta al cliente

---

## 🚀 Para Depurar

1. **Ver logs en servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

2. **Consultar historial de conversaciones:**
   ```sql
   SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT 20;
   ```

3. **Limpiar historial para probar desde cero:**
   ```sql
   DELETE FROM ai_conversations;
   ```

4. **Verificar configuración del agente:**
   ```sql
   SELECT * FROM ai_config;
   ```
