# Plan de Implementación: FengBot Determinista (WhatsApp Interactive)

## 🎯 Objetivo
Implementar un chatbot para WhatsApp Business API **100% determinista** con navegación por menús interactivos. El sistema detecta automáticamente si el cliente está registrado y ofrece flujos diferenciados.

---

## 🔄 Diagrama de Flujo General

```mermaid
flowchart TD
    START([Cliente escribe]) --> CHECK{¿Registrado?}
    
    CHECK -->|No| REGISTER[Mensaje Bienvenida + Instrucciones Registro]
    REGISTER --> END1([Fin])
    
    CHECK -->|Sí| MENU[Menú Principal]
    
    MENU --> TASAS[Consultar Tasas]
    MENU --> ENVIO[Hacer Envío/Cambio]
    MENU --> BENEF[Consultar Beneficiarios]
    MENU --> OPS[Consultar Operaciones]
    MENU --> DATOS[Mis Datos]
    MENU --> CHAT[Chatear con Persona]
    
    BENEF -.->|Fase 2| FUTURE
    OPS -.->|Fase 2| FUTURE
    DATOS -.->|Fase 2| FUTURE
    CHAT -.->|Fase 2| FUTURE
    FUTURE([Próximas Fases])
    
    subgraph FLUJO_TASAS[Flujo: Consultar Tasas]
        TASAS --> SEL_MONEDA[Seleccionar Moneda Origen]
        SEL_MONEDA --> SEL_PAR[Seleccionar Par de Cambio]
        SEL_PAR --> SHOW_TASA[Mostrar Tasa Actual]
        SHOW_TASA --> MENU
    end
    
    subgraph FLUJO_ENVIO[Flujo: Hacer Envío]
        ENVIO --> SEL_MONEDA_ENV[Seleccionar Moneda a Enviar]
        SEL_MONEDA_ENV --> SEL_METODO[Seleccionar Método de Pago]
        SEL_METODO --> SEL_BENEFICIARIO[Seleccionar Beneficiario]
        SEL_BENEFICIARIO --> INPUT_MONTO[Ingresar Monto]
        INPUT_MONTO --> CONFIRM{¿Confirma Operación?}
        CONFIRM -->|No| MENU
        CONFIRM -->|Sí| SHOW_CUENTA[Mostrar Datos Cuenta Empresa]
        SHOW_CUENTA --> WAIT_TRANSFER[Esperar "Ya hice la transferencia"]
        WAIT_TRANSFER --> UPLOAD_PROOF[Subir Comprobante]
        UPLOAD_PROOF --> OCR[Procesar OCR]
        OCR --> CREATE_OP[Crear Operación en Pool]
        CREATE_OP --> MENU
    end
```

---

## 📋 Estados de la Conversación (`ConversationStep`)

| Estado | Descripción | Tipo de Mensaje Esperado |
|--------|-------------|--------------------------|
| `IDLE` | Sin sesión activa | Cualquier texto |
| `MAIN_MENU` | Menú principal mostrado | Selección de lista |
| `RATES_SELECT_CURRENCY` | Seleccionar moneda origen | Selección de lista |
| `RATES_SELECT_PAIR` | Seleccionar par de cambio | Selección de lista |
| `RATES_SHOW` | Tasa mostrada | Selección de lista (navegación) |
| `SEND_SELECT_CURRENCY` | Seleccionar moneda a enviar | Selección de lista |
| `SEND_SELECT_METHOD` | Seleccionar método de pago | Selección de lista |
| `SEND_SELECT_BENEFICIARY` | Seleccionar beneficiario | Selección de lista |
| `SEND_INPUT_AMOUNT` | Esperando monto (texto) | Texto numérico |
| `SEND_CONFIRM` | Confirmación de operación | Botón (Sí/No) |
| `SEND_SHOW_ACCOUNT` | Cuenta de empresa mostrada | Botón ("Ya transferí") |
| `SEND_UPLOAD_PROOF` | Esperando comprobante | Imagen |
| `COMPLETED` | Operación creada | - |

---

## 🗄️ Esquema de Base de Datos

### Tabla: `chat_sessions`

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  current_step TEXT NOT NULL DEFAULT 'IDLE',
  metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_phone ON chat_sessions(phone_number);
CREATE INDEX idx_chat_sessions_step ON chat_sessions(current_step);
```

### Estructura de `metadata` (JSONB)

```json
{
  "selected_currency_from": "USD",
  "selected_currency_to": "VES",
  "selected_payment_method_id": "uuid-...",
  "selected_beneficiary_id": "uuid-...",
  "amount_to_send": 100.00,
  "calculated_rate": 45.50,
  "calculated_amount_received": 4550.00,
  "company_account_id": "uuid-...",
  "proof_url": "https://...",
  "extracted_ocr_data": { ... },
  "navigation_history": ["MAIN_MENU", "SEND_SELECT_CURRENCY", ...]
}
```

---

## 📱 Especificación de Menús WhatsApp

### 1. Usuario NO Registrado

**Tipo:** Mensaje de texto con botones

```
¡Hola! 👋 Bienvenido a FengXchange.

Para realizar envíos de dinero, primero debes registrarte en nuestra plataforma.

👉 Visita https://fengxchange.com y crea tu cuenta en minutos.

Una vez registrado, podrás:
✅ Consultar tasas de cambio
✅ Enviar dinero a tus beneficiarios
✅ Ver el historial de tus operaciones

¿Ya tienes cuenta? Asegúrate de usar el mismo número de WhatsApp.
```

### 2. Menú Principal (Usuario Registrado)

**Tipo:** Lista interactiva

```
Header: "Menú Principal"
Body: "Hola [NOMBRE], ¿qué deseas hacer hoy?"
Button: "Ver opciones"

Secciones:
  - Título: "Operaciones"
    - "💱 Consultar tasas de cambio"
    - "💸 Hacer un envío o cambio"
  
  - Título: "Mi Cuenta"
    - "👥 Consultar mis beneficiarios" (disabled - Próximamente)
    - "📋 Consultar mis operaciones" (disabled - Próximamente)
    - "👤 Mis datos personales" (disabled - Próximamente)
  
  - Título: "Ayuda"
    - "� Chatear con una persona" (disabled - Próximamente)
```

### 3. Submenú: Seleccionar Moneda (Tasas)

**Tipo:** Lista interactiva

```
Header: "Consultar Tasas"
Body: "Selecciona la moneda que deseas consultar:"
Button: "Seleccionar"

Opciones:
  - "🇺🇸 Dólares (USD)"
  - "🇻🇪 Bolívares (VES)"
  - "🇨🇴 Pesos Colombianos (COP)"
  - "🇨🇱 Pesos Chilenos (CLP)"
  - "🇵🇪 Soles Peruanos (PEN)"
  - "🇵🇦 Dólares Panamá (PAB)"
  - "🇪🇺 Euros (EUR)"
  
Footer: "↩️ Volver al menú principal"
```

### 4. Submenú: Pares de Cambio Activos

**Tipo:** Lista interactiva (dinámica desde BD)

```
Header: "Tasas desde USD"
Body: "Selecciona el par de cambio:"
Button: "Ver tasas"

Opciones (dinámicas):
  - "USD → VES (Bolívares)"
  - "USD → COP (Pesos Col.)"
  - "USD → CLP (Pesos Chi.)"
  
Footer: "↩️ Volver | 🏠 Menú principal"
```

### 5. Mostrar Tasa

**Tipo:** Mensaje de texto con botones

```
💱 *Tasa de Cambio*

*USD → VES*
1 USD = 45.50 VES

📅 Actualizado: Hace 5 minutos

---
[Botón: "💸 Hacer envío con esta tasa"]
[Botón: "🔄 Consultar otra tasa"]
[Botón: "🏠 Menú principal"]
```

### 6. Flujo Envío: Seleccionar Método de Pago

**Tipo:** Lista interactiva (dinámica desde BD)

```
Header: "Método de Pago"
Body: "¿Cómo vas a enviar los USD?"
Button: "Seleccionar"

Opciones (desde banks_platforms donde currency=USD):
  - "Zelle"
  - "PayPal"
  - "Zinli"
  - "Transferencia Bancaria USA"
  
Footer: "↩️ Volver | ❌ Cancelar"
```

### 7. Flujo Envío: Seleccionar Beneficiario

**Tipo:** Lista interactiva (dinámica desde BD)

```
Header: "Seleccionar Beneficiario"
Body: "¿A quién le envías el dinero?"
Button: "Seleccionar"

Opciones (desde user_bank_accounts del cliente):
  - "María García López" (no alias)
  - "Pedro Martínez"
  - "Juan Rodríguez"
  
Footer: "↩️ Volver | ❌ Cancelar"
```

### 8. Flujo Envío: Ingresar Monto

**Tipo:** Mensaje de texto

```
💵 *Ingresa el monto a enviar*

Escribe la cantidad en USD que deseas enviar.

Ejemplo: 100 o 100.50

_(Nota: Los límites se validan internamente, no se muestran al usuario)_
```

### 9. Flujo Envío: Confirmación

**Tipo:** Mensaje con botones

```
📋 *Resumen de tu operación*

*Envías:* 100.00 USD
*Método:* Zelle
*Beneficiario:* María García López
*Banco destino:* Banesco

---

💱 *Tasa aplicada:* 1 USD = 45.50 VES
💰 *Tu beneficiario recibirá:* 4,550.00 VES

---

¿Estás de acuerdo con esta operación?

[Botón: "✅ Sí, estoy de acuerdo"]
[Botón: "❌ No, cancelar"]
```

### 10. Flujo Envío: Datos de Cuenta

**Tipo:** Mensaje con botón

```
🏦 *Datos para tu transferencia*

Realiza tu pago de *100.00 USD* a:

*Método:* Zelle
*Email:* pagos@fengxchange.com
*Nombre:* FengXchange LLC

⚠️ *Importante:*
- Usa exactamente el monto indicado
- No incluyas notas o mensajes, debes dejar el area de concepto en BLANCO.

Una vez hayas realizado la transferencia, presiona el botón de abajo.

[Botón: "✅ Ya hice la transferencia"]
[Botón: "❌ Cancelar operación"]
```

### 11. Flujo Envío: Subir Comprobante

**Tipo:** Mensaje de texto

```
📸 *Envía tu comprobante*

Por favor, envía una *captura de pantalla* clara de tu transferencia.

La imagen debe mostrar:
✅ Monto enviado
✅ Fecha y hora
✅ Número de referencia (si aplica)

Esperando tu imagen...
```

### 12. Operación Creada

**Tipo:** Mensaje con botones

```
✅ *¡Operación registrada exitosamente!*

Tu operación ha sido recibida y está siendo procesada.

*Número de operación:* #FX-2024-00123

Recibirás una notificación cuando el dinero haya sido enviado a tu beneficiario.

Tiempo estimado: 15 minutos

[Botón: "📋 Ver mis operaciones"]
[Botón: "💸 Hacer otro envío"]
[Botón: "🏠 Menú principal"]
```

---

## 🚀 Roadmap de Implementación (Fase 1)

### 1.1 Infraestructura
- [ ] Crear tabla `chat_sessions` en Supabase
- [ ] Crear tipos TypeScript (`ConversationStep`, `SessionMetadata`)
- [ ] Implementar `SessionManager` (get/create/update/reset)

### 1.2 Webhook Handler
- [ ] Refactorizar `route.ts` para detectar registro
- [ ] Implementar dispatcher por `current_step`
- [ ] Crear utilidades para enviar mensajes interactivos

### 1.3 Flujo: Usuario No Registrado
- [ ] Detectar número no registrado
- [ ] Enviar mensaje de bienvenida con instrucciones

### 1.4 Flujo: Menú Principal
- [ ] Cargar datos del usuario
- [ ] Generar y enviar lista interactiva
- [ ] Manejar selección de opción

### 1.5 Flujo: Consultar Tasas
- [ ] Handler: Selección de moneda origen
- [ ] Handler: Mostrar pares activos (query dinámica)
- [ ] Handler: Mostrar tasa seleccionada
- [ ] Navegación: Volver atrás / Menú principal

### 1.6 Flujo: Hacer Envío (Completo)
- [ ] Handler: Seleccionar moneda a enviar
- [ ] Handler: Seleccionar método de pago (desde BD)
- [ ] Handler: Seleccionar beneficiario (nombre completo)
- [ ] Handler: Input de monto + validación
- [ ] Handler: Mostrar resumen + cálculo
- [ ] Handler: Confirmación (Sí/No)
- [ ] Handler: Mostrar cuenta de empresa
- [ ] Handler: Esperar "Ya transferí"
- [ ] Handler: Recibir imagen
- [ ] Integrar OCR para extracción de datos
- [ ] Crear operación en pool

### 1.7 Navegación Global
- [ ] Comando "Cancelar" en cualquier punto
- [ ] Botón "Volver" en cada submenú
- [ ] Acceso directo a menú principal
- [ ] Timeout de sesión (24h)

---

## 📁 Estructura de Archivos Propuesta

```
apps/web/src/
├── lib/
│   └── whatsapp/
│       ├── session-manager.ts    # CRUD de sesiones
│       ├── message-builder.ts    # Generar mensajes interactivos
│       ├── handlers/
│       │   ├── index.ts          # Dispatcher principal
│       │   ├── main-menu.ts      # Handler menú principal
│       │   ├── rates-flow.ts     # Handlers de tasas
│       │   ├── send-flow.ts      # Handlers de envío
│       │   └── navigation.ts     # Volver, Cancelar, etc.
│       └── ocr/
│           └── proof-extractor.ts # Extracción de datos
├── types/
│   └── chat.ts                   # Tipos de conversación
└── app/api/whatsapp/webhook/
    └── route.ts                  # Punto de entrada (refactorizado)
```

---

## ⚠️ Consideraciones Técnicas

1. **Límites de WhatsApp:**
   - Máximo 10 opciones por lista
   - Máximo 3 botones por mensaje
   - Sesión de 24h para mensajes sin plantilla

2. **OCR:**
   - Usaremos **Tesseract.js** (gratuito, open source, corre en Node.js)
   - Fallback: Si OCR falla, pedir datos manualmente

3. **Navegación:**
   - Cada mensaje debe incluir forma de volver
   - Guardar historial en `metadata.navigation_history`

4. **Validaciones:**
   - Monto: Numérico, dentro de límites
   - Beneficiario: Debe existir y pertenecer al usuario
   - Método de pago: Debe estar activo para la moneda
