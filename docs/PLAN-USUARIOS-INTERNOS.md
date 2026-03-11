# Plan Maestro: Sistema de Usuarios Internos y Notificaciones de Pool

> **Fecha de creación:** 2026-02-04  
> **Estado:** En implementación

## Descripción General

Implementar un módulo completo de gestión de usuarios internos del sistema (administradores, cajeros, supervisores) con notificaciones automáticas vía WhatsApp cuando nuevas operaciones ingresen al pool.

---

## Estado Actual

### Base de Datos
- ✅ Tabla `profiles` ya existe con campo `whatsapp_number` (text, nullable)
- ✅ Roles internos disponibles: `SUPER_ADMIN`, `ADMIN`, `CAJERO`, `SUPERVISOR`
- ✅ Campo `role` de tipo enum `user_role`

### Frontend
- ✅ Enlace a `/panel/usuarios` existe en el layout (línea 50)
- ❌ Página `/panel/usuarios/page.tsx` no existe
- ✅ Acceso restringido a `SUPER_ADMIN` en el menú

### Requisitos de Negocio
- Solo `SUPER_ADMIN` puede gestionar usuarios internos
- Los usuarios internos NO son clientes (no hacen operaciones)
- Deben recibir notificaciones WhatsApp cuando entren operaciones al pool

---

## Fases de Implementación

### Fase 1: Página de Usuarios Internos
> Crear la interfaz de gestión de usuarios con acceso exclusivo para SUPER_ADMIN

#### [NEW] `apps/web/src/app/panel/usuarios/page.tsx`

**Funcionalidades:**
1. **Lista de usuarios internos** (solo roles: ADMIN, CAJERO, SUPERVISOR)
   - Mostrar: nombre, email, rol, teléfono WhatsApp, estado activo
   - Filtros por rol
   - Búsqueda por nombre/email
   
2. **Crear usuario interno**
   - Modal con formulario:
     - Nombre y Apellido (obligatorio)
     - Email (obligatorio, único)
     - Contraseña temporal (generada automáticamente o manual)
     - Rol: ADMIN | CAJERO | SUPERVISOR
     - Teléfono WhatsApp (obligatorio para notificaciones)
   - Crear usuario en Supabase Auth
   - Crear perfil con rol y whatsapp_number
   - Enviar credenciales por WhatsApp al nuevo usuario

3. **Editar usuario**
   - Modificar nombre, rol, teléfono
   - NO se puede cambiar email (es el identificador)
   
4. **Desactivar/Activar usuario**
   - Campo `is_active` en profiles (necesita agregarse)
   - Usuario desactivado no puede iniciar sesión

5. **Resetear contraseña**
   - Generar nueva contraseña temporal
   - Marcar `must_change_password = true`
   - Enviar por WhatsApp

---

### Fase 2: Migración de Base de Datos
> Agregar campo necesario para el sistema

#### Migración: `add_is_active_to_profiles`

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Índice para consultas de usuarios activos
CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON profiles(role, is_active) 
WHERE role IN ('ADMIN', 'CAJERO', 'SUPERVISOR', 'SUPER_ADMIN');
```

---

### Fase 3: API de Gestión de Usuarios
> Endpoints para operaciones CRUD de usuarios internos

#### [NEW] `apps/web/src/app/api/admin/users/route.ts`

**Endpoints:**
- `GET /api/admin/users` - Listar usuarios internos
- `POST /api/admin/users` - Crear usuario interno
- `PUT /api/admin/users/[id]` - Actualizar usuario
- `DELETE /api/admin/users/[id]` - Desactivar usuario

**Seguridad:**
- Verificar que el solicitante sea SUPER_ADMIN
- No permitir modificar usuarios con rol SUPER_ADMIN
- Validar formato de whatsapp_number

---

### Fase 4: Notificación de Nueva Operación en Pool
> Enviar WhatsApp a todos los usuarios internos activos cuando entre una operación

#### [NEW] `apps/web/src/app/api/whatsapp/notify-new-operation/route.ts`

**Lógica:**
1. Recibir datos de la operación (transactionId)
2. Obtener todos los usuarios internos activos con whatsapp_number
3. Para cada usuario, enviar mensaje con:
   - Número de operación
   - Datos del cliente (nombre)
   - Monto enviado y moneda
   - Monto a recibir y moneda
   - Datos del beneficiario
   - Enlace directo al pool

**Mensaje ejemplo:**
```
🔔 *Nueva Operación en Pool*

📋 Operación: OP-2026-00011
👤 Cliente: Nairod Flores

💵 Envía: $100.00 USD
💰 Recibe: Bs 38,000.00 VES

🏦 Beneficiario: Gina Maribel
🏛️ Banco: Banesco

👉 Ver en Pool: https://fengxchange.com/panel/pool
```

#### [MODIFY] `apps/web/src/lib/whatsapp/handlers/send-flow.ts`

**Modificación en `handleProofReceived`:**
- Después de crear la transacción con status 'POOL'
- Llamar a `/api/whatsapp/notify-new-operation` con el ID de transacción

---

### Fase 5: Configuración de URL Base
> Manejar URL de producción vs desarrollo

#### Estrategia:
- Usar variable de entorno `NEXT_PUBLIC_APP_URL`
- Valor desarrollo: `http://localhost:3000`
- Valor producción: `https://fengxchange.com`
- Acceder con `process.env.NEXT_PUBLIC_APP_URL`

---

## Variables de Entorno Requeridas

```env
# URL base de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Desarrollo
# NEXT_PUBLIC_APP_URL=https://fengxchange.com  # Producción
```

---

## Resumen de Archivos

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| NEW | `apps/web/src/app/panel/usuarios/page.tsx` | Página de gestión de usuarios |
| NEW | `apps/web/src/app/api/admin/users/route.ts` | API CRUD usuarios |
| NEW | `apps/web/src/app/api/admin/users/[id]/route.ts` | API por usuario |
| NEW | `apps/web/src/app/api/whatsapp/notify-new-operation/route.ts` | Notificación pool |
| MODIFY | `apps/web/src/lib/whatsapp/handlers/send-flow.ts` | Llamar notificación |
| MIGRATION | `add_is_active_to_profiles` | Campo is_active |
