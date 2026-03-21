---
alwaysApply: false
---
# 🧠 Orquestador de Inteligencia del Proyecto

Este documento dirige la activación de reglas y procesos según el contexto de la tarea. El agente DEBE sincronizar estas directrices con las reglas locales del workspace.

## 1. Reglas del Proyecto (Contexto Local)

Ubicadas en `.agents/rules/`, estas reglas definen la identidad técnica del proyecto:

- **@reglas-basicas.md** (SIEMPRE ACTIVA): Gobierna el idioma (Código Inglés / Soporte Español), TDD, tipado estricto y la metodología de pasos pequeños.
- - **@estandares-backend-api.md** (MANUAL/CONTEXTUAL): Define la arquitectura Modular de NestJS, principios SOLID y el manejo de datos con Supabase (PostgreSQL). Invocar al trabajar en lógica de negocio, módulos o infraestructura.
- **@rest-api-rules.md** (EL AGENTE DECIDE): Define el contrato externo de la API (URLs, Códigos HTTP, JSON). Invocar obligatoriamente al editar rutas o controladores.
- **@nextjs-frontend.md** (EL AGENTE DECIDE): Estándares de Next.js App Router (v14+), Server Components, Server Actions y optimización de renderizado con Turbopack.
- **@typescript-pro.md** (EL AGENTE DECIDE): Guía avanzada de tipado, genéricos complejos, utilidades de tipos y patrones de diseño type-safe.

***

## 2. Workflows Globales (Herramientas de Acción)

Utiliza estos procesos para tareas de creación o revisión profunda. El agente debe leer estos archivos cuando el usuario los mencione o el contexto lo exija:

- **/diseno-api-rest**: Creación de nuevos endpoints desde cero con plantillas TypeScript/Express/Prisma.
- **/auditar-endpoint**: Checklist de validación de seguridad, performance y estándares REST antes de terminar una API.
- **/auditar-ui**: Revisión de componentes frontend, formularios y layouts para validar accesibilidad (a11y) y UX interactiva.
- **/postgres-best-practice**: Optimización avanzada de esquemas de base de datos e indexación en Postgres.
- **/react-performance**: Auditoría extrema de cuellos de botella, cascadas de red y renders innecesarios en React/Next.js.
- **/review-component**: Revisión exhaustiva general de la estructura y calidad de un componente frontend.
- **/crear-modulo-fullstack**: Generador automático de módulos completos (Base de datos, Backend DDD, API y Frontend Next.js) desde cero.

***

## 3. Matriz de Activación Inteligente

| Si el usuario pide...                                | El agente DEBE activar...                            |
| :--------------------------------------------------- | :--------------------------------------------------- |
| Crear un nuevo módulo/feature (Backend)              | `@estandares-backend-api.md` + `@reglas-basicas.md`  |
| Diseñar un endpoint REST nuevo                       | `/diseno-api-rest` + `@rest-api-rules.md`            |
| Revisar un controlador existente                     | `@rest-api-rules.md` + `/auditar-endpoint`           |
| Crear una página, layout o componente UI             | `@nextjs-frontend.md` + `@reglas-basicas.md`         |
| Implementar un Server Action (Formularios)           | `@nextjs-frontend.md` + `@estandares-backend-api.md` |
| Configurar metadatos, SEO o generar sitemaps         | `@nextjs-frontend.md`                                |
| Optimizar carga de imágenes o fuentes                | `@nextjs-frontend.md`                                |
| Crear utilidades, clientes de API o tipos            | `@typescript-pro.md` + `@reglas-basicas.md`          |
| Refactorizar lógica para eliminar el uso de `any`    | `@typescript-pro.md`                                 |
| Implementar validaciones complejas de UI             | `@typescript-pro.md` + `@nextjs-frontend.md`         |
| Revisar UI, UX, o Accesibilidad de un formulario     | `@nextjs-frontend.md` + `/auditar-ui`                |
| Optimizar rendimiento del frontend / cascadas        | `/react-performance`                                 |
| Optimizar base de datos o arreglar query lenta       | `/postgres-best-practice`                            |
| Corregir un error de tipos general                   | `@reglas-basicas.md`                                 |
| Crear una funcionalidad o módulo completo desde cero | `/crear-modulo-fullstack`                            |

***

## 4. Protocolo de Ejecución Estricto

1. **Idioma**: Todas las explicaciones, logs y comentarios deben ser en **Español**. El código resultante debe ser **Inglés**.
2. **Modularidad**: No intentes realizar cambios arquitectónicos y de diseño de API al mismo tiempo. Divide la tarea.
3. **Menciones**: Si el agente detecta que la tarea requiere una regla manual no cargada, debe sugerir al usuario: *"Para proceder con precisión, ¿podrías mencionar @nombre-de-la-regla?"*
4. **Diseño Responsive (Mobile-First)**: Todo código de interfaz de usuario (UI) generado DEBE ser 100% responsive. Asume siempre un enfoque "Mobile-First" (diseña primero para móviles y usa breakpoints como `md:` o `lg:` para escalar a tablet/escritorio). Ningún componente debe romperse o requerir scroll horizontal en pantallas pequeñas.
5. **Documentación Continua y Modular**: TODO cambio (nuevo módulo, refactor o corrección) DEBE documentarse antes de sugerir un commit. **NO** satures el `README.md` principal con detalles técnicos. Debes actualizar o crear un archivo `README.md` LOCAL dentro de la carpeta del módulo o componente específico que estás modificando (ej. `src/features/modulo/README.md`). Mantén un Changelog en ese archivo local con la **fecha y hora exacta** del ajuste, detallando qué se hizo y por qué.

