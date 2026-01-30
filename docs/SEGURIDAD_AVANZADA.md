# 🔐 Plan de Seguridad Avanzada - FengXchange

> **Fecha:** 30 de Enero, 2026  
> **Versión:** 2.0 (Actualizado - Implementado)  
> **Stack:** Next.js + Railway + Supabase

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado de Implementación](#estado-de-implementación)
3. [Middleware Hardening](#1-middleware-hardening)
4. [Autenticación 2FA](#2-autenticación-2fa)
5. [Logs de Auditoría](#3-logs-de-auditoría)
6. [Alertas de Login Fallido](#4-alertas-de-login-fallido)
7. [Plantilla WhatsApp Requerida](#plantilla-whatsapp-para-alertas)

---

## Resumen Ejecutivo

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Middleware Hardening** | Headers de seguridad, anti-spoofing, blacklist | ✅ Implementado |
| **GeoIP Tracking** | Ubicación de usuarios por IP (país/ciudad) | ✅ Implementado |
| **2FA Dual** | Email + Google Authenticator (TOTP) | ✅ Implementado |
| **Logs de Auditoría API** | Endpoint para listar y purgar logs | ✅ Implementado |
| **Alertas de Login** | Notificaciones Email + WhatsApp por intentos fallidos | ✅ Implementado |

---

## Estado de Implementación

### Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `src/middleware.ts` | Middleware con headers de seguridad y blacklist de IPs |
| `src/lib/geoip.ts` | Servicio de geolocalización por IP |
| `src/lib/two-factor-auth.ts` | Servicio 2FA (TOTP + Email + Backup codes) |
| `src/lib/security-alerts.ts` | Servicio de alertas de seguridad |
| `src/app/api/auth/2fa/setup/route.ts` | Iniciar configuración 2FA |
| `src/app/api/auth/2fa/verify/route.ts` | Verificar código durante setup |
| `src/app/api/auth/2fa/disable/route.ts` | Deshabilitar 2FA |
| `src/app/api/admin/audit-logs/route.ts` | Listar y purgar logs |

### Dependencias Instaladas

```bash
pnpm add otpauth qrcode geoip-lite @types/qrcode
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
| `/api/auth/2fa/setup` | POST | Iniciar configuración (genera QR o envía email) |
| `/api/auth/2fa/verify` | POST | Verificar código durante setup |
| `/api/auth/2fa/disable` | POST | Deshabilitar 2FA (requiere código) |

### Flujo de Configuración

1. Usuario selecciona método (Email o TOTP)
2. Para TOTP: Se genera QR code para escanear
3. Para Email: Se envía código de 6 dígitos
4. Usuario verifica con código
5. Se generan 8 códigos de respaldo
6. 2FA queda activo

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
- [ ] Componente frontend `SegundoFactorSetup.tsx` (pendiente)
- [ ] Modificar flujo de login para pedir 2FA (pendiente)

### Fase C: Logs de Auditoría ✅
- [x] Endpoint `/api/admin/audit-logs` (GET + DELETE)
- [x] Paginación y filtros
- [ ] Página `/panel/admin/audit` (pendiente)
- [ ] Exportar CSV (pendiente)

### Fase D: Alertas de Login Fallido ✅
- [x] Migración BD: tabla `failed_login_attempts`
- [x] Servicio `lib/security-alerts.ts`
- [x] Lógica de detección de umbral
- [x] Envío de alerta por Email
- [x] Envío de alerta por WhatsApp
- [ ] **Crear plantilla WhatsApp `alerta_seguridad`** ⚠️ PENDIENTE

---

## Próximos Pasos

1. **Frontend 2FA**: Crear componente de configuración y pantalla de verificación durante login
2. **UI Audit Logs**: Crear página `/panel/admin/audit` con tabla, filtros y exportación
3. **Plantilla WhatsApp**: Crear y aprobar plantilla `alerta_seguridad` en Meta Business
4. **Testing**: Probar flujo completo de 2FA y alertas

---

*Última actualización: 30 de Enero, 2026*
