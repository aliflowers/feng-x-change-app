# Plan de Refactorización: Agente IA FengBot

> **Versión:** 1.0  
> **Fecha:** 2026-02-02  
> **Enfoque:** Conservador - Cambios graduales con testing entre fases

---

## 📋 Resumen Ejecutivo

Refactorización del agente de IA en 4 fases con enfoque conservador (cambios graduales con testing entre cada fase).

**Objetivo:** Eliminar alucinaciones, mejorar coherencia conversacional, e implementar notificaciones proactivas.

**Modelo:** GPT-5-mini (con fallback a gpt-5-nano)

**Arquitectura:** Híbrida - OpenAI SDK + Sistema de Eventos con Supabase Triggers

---

## 🎯 Fase 1: Correcciones Críticas (3-4 días)

### Objetivo
Corregir bugs fundamentales que causan alucinaciones.

### Tareas

#### 1.1 Corregir bug en `calculate_amount`
- **Archivo:** `apps/web/src/lib/ai-tools.ts` (líneas 283-289)
- **Problema:** Busca tasas por código de moneda pero la tabla usa IDs
- **Solución:** Convertir códigos a IDs antes de consultar

```typescript
// ANTES (roto)
.eq('from_currency', args.from_currency)
.eq('to_currency', args.to_currency)

// DESPUÉS (correcto)
const { data: currencies } = await supabase
  .from('currencies')
  .select('id, code')
  .in('code', [args.from_currency, args.to_currency]);
  
.eq('from_currency_id', fromId)
.eq('to_currency_id', toId)
```

#### 1.2 Añadir validación de tool calls
- **Archivo:** `apps/web/src/lib/openai-provider.ts`
- **Implementar:** Función `executeToolCallWithValidation()`
- **Validaciones:**
  - Verificar que herramienta está habilitada
  - Verificar parámetros requeridos
  - Timeout de 10 segundos
  - Manejo de errores explícito

```typescript
async function executeToolCallWithValidation(
  toolName: string,
  args: any,
  context: ClientContext
): Promise<ToolResponse<any>> {
  
  // Verificar que tool está habilitada
  const enabledTools = getEnabledToolNames(config);
  if (!enabledTools.includes(toolName)) {
    return {
      success: false,
      error: { code: 'TOOL_DISABLED', message: `Herramienta ${toolName} no habilitada` }
    };
  }
  
  // Verificar parámetros requeridos
  const requiredParams = TOOL_REQUIRED_PARAMS[toolName];
  for (const param of requiredParams) {
    if (!args[param]) {
      return {
        success: false,
        error: { code: 'MISSING_PARAM', message: `Falta: ${param}` }
      };
    }
  }
  
  // Ejecutar con timeout
  try {
    return await Promise.race([
      executeToolCall(toolName, { ...args, client_phone: context.phoneNumber }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
    ]);
  } catch (error) {
    return { success: false, error: { code: 'EXECUTION_ERROR', message: error.message } };
  }
}
```

#### 1.3 Añadir GPT-5-mini como opción de modelo
- **Archivo:** `apps/web/src/app/panel/configuracion/components/AgenteIATab.tsx`
- **Archivo:** `apps/web/src/types/ai-types.ts`
- **Acción:** Añadir "gpt-5-mini" a la lista de modelos disponibles

### Criterio de Éxito (Checkpoint)
- [ ] `calculate_amount` devuelve tasas correctas
- [ ] Herramientas fallan graciosamente con mensajes claros
- [ ] GPT-5-mini aparece en el selector de modelos
- [ ] Testing: 10 conversaciones sin datos inventados

---

## 📝 Fase 2: Mejora del System Prompt (3-4 días)

### Objetivo
Reestructurar el prompt para ser más claro y efectivo.

### Tareas

#### 2.1 Reescribir system prompt con estructura jerárquica
- **Tabla:** `ai_config.system_prompt`
- **Estructura nueva:**

```markdown
# ROL Y CONTEXTO
Eres FengBot, asistente de FengXchange. Tu objetivo es procesar operaciones de cambio de divisa.

# REGLAS DE EJECUCIÓN (OBLIGATORIAS)

## A. Uso de Herramientas (SIEMPRE PRIMERO)
ANTES de responder sobre datos:
1. Tasas → `get_exchange_rates()`
2. Beneficiarios → `get_client_beneficiaries()`
3. Cuentas empresa → `get_company_bank_accounts(currency_code)`

## B. Gestión de Contexto
- MANTÉN en memoria: monto, beneficiario, método de pago
- NO repitas preguntas si el usuario ya proporcionó info

## C. Validación
SI herramienta falla:
  ❌ NO inventes datos
  ✅ Informa: "No pude consultar [X]. ¿Intentamos de nuevo?"

# FLUJO DE OPERACIÓN

## Paso 1: Identificar Beneficiario
USER menciona enviar → EJECUTAR get_client_beneficiaries()

## Paso 2: Confirmar Monto
USER indica cantidad → EJECUTAR get_exchange_rates() + calculate_amount()

## Paso 3: Método de Pago
EJECUTAR: get_company_bank_accounts(from_currency)
LISTAR: "Zelle, Zinli, Binance Pay"

## Paso 4: Datos de Cuenta
USER elige método → MOSTRAR datos
PEDIR: "Envía foto del comprobante"

# EJEMPLOS

## Ejemplo 1: Beneficiario no existe
USER: "Quiero enviar a María"
ASSISTANT: [EJECUTA get_client_beneficiaries()]
ASSISTANT: "No tengo a María. Tus beneficiarios: Arturo, Gina, Pedro."

# RESTRICCIONES
- NUNCA mostrar IDs internos
- NUNCA inventar números de cuenta
- Máximo 3 oraciones por respuesta
```

#### 2.2 Implementar contexto estructurado
- **Archivo:** `apps/web/src/types/ai-types.ts`

```typescript
interface EnhancedClientContext extends ClientContext {
  currentState: 'idle' | 'selecting_beneficiary' | 'confirming_amount' | 'payment_method' | 'awaiting_proof';
  
  operationDraft: {
    beneficiaryId?: string;
    beneficiaryName?: string;
    amount?: number;
    fromCurrency?: string;
    toCurrency?: string;
    selectedPaymentMethod?: string;
    exchangeRate?: number;
  } | null;
  
  conversationSummary: string[];
}
```

#### 2.3 Modificar inyección de contexto
- **Archivo:** `apps/web/src/lib/openai-provider.ts`

```typescript
function buildSystemPrompt(context: EnhancedClientContext): string {
  let prompt = BASE_SYSTEM_PROMPT;
  
  if (context.currentState !== 'idle' && context.operationDraft) {
    prompt += `\n\n## ESTADO ACTUAL\n`;
    prompt += `Estado: ${context.currentState}\n`;
    prompt += `Beneficiario: ${context.operationDraft.beneficiaryName || 'No seleccionado'}\n`;
    prompt += `Monto: ${context.operationDraft.amount || 'No indicado'}\n`;
  }
  
  return prompt;
}
```

### Criterio de Éxito (Checkpoint)
- [ ] Prompt con estructura jerárquica clara
- [ ] Contexto de operación se mantiene entre mensajes
- [ ] Testing: 20 conversaciones sin preguntas repetidas

---

## 🔔 Fase 3: Sistema de Eventos (4-5 días)

### Objetivo
Implementar notificaciones proactivas cuando operaciones se completan.

### Tareas

#### 3.1 Crear tabla de webhooks

```sql
CREATE TABLE operation_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES transactions(id),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE(operation_id)
);

CREATE INDEX idx_operation_webhooks_status ON operation_webhooks(status);
```

#### 3.2 Crear endpoint de webhook
- **Nuevo archivo:** `apps/web/src/app/api/webhooks/operation-completed/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { operation_id, phone_number } = await request.json();
  
  // Obtener detalles de operación
  const operation = await getOperationDetails(operation_id);
  
  // Generar mensaje con IA
  const message = await generateCompletionMessage(operation);
  
  // Enviar por WhatsApp
  await sendWhatsAppMessage(phone_number, message);
  
  // Marcar como notificado
  await markWebhookNotified(operation_id);
  
  return NextResponse.json({ success: true });
}
```

#### 3.3 Crear trigger en Supabase

```sql
CREATE OR REPLACE FUNCTION notify_operation_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Obtener teléfono del webhook pendiente
    SELECT phone_number INTO phone
    FROM operation_webhooks
    WHERE operation_id = NEW.id AND status = 'pending';
    
    IF phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://tu-dominio/api/webhooks/operation-completed',
        body := jsonb_build_object('operation_id', NEW.id, 'phone_number', phone)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER operation_completed_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_operation_completed();
```

#### 3.4 Modificar `create_operation`
- **Archivo:** `apps/web/src/lib/ai-tools.ts`

```typescript
// Después de crear operación exitosamente:
await supabase.from('operation_webhooks').insert({
  operation_id: operation.id,
  phone_number: args.client_phone,
  status: 'pending'
});
```

### Criterio de Éxito (Checkpoint)
- [ ] Tabla `operation_webhooks` creada
- [ ] Trigger dispara al cambiar status
- [ ] Cliente recibe notificación automática
- [ ] Testing: 5 operaciones end-to-end

---

## 🔄 Fase 4: Optimización (2-3 días)

### Tareas

#### 4.1 Comparar modelos
- 20 conversaciones con GPT-5-mini
- 20 conversaciones con GPT-4o-mini (corregido)
- Métricas: alucinaciones, coherencia, velocidad

#### 4.2 Ajustar prompt
- Analizar conversaciones fallidas
- Iterar sobre ejemplos few-shot

#### 4.3 Documentar resultados
- Decisión final de modelo
- Métricas de rendimiento

### Criterio de Éxito
- [ ] Modelo seleccionado con justificación
- [ ] Tasa de éxito >90%

---

## 📊 Cronograma

| Fase | Duración | Semana |
|------|----------|--------|
| Fase 1: Correcciones | 3-4 días | 1 |
| Fase 2: Prompt | 3-4 días | 2 |
| Fase 3: Eventos | 4-5 días | 3 |
| Fase 4: Optimización | 2-3 días | 4 |

---

## 📁 Archivos a Modificar

| Fase | Archivos |
|------|----------|
| 1 | `ai-tools.ts`, `openai-provider.ts`, `AgenteIATab.tsx`, `ai-types.ts` |
| 2 | `ai-types.ts`, `openai-provider.ts`, BD: `ai_config` |
| 3 | **NUEVO:** `operation-completed/route.ts`, `ai-tools.ts`, BD: `operation_webhooks`, trigger |
| 4 | System prompt, documentación |

---

## ✅ Próximo Paso

```bash
git checkout -b refactor/fengbot-phase1
```

**Iniciar Fase 1, Tarea 1.1:** Corregir bug en `calculate_amount`
