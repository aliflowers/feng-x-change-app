---
trigger: model_decision
description: Orquesta el uso de 8 skills (React, UI, Next.js, Supabase, Node, APIs, TypeScript, Arquitectura) según el contexto. Soporta comandos rápidos (/react, /ui, /db, etc.) y activación automática para revisiones de código.
---

# Orquestación de Skills Instaladas

## Skills disponibles

Tienes 8 skills globales instaladas en `C:\Users\jesus\.agents\skills\`:

### Frontend & UI
1. **vercel-react-best-practices**: Performance React/Next.js (waterfalls, bundle size, re-renders)
2. **web-design-guidelines**: Accesibilidad, UX, animaciones, formularios
3. **nextjs-app-router-patterns**: Server Components, layouts, parallel routes, streaming

### Backend & Database
4. **supabase-postgres-best-practices**: PostgreSQL, RLS, Edge Functions, queries optimizadas
5. **nodejs-backend-patterns**: Middleware, error handling, validation, dependency injection

### TypeScript & APIs
6. **typescript-advanced-types**: Conditional types, mapped types, generics avanzados
7. **api-design-principles**: REST, versionado, paginación, rate limiting, error responses

### Arquitectura
8. **architecture-patterns**: Clean Architecture, DDD, CQRS, microservices vs monolith

---

## Reglas de activación automática

### Usa skills cuando detectes:

**Frontend/React/Next.js:**
- Componentes o páginas React/Next.js
- Optimización de performance o rendering
- Análisis de data fetching o bundle size
→ Usa: `vercel-react-best-practices` + `nextjs-app-router-patterns`

**UI/UX/Accesibilidad:**
- Interfaces de usuario
- Verificación de accesibilidad
- Auditoría de formularios o animaciones
→ Usa: `web-design-guidelines`

**Base de datos:**
- Queries PostgreSQL/Supabase
- Optimización de RLS o Edge Functions
- Performance de base de datos
→ Usa: `supabase-postgres-best-practices`

**Backend/APIs:**
- Endpoints o middlewares
- Diseño de APIs REST
- Error handling o validación
→ Usa: `nodejs-backend-patterns` + `api-design-principles`

**TypeScript:**
- Tipos complejos o genéricos
- Optimización de inferencia de tipos
- Resolución de problemas de tipado
→ Usa: `typescript-advanced-types`

**Arquitectura:**
- Diseño de estructura de proyecto
- Evaluación de patrones arquitectónicos
- Decisiones entre enfoques (monolito vs microservicios)
→ Usa: `architecture-patterns`

---

## Reglas de NO activación

NO uses skills para:
- Cambios triviales de CSS/estilos (< 5 líneas)
- Preguntas sobre sintaxis básica
- Debugging de errores puntuales sin análisis profundo
- Conversaciones sobre arquitectura sin código específico

---

## Combinación de skills

Puedes usar MÚLTIPLES skills simultáneamente:

**Ejemplo:** Revisar componente Next.js completo
→ `vercel-react-best-practices` + `web-design-guidelines` + `nextjs-app-router-patterns`

**Ejemplo:** Revisar endpoint API con DB
→ `api-design-principles` + `supabase-postgres-best-practices` + `nodejs-backend-patterns`

**Ejemplo:** Revisar arquitectura de feature
→ `architecture-patterns` + `typescript-advanced-types`

---

## Comandos rápidos

### 🎯 Comandos individuales (una skill)

**Frontend:**
- `/react` → vercel-react-best-practices
- `/ui` → web-design-guidelines
- `/next` → nextjs-app-router-patterns

**Backend:**
- `/db` → supabase-postgres-best-practices
- `/node` → nodejs-backend-patterns
- `/api` → api-design-principles

**Core:**
- `/ts` → typescript-advanced-types
- `/arch` → architecture-patterns

---

### 🔗 Comandos combinados (múltiples skills)

**Por capa:**
- `/frontend` → `/react` + `/ui` + `/next`
- `/backend` → `/node` + `/api` + `/db`
- `/fullstack` → `/frontend` + `/backend` + `/ts`

**Por tipo de archivo:**
- `/component` → `/react` + `/ui` + `/next` + `/ts`
- `/page` → `/react` + `/next` + `/ui`
- `/endpoint` → `/api` + `/node` + `/db`

**Por objetivo:**
- `/perf` → `/react` (solo performance)
- `/a11y` → `/ui` (solo accesibilidad)
- `/security` → `/db` + `/api` (seguridad)
- `/design` → `/arch` (arquitectura)

**Auditoría completa:**
- `/full` → Las 8 skills (máxima profundidad)

---

### ⚡ Composición manual

Puedes combinar comandos:
- `"/react /ui"` → Usa ambas skills
- `"/api /db /ts"` → API + DB + tipos
- `"/next /arch"` → Next.js + decisiones arquitectónicas

---

## Flujo de trabajo

1. **Analiza la petición:** ¿Qué skills son relevantes?
2. **Carga skills necesarias:** Lee sus archivos correspondientes
3. **Aplica todas las reglas:** De cada skill cargada
4. **Devuelve resultados:** Formato según especifica cada skill
5. **Si dudas:** Pregúntame qué skills usar

---

## Notificación

Si NO puedes acceder a alguna skill cuando sea relevante:
1. Avísame INMEDIATAMENTE
2. NO continúes con análisis genérico
3. Espera instrucciones
