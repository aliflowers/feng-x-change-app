# 🔐 Plan de Seguridad Avanzada - FengXchange

> **Fecha:** 1 de Febrero, 2026  
> **Versión:** 3.0 (Control de Sesiones implementado)  
> **Stack:** Next.js + Railway + Supabase

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado de Implementación](#estado-de-implementación)
3. [Middleware Hardening](#1-middleware-hardening)
4. [Autenticación 2FA](#2-autenticación-2fa)
5. [Logs de Auditoría](#3-logs-de-auditoría)
6. [Alertas de Login Fallido](#4-alertas-de-login-fallido)
7. [Control de Sesiones](#5-control-de-sesiones)
8. [Plantilla WhatsApp Requerida](#plantilla-whatsapp-para-alertas)

---

## Resumen Ejecutivo

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Middleware Hardening** | Headers de seguridad, anti-spoofing, blacklist | ✅ Implementado |
| **GeoIP Tracking** | Ubicación de usuarios por IP (país/ciudad) | ✅ Implementado |
| **2FA Dual** | Email + Google Authenticator (TOTP) | ✅ Implementado |
| **Logs de Auditoría API** | Endpoint para listar y purgar logs | ✅ Implementado |
| **Alertas de Login** | Notificaciones Email + WhatsApp por intentos fallidos | ✅ Implementado |
| **Control de Sesiones** | Timeout por inactividad (1h) + Sesión máxima (24h) | ✅ Implementado |

---

## Estado de Implementación

### Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `src/middleware.ts` | Middleware con headers de seguridad y blacklist de IPs |
| `src/lib/geoip.ts` | Servicio de geolocalización por IP |
| `src/lib/two-factor-auth.ts` | Servicio 2FA (TOTP + Email + Backup codes) |
| `src/lib/security-alerts.ts` | Servicio de alertas de seguridad |
| `src/lib/session-config.ts` | **NUEVO** - Control de sesiones (timeout + expiración) |
| `src/app/api/auth/2fa/setup/route.ts` | Iniciar configuración 2FA |
| `src/app/api/auth/2fa/verify/route.ts` | Verificar código durante setup |
| `src/app/api/auth/2fa/disable/route.ts` | Deshabilitar 2FA |
| `src/app/api/auth/pre-login/route.ts` | **NUEVO** - Pre-autenticación segura con 2FA |
| `src/app/api/auth/2fa/verify-login/route.ts` | **NUEVO** - Verificar 2FA y crear sesión |
| `src/app/api/admin/audit-logs/route.ts` | Listar y purgar logs |

### Dependencias Instaladas

```bash
pnpm add otpauth qrcode geoip-lite @types/qrcode jsonwebtoken @types/jsonwebtoken
```

### Tablas BD Creadas

- `two_factor_attempts` - Registro de intentos 2FA
- `failed_login_attempts` - Registro de logins fallidos (con índices BRIN)

### Columnas Añadidas a `profiles`

- `two_factor_method` (none/email/totp)
- `two_factor_secret` (encrypted)
- `two_factor_verified` (boolean)
- `two_factor_backup_codes` (text[])

---

## 1. Middleware Hardening

### Headers de Seguridad Implementados

```typescript
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
```

### Blacklist Automática de IPs

- Después de **20 bloqueos por rate limiting**, la IP se añade a blacklist
- IPs en blacklist reciben error 403 automáticamente

### Detección de IP (Railway/Cloudflare)

```typescript
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const cfIP = request.headers.get('cf-connecting-ip');
  const realIP = request.headers.get('x-real-ip');
  // Prioridad: x-forwarded-for > cf-connecting-ip > x-real-ip
}
```

---

## 2. Autenticación 2FA

### Métodos Soportados

| Método | Descripción |
|--------|-------------|
| **Email** | Código de 6 dígitos enviado al email del usuario |
| **TOTP** | Google Authenticator / Authy (código basado en tiempo) |
| **Backup** | 8 códigos de respaldo de un solo uso |

### Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/pre-login` | POST | Valida credenciales SIN crear sesión |
| `/api/auth/2fa/verify-login` | POST | Verifica 2FA y crea sesión segura |
| `/api/auth/2fa/setup` | POST | Iniciar configuración (genera QR o envía email) |
| `/api/auth/2fa/verify` | POST | Verificar código durante setup |
| `/api/auth/2fa/disable` | POST | Deshabilitar 2FA (requiere código) |

### Flujo de Login Seguro con 2FA

```
1. Usuario ingresa email + password
2. /api/auth/pre-login valida credenciales SIN crear sesión
3. Si tiene 2FA → Genera token JWT temporal (5 min, password encriptado AES-256)
4. Usuario ingresa código 2FA
5. /api/auth/2fa/verify-login desencripta password, verifica código
6. Si correcto → Crea sesión real con signInWithPassword
7. Frontend usa setSession para establecer sesión
```

> **Seguridad:** El password nunca se almacena en el cliente. Se encripta con AES-256-GCM dentro del token JWT temporal.

---

## 3. Logs de Auditoría

### Endpoint: `/api/admin/audit-logs`

**GET - Listar logs:**
```
Query params: page, limit, action, user_id, resource_type, from, to
```

**DELETE - Purgar logs antiguos:**
- Solo SUPER_ADMIN
- Respeta días de retención configurados

### Respuesta

```json
{
  "logs": [...],
  "pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 },
  "filters": { "actions": [...], "resourceTypes": [...] }
}
```

---

## 4. Alertas de Login Fallido

### Flujo de Detección

1. Se registra intento fallido en `failed_login_attempts`
2. Se obtiene geolocalización de la IP
3. Se cuentan intentos en últimos 30 minutos
4. Si supera umbral configurado (default: 5):
   - Se envía alerta por **Email**
   - Se envía alerta por **WhatsApp**

### Información Incluida en Alertas

- Cantidad de intentos fallidos
- Email que se intentó usar
- IP del atacante
- País y ciudad (geolocalización)
- Fecha y hora

---

## 5. Control de Sesiones

### Configuración

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Timeout por inactividad** | 1 hora | Sesión expira si no hay navegación |
| **Sesión máxima** | 24 horas | Sesión expira sin importar actividad |
| **Advertencia** | 5 minutos antes | Tiempo para mostrar modal de advertencia |

### Archivo de Configuración

`src/lib/session-config.ts`

```typescript
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;      // 1 hora
export const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
export const WARNING_BEFORE_LOGOUT_MS = 5 * 60 * 1000;    // 5 minutos
```

### Funcionamiento

1. **Al hacer login exitoso:** Se guardan timestamps en localStorage
2. **Al navegar entre páginas:** Se verifica expiración y actualiza última actividad
3. **Si expira:** Se cierra sesión y redirige a `/backoffice` con mensaje

### Páginas con Control de Sesión Activo

| Página | Estado |
|--------|--------|
| `/panel` (Dashboard) | ✅ Activo |
| `/panel/pool` | ✅ Activo |
| `/panel/operaciones` | ✅ Activo |
| `/panel/clientes` | ✅ Activo |
| `/panel/bancos` | ✅ Activo |
| `/panel/tasas` | ✅ Activo |
| `/panel/configuracion` | ✅ Activo |
| `/panel/comisiones` | ⚠️ **PENDIENTE** - Página no desarrollada |
| `/panel/usuarios` | ⚠️ **PENDIENTE** - Página no desarrollada |
| `/panel/ganancias` | ⚠️ **PENDIENTE** - Página no desarrollada |

> [!IMPORTANT]
> Cuando se desarrollen las páginas `/panel/comisiones`, `/panel/usuarios` y `/panel/ganancias`, el control de sesión se aplicará automáticamente ya que están bajo el layout de `/panel`.

### Mensajes al Usuario

Cuando la sesión expira, el usuario es redirigido a `/backoffice` con un mensaje amigable:

- **Por inactividad:** "Tu sesión expiró por inactividad. Por seguridad, debes iniciar sesión nuevamente."
- **Por tiempo máximo:** "Tu sesión ha expirado. Por seguridad, debes iniciar sesión nuevamente."

---

## ⚠️ Plantilla WhatsApp para Alertas

> [!CAUTION]
> ### ACCIÓN REQUERIDA: Crear Plantilla en Meta Business Suite
> 
> **ANTES de activar las alertas por WhatsApp, debes crear la siguiente plantilla:**
> 
> **Configuración de la plantilla:**
> | Campo | Valor |
> |-------|-------|
> | **Nombre** | `alerta_seguridad` |
> | **Categoría** | UTILITY |
> | **Idioma** | es (Español) |
> 
> **Variables de la plantilla:**
> | Variable | Descripción |
> |----------|-------------|
> | `{{1}}` | Cantidad de intentos fallidos |
> | `{{2}}` | Email intentado |
> | `{{3}}` | IP del atacante |
> | `{{4}}` | Fecha y hora |
> 
> **Contenido sugerido:**
> ```
> 🚨 *Alerta de Seguridad - FengXchange*
> 
> Se han detectado {{1}} intentos de login fallidos.
> 
> 📧 Email: {{2}}
> 🔗 IP: {{3}}
> 📅 Fecha: {{4}}
> 
> Revisa los logs de auditoría para más detalles.
> ```
> 
> **Notas:**
> - La aprobación de Meta puede tomar 24-48 horas
> - Sin esta plantilla, las alertas solo se enviarán por Email

---

## Checklist de Implementación

### Fase A: Middleware Hardening ✅
- [x] Añadir headers de seguridad
- [x] Implementar detección de IP para Railway/Cloudflare
- [x] Sistema de blacklist de IPs automático
- [x] Validación de IP contra spoofing
- [x] Crear `lib/geoip.ts` con soporte geoip-lite + ipinfo.io

### Fase B: Autenticación 2FA ✅
- [x] Migración BD: columnas en `profiles`
- [x] Migración BD: tabla `two_factor_attempts`
- [x] Instalar dependencias: `otpauth`, `qrcode`
- [x] Servicio `lib/two-factor-auth.ts`
- [x] Endpoints `/api/auth/2fa/*` (setup, verify, disable)
- [x] Componente frontend `SegundoFactorSetup.tsx`
- [x] Flujo de login seguro con pre-autenticación
- [x] Encriptación de credenciales con AES-256-GCM

### Fase C: Logs de Auditoría ✅
- [x] Endpoint `/api/admin/audit-logs` (GET + DELETE)
- [x] Paginación y filtros
- [x] Página `/panel/admin/audit`
- [x] Exportar CSV

### Fase D: Alertas de Login Fallido ✅
- [x] Migración BD: tabla `failed_login_attempts`
- [x] Servicio `lib/security-alerts.ts`
- [x] Lógica de detección de umbral
- [x] Envío de alerta por Email
- [x] Envío de alerta por WhatsApp
- [ ] **Crear plantilla WhatsApp `alerta_seguridad`** ⚠️ PENDIENTE

### Fase E: Control de Sesiones ✅
- [x] Servicio `lib/session-config.ts`
- [x] Timeout por inactividad (1 hora)
- [x] Sesión máxima (24 horas)
- [x] Mensaje de sesión expirada en login
- [x] Inicialización de sesión en login
- [x] Verificación en layout de `/panel`
- [x] Limpieza de datos en logout

---

## Próximos Pasos

1. **Plantilla WhatsApp**: Crear y aprobar plantilla `alerta_seguridad` en Meta Business
2. **Páginas Pendientes**: Al desarrollar `/panel/comisiones`, `/panel/usuarios` y `/panel/ganancias`, el control de sesión se aplicará automáticamente
3. **Fase 6: Mi Cuenta**: Implementar cambio de email y contraseña
4. **Fase 7: Agente IA**: Bot de WhatsApp con OpenAI

---

*Última actualización: 1 de Febrero, 2026*

