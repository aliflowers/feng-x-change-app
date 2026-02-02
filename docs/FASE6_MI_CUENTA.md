# 👤 Fase 6: Mi Cuenta - Plan de Implementación

## Objetivo

Permitir a los usuarios internos cambiar sus credenciales de forma segura, con verificación 2FA obligatoria y permisos diferenciados por rol.

---

## Permisos por Rol

| Rol | Cambiar Email | Cambiar Contraseña | Requiere 2FA |
|-----|---------------|-------------------|--------------|
| **SUPER_ADMIN** | ✅ Sí | ✅ Sí | ✅ Sí |
| **ADMIN** | ❌ No | ✅ Sí | ✅ Sí |
| **CAJERO** | ❌ No | ✅ Sí | ✅ Sí |
| **SUPERVISOR** | ❌ No | ✅ Sí | ✅ Sí |

> **Nota:** Los usuarios ADMIN, CAJERO y SUPERVISOR no pueden cambiar su email porque fue asignado al registrar su cuenta. Solo pueden cambiar su contraseña.

---

## Requisitos Confirmados

| Requisito | Decisión |
|-----------|----------|
| **Verificación 2FA** | ✅ Obligatorio para todos los cambios |
| **Ubicación** | En `/panel/configuracion`, tab "Mi Cuenta" |
| **Notificación post-cambio** | ❌ No requerida (2FA es suficiente) |
| **Logout forzado** | ❌ No, mantener o recargar sesión |

---

## Proposed Changes

### Backend/API

---

#### [NEW] [route.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/api/auth/change-email/route.ts)

**Endpoint:** `POST /api/auth/change-email`

> [!IMPORTANT]
> **Solo disponible para SUPER_ADMIN.** Otros roles recibirán error 403.

**Flujo:**
1. Verificar sesión activa
2. **Verificar rol = SUPER_ADMIN** (rechazar otros roles)
3. Validar contraseña actual
4. Verificar código 2FA
5. Actualizar email en Supabase Auth
6. Actualizar email en tabla `profiles`
7. Registrar en `audit_logs`

**Request Body:**
```typescript
{
  currentPassword: string;
  newEmail: string;
  twoFactorCode: string;
}
```

**Response (éxito):**
```typescript
{ success: true, message: "Email actualizado correctamente" }
```

**Response (rol no autorizado):**
```typescript
{ error: "No tienes permiso para cambiar tu email" }
```

---

#### [NEW] [route.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/api/auth/change-password/route.ts)

**Endpoint:** `POST /api/auth/change-password`

**Flujo:**
1. Verificar sesión activa
2. Verificar rol interno
3. Validar contraseña actual
4. Validar fortaleza de nueva contraseña
5. Verificar código 2FA
6. Actualizar contraseña en Supabase Auth
7. Registrar en `audit_logs`

**Request Body:**
```typescript
{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorCode: string;
}
```

**Validaciones de contraseña:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número
- Al menos 1 carácter especial

---

### Frontend

---

#### [NEW] [MiCuentaTab.tsx](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/panel/configuracion/components/MiCuentaTab.tsx)

**Props:**
```typescript
interface MiCuentaTabProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
  userEmail: string;
}
```

**Estructura UI (formulario unificado):**

```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Cambiar Email (SOLO SUPER_ADMIN)              [Toggle]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Nuevo email: [________________________]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 🔐 Cambiar Contraseña                             [Toggle]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Nueva contraseña: [________________________]            │ │
│ │ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ Fortaleza: Buena                   │ │
│ │ Confirmar contraseña: [________________________]        │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 🛡️  Verificación de Seguridad (ÚNICO PARA TODOS)           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Contraseña actual: [________________________]           │ │
│ │ Código 2FA: [______]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                              [💾 Guardar Cambios]           │
└─────────────────────────────────────────────────────────────┘
```

**Lógica condicional:**
```tsx
{userRole === 'SUPER_ADMIN' && (
  <ChangeEmailSection />
)}
<ChangePasswordSection /> {/* Siempre visible */}
```

**Componentes incluidos:**
- `PasswordStrengthMeter` - Medidor visual de fortaleza
- `TwoFactorInput` - Input de código 2FA con formato automático

---

#### [MODIFY] [page.tsx](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/panel/configuracion/page.tsx)

**Cambios:**
1. Importar componente `MiCuentaTab`
2. Reemplazar placeholder por componente real

---

## Flujo de Cambio de Credenciales

```
Usuario clickea "Mi Cuenta"
         ↓
Muestra formularios
         ↓
Usuario llena datos + código 2FA
         ↓
┌─────────────────────────────────────┐
│ POST /api/auth/change-email         │
│ o /api/auth/change-password         │
├─────────────────────────────────────┤
│ 1. Verificar sesión                 │
│ 2. Verificar rol interno            │
│ 3. Verificar password actual        │
│ 4. Verificar código 2FA ←───────────│─ Obligatorio
│ 5. Actualizar credencial            │
│ 6. Registrar en audit_logs          │
│ 7. Retornar success                 │
└─────────────────────────────────────┘
         ↓
Frontend muestra toast de éxito
         ↓
Sesión se mantiene (no logout)
```

---

## Consideración de Seguridad

> [!IMPORTANT]
> Si el usuario NO tiene 2FA configurado, NO podrá cambiar sus credenciales.
> Debe configurar 2FA primero en la pestaña "Seguridad".

**Mensaje a mostrar:**
```
Para cambiar tus credenciales, debes tener la autenticación 
de dos factores (2FA) habilitada. Configúrala en la pestaña "Seguridad".
```

---

## Checklist de Implementación

### Backend
- [ ] Crear `POST /api/auth/change-email`
  - [ ] Validación de sesión
  - [ ] **Verificar rol = SUPER_ADMIN (rechazar otros)**
  - [ ] Verificación de password actual
  - [ ] Verificación de código 2FA
  - [ ] Actualizar Supabase Auth
  - [ ] Actualizar tabla profiles
  - [ ] Registrar en audit_logs
- [ ] Crear `POST /api/auth/change-password`
  - [ ] Validación de sesión y rol
  - [ ] Verificación de password actual
  - [ ] Validación de fortaleza
  - [ ] Verificación de código 2FA
  - [ ] Actualizar Supabase Auth
  - [ ] Registrar en audit_logs

### Frontend
- [ ] Crear `MiCuentaTab.tsx`
  - [ ] **Sección cambio de email (solo SUPER_ADMIN)**
  - [ ] Sección cambio de contraseña
  - [ ] Medidor de fortaleza de contraseña
  - [ ] Input de código 2FA
  - [ ] Validación de formularios
  - [ ] Mensajes de éxito/error
  - [ ] Bloqueo si no tiene 2FA
- [ ] Modificar `page.tsx` para importar componente

### Pruebas
- [ ] Cambiar email con 2FA válido **(como SUPER_ADMIN)**
- [ ] **Intentar cambiar email como ADMIN (debe fallar)**
- [ ] Cambiar contraseña con 2FA válido
- [ ] Intentar cambiar sin 2FA configurado
- [ ] Intentar con código 2FA inválido
- [ ] Intentar con contraseña actual incorrecta
- [ ] Verificar registro en audit_logs

---

## Tiempo Estimado

| Componente | Tiempo |
|------------|--------|
| Backend endpoints | 1h |
| Frontend MiCuentaTab | 1.5h |
| Pruebas y ajustes | 30min |
| **Total** | **~3h** |
