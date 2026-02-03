## 🏗️ **Arquitectura Híbrida Recomendada: Lo Mejor de Ambos**

### **✅ SOLUCIÓN ÓPTIMA: OpenAI SDK + Sistema de Eventos**

**Concepto:** Mantener simplicidad de OpenAI SDK + añadir capa de eventos mínima.

```typescript
// ═══════════════════════════════════════════════════════════
// ARQUITECTURA HÍBRIDA RECOMENDADA
// ═══════════════════════════════════════════════════════════

// 1️⃣ AGENTE (OpenAI SDK - Lo que ya tienes)
class FengBotAgent {
  async handleUserMessage(phoneNumber: string, message: string) {
    // Procesar mensaje con GPT-5-mini
    const response = await this.processWithOpenAI(message);
    
    // Si creó operación, registrar webhook
    if (response.operationCreated) {
      await this.registerOperationWebhook(
        response.operationId, 
        phoneNumber
      );
    }
    
    return response.text;
  }
}

// 2️⃣ SISTEMA DE EVENTOS (Nuevo - Sencillo)
class OperationEventSystem {
  
  // Cuando operación cambia de status
  async onOperationStatusChange(operationId: string, newStatus: string) {
    
    // Buscar quién debe ser notificado
    const webhook = await this.getWebhook(operationId);
    
    if (newStatus === 'completed') {
      // Disparar notificación al agente
      await this.notifyAgent({
        phoneNumber: webhook.phoneNumber,
        operationId: operationId,
        status: 'completed'
      });
    }
  }
  
  // El agente genera mensaje automático
  async notifyAgent(data: {
    phoneNumber: string;
    operationId: string;
    status: string;
  }) {
    
    // Obtener detalles de la operación
    const operation = await this.getOperation(data.operationId);
    
    // Generar mensaje con GPT-5-mini
    const message = await this.generateCompletionMessage(operation);
    
    // Enviar por WhatsApp
    await this.sendWhatsAppMessage(data.phoneNumber, message);
  }
  
  private async generateCompletionMessage(operation: Operation) {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{
        role: "system",
        content: `Genera mensaje confirmando operación completada.
        
Datos:
- Monto enviado: ${operation.amount_sent} ${operation.from_currency}
- Beneficiario: ${operation.beneficiary_name}
- Monto recibido: ${operation.amount_received} ${operation.to_currency}
- Referencia: ${operation.reference}

Mensaje debe ser:
- Conciso (máximo 3 líneas)
- Amigable
- Confirmar datos clave`
      }]
    });
    
    return response.choices[^0].message.content;
  }
}

// 3️⃣ WEBHOOK EN SUPABASE (Trigger automático)
// En Supabase Dashboard:
/*
CREATE OR REPLACE FUNCTION notify_operation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando status cambia a 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Llamar a tu API
    PERFORM net.http_post(
      url := 'https://tu-dominio.com/api/webhooks/operation-completed',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'operation_id', NEW.id,
        'status', NEW.status,
        'phone_number', (SELECT phone_number FROM profiles WHERE id = NEW.user_id)
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER operation_status_trigger
  AFTER UPDATE ON operations
  FOR EACH ROW
  EXECUTE FUNCTION notify_operation_status_change();
*/
```


***

## 🔧 **Implementación Detallada: Paso a Paso**

### **Fase 1: Tabla de Webhooks (30 min)**

```sql
-- Nueva tabla para trackear operaciones pendientes
CREATE TABLE operation_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  
  UNIQUE(operation_id)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_operation_webhooks_status ON operation_webhooks(status);
CREATE INDEX idx_operation_webhooks_operation ON operation_webhooks(operation_id);
```


### **Fase 2: Endpoint de Webhook (1 hora)**

```typescript
// apps/web/src/app/api/webhooks/operation-completed/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation_id, status, phone_number } = body;
    
    // Validar que viene de Supabase (seguridad)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (status === 'completed') {
      await handleOperationCompleted(operation_id, phone_number);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleOperationCompleted(
  operationId: string, 
  phoneNumber: string
) {
  const supabase = createServerClient();
  
  // 1. Obtener detalles completos de la operación
  const { data: operation } = await supabase
    .from('operations')
    .select(`
      *,
      beneficiary:user_bank_accounts(alias, account_holder, bank_name),
      currency_from:currencies!from_currency_id(code),
      currency_to:currencies!to_currency_id(code)
    `)
    .eq('id', operationId)
    .single();
  
  if (!operation) {
    throw new Error('Operation not found');
  }
  
  // 2. Generar mensaje personalizado con GPT-5-mini
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    temperature: 0.3,
    messages: [{
      role: "system",
      content: `Eres FengBot. Genera un mensaje confirmando que la operación fue completada exitosamente.

DATOS DE LA OPERACIÓN:
- Monto enviado: ${operation.amount_sent} ${operation.currency_from.code}
- Beneficiario: ${operation.beneficiary.alias} (${operation.beneficiary.account_holder})
- Banco: ${operation.beneficiary.bank_name}
- Monto recibido: ${operation.amount_received} ${operation.currency_to.code}
- Referencia: ${operation.reference || 'N/A'}

INSTRUCCIONES:
- Máximo 4 líneas
- Tono amigable y profesional
- Incluir emoji de confirmación ✅
- Agradecer la preferencia
- NO incluir datos sensibles (números de cuenta completos)

FORMATO:
✅ [Confirmación breve]
💸 [Resumen de montos]
🎉 [Agradecimiento]`
    }]
  });
  
  const message = response.choices[^0].message.content;
  
  // 3. Enviar por WhatsApp
  await sendWhatsAppMessage(phoneNumber, message);
  
  // 4. Marcar webhook como notificado
  await supabase
    .from('operation_webhooks')
    .update({ 
      status: 'notified', 
      notified_at: new Date().toISOString() 
    })
    .eq('operation_id', operationId);
  
  // 5. Guardar en historial de conversación
  await supabase
    .from('ai_conversations')
    .insert({
      phone_number: phoneNumber,
      message_type: 'outgoing',
      message_content: message,
      tokens_used: response.usage?.total_tokens || 0,
      created_at: new Date().toISOString()
    });
  
  console.log(`✅ Notified ${phoneNumber} about operation ${operationId}`);
}
```


### **Fase 3: Registrar Webhook al Crear Operación (30 min)**

```typescript
// apps/web/src/lib/ai-tools.ts

export async function createOperation(args: {
  amount_sent: number;
  from_currency: string;
  beneficiary_id: string;
  proof_url?: string;
  client_phone: string; // ⬅️ AÑADIR ESTE PARÁMETRO
}): Promise<ToolResponse<{ operation_id: string }>> {
  
  const supabase = createServerClient();
  
  // 1. Crear operación (tu código actual)
  const { data: operation, error } = await supabase
    .from('operations')
    .insert({
      user_id: profileId,
      amount_sent: args.amount_sent,
      from_currency_id: fromCurrencyId,
      to_currency_id: toCurrencyId,
      beneficiary_id: args.beneficiary_id,
      status: 'pending', // ⬅️ IMPORTANTE: pending, no completed
      proof_url: args.proof_url
    })
    .select()
    .single();
  
  if (error) {
    return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  }
  
  // 2. ⬆️ NUEVO: Registrar webhook para notificación
  await supabase
    .from('operation_webhooks')
    .insert({
      operation_id: operation.id,
      phone_number: args.client_phone,
      status: 'pending'
    });
  
  return {
    success: true,
    data: {
      operation_id: operation.id,
      status: 'pending',
      message: 'Operación creada. Será procesada por nuestro equipo.'
    }
  };
}
```


### **Fase 4: Trigger en Supabase (15 min)**

```sql
-- Dashboard de Supabase → SQL Editor → Ejecutar:

-- 1. Habilitar extensión para HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Crear función que se ejecuta cuando status cambia
CREATE OR REPLACE FUNCTION notify_operation_completed()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  phone TEXT;
BEGIN
  -- Solo cuando cambia a 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Obtener URL del webhook desde variables de entorno
    webhook_url := current_setting('app.webhook_url', true);
    webhook_secret := current_setting('app.webhook_secret', true);
    
    -- Obtener teléfono del cliente
    SELECT w.phone_number INTO phone
    FROM operation_webhooks w
    WHERE w.operation_id = NEW.id
    AND w.status = 'pending';
    
    -- Si hay webhook pendiente, notificar
    IF phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := webhook_url || '/api/webhooks/operation-completed',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || webhook_secret
        ),
        body := jsonb_build_object(
          'operation_id', NEW.id,
          'status', NEW.status,
          'phone_number', phone
        )::text
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger
CREATE TRIGGER operation_completed_trigger
  AFTER UPDATE ON operations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION notify_operation_completed();
```

**Configurar variables en Supabase:**

```sql
-- En Supabase Dashboard → Settings → Vault:
ALTER DATABASE postgres SET app.webhook_url TO 'https://tu-dominio.vercel.app';
ALTER DATABASE postgres SET app.webhook_secret TO 'tu-secret-aqui';
```


***

## 🔄 **Flujo Completo Implementado**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE ESCRIBE                                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AGENTE (GPT-5-mini) ATIENDE                              │
│    - Consultas de tasas                                     │
│    - Información de beneficiarios                           │
│    - Cálculos de conversión                                 │
│    - Métodos de pago                                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AGENTE RECOPILA DATOS DE PAGO                            │
│    - Comprobante (imagen)                                   │
│    - Validación con Vision API                              │
│    - Extracción de referencia                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AGENTE CREA OPERACIÓN                                    │
│    ┌─────────────────────────────────────────────┐          │
│    │ operations table                            │          │
│    │ - id: uuid                                  │          │
│    │ - status: 'pending' ⏳                      │          │
│    │ - amount_sent, beneficiary_id, etc.        │          │
│    └─────────────────────────────────────────────┘          │
│    ┌─────────────────────────────────────────────┐          │
│    │ operation_webhooks table                    │          │
│    │ - operation_id: uuid                        │          │
│    │ - phone_number: +58...                      │          │
│    │ - status: 'pending' ⏳                      │          │
│    └─────────────────────────────────────────────┘          │
│                                                              │
│    ✅ Responde: "Operación registrada. Procesando..."       │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ [CLIENTE ESPERA]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. USUARIO HUMANO (Dashboard)                               │
│    - Ve operación en pool de pendientes                     │
│    - Revisa comprobante                                     │
│    - Valida pago recibido en cuenta empresa                 │
│    - Envía dinero a beneficiario del cliente                │
│    - Marca: status = 'completed' ✅                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. SUPABASE TRIGGER DETECTA CAMBIO                          │
│    - OLD.status = 'pending'                                 │
│    - NEW.status = 'completed'                               │
│    - 🔔 Ejecuta: notify_operation_completed()               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. TRIGGER LLAMA API WEBHOOK                                │
│    POST /api/webhooks/operation-completed                   │
│    {                                                         │
│      "operation_id": "uuid-123",                            │
│      "status": "completed",                                 │
│      "phone_number": "+58..."                               │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. WEBHOOK HANDLER PROCESA                                  │
│    - Obtiene detalles completos de operación               │
│    - Genera mensaje con GPT-5-mini                          │
│    - Envía WhatsApp proactivo                               │
│    - Marca webhook como 'notified' ✅                       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. CLIENTE RECIBE NOTIFICACIÓN AUTOMÁTICA                   │
│                                                              │
│    ✅ ¡Tu operación #1234 fue completada!                   │
│    💸 Enviaste: 100 USD                                     │
│    💰 Recibió: 38,000 Bs                                    │
│    🎉 Gracias por usar FengXchange                          │
└─────────────────────────────────────────────────────────────┘
```


***

## 📊 **Ventajas de la Arquitectura Híbrida**

| Aspecto | Beneficio |
| :-- | :-- |
| **Simplicidad** | Mantiene OpenAI SDK directo (no LangGraph) |
| **Event-driven** | Sistema reactivo automático |
| **Escalable** | Soporta múltiples operaciones simultáneas |
| **Desacoplado** | Agente no necesita polling constante |
| **Persistente** | Estado en BD, no en memoria del agente |
| **Debugging** | Fácil: logs en Supabase + API |
| **Notificaciones proactivas** | Cliente recibe update sin preguntar |
| **Sin overhead** | No requiere LangGraph (ahorro 2MB bundle) |


***

## ✅ **Checklist de Implementación**

### **Día 1: Base de Datos y Triggers (2 horas)**

- [ ] Crear tabla `operation_webhooks`
- [ ] Crear función `notify_operation_completed()`
- [ ] Crear trigger en tabla `operations`
- [ ] Configurar variables de entorno en Supabase
- [ ] Testing manual: UPDATE status, verificar trigger


### **Día 2: Endpoint Webhook (3 horas)**

- [ ] Crear `/api/webhooks/operation-completed/route.ts`
- [ ] Implementar seguridad (Bearer token)
- [ ] Implementar generación de mensaje con GPT-5-mini
- [ ] Implementar envío por WhatsApp
- [ ] Testing con Postman/cURL


### **Día 3: Integración con Agente (2 horas)**

- [ ] Modificar `createOperation` para registrar webhook
- [ ] Actualizar `create_operation` tool definition (añadir client_phone)
- [ ] Testing end-to-end completo


### **Día 4: Refinamiento (2 horas)**

- [ ] Mejorar mensajes de notificación
- [ ] Añadir manejo de errores robusto
- [ ] Implementar retry logic en webhook
- [ ] Logging y monitoreo

***

## 💰 **Costo de Implementación vs LangGraph**

### **Arquitectura Híbrida (Recomendado)**

```
Tiempo total: 9 horas
Complejidad: ⭐⭐⭐ (Media)
Mantiene: OpenAI SDK (simple)
Añade: Sistema de eventos (sencillo)
Costo desarrollo: 9 horas × $60 = $540
```


### **LangGraph Completo**

```
Tiempo total: 40-60 horas
Complejidad: ⭐⭐⭐⭐⭐ (Muy alta)
Requiere: Reescribir TODO el agente
Añade: Framework pesado con curva aprendizaje
Costo desarrollo: 50 horas × $60 = $3,000
```

**Ahorro: \$2,460 (5.5x más barato)**

***

## 🎯 **Recomendación Final ACTUALIZADA**

### **✅ USAR: OpenAI SDK + Sistema de Eventos (Arquitectura Híbrida)**

**Razones:**

1. ✅ **Soporta tu flujo completo** (incluyendo notificaciones proactivas)
2. ✅ **5.5x más barato** que LangGraph (\$540 vs \$3,000)
3. ✅ **Más simple de mantener** (código directo, no abstracciones)
4. ✅ **Event-driven nativo** (Supabase triggers)
5. ✅ **Debugging fácil** (logs claros en cada paso)
6. ✅ **Escalable** (soporta miles de operaciones simultáneas)
7. ✅ **No requiere framework pesado** (ahorro 2-3MB)

### **📋 Próximos Pasos Inmediatos:**

**Esta semana:**

1. Implementar tabla `operation_webhooks` (30 min)
2. Crear endpoint webhook (2 horas)
3. Configurar trigger Supabase (30 min)
4. Testing end-to-end (2 horas)

**Total: 5 horas** para tener sistema completo funcionando.

