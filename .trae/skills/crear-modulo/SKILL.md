---
name: crear-modulo-fullstack
description: Generador de módulos Fullstack. Crea la estructura completa (BD Supabase, Backend Modular NestJS, API REST y Frontend Next.js) aplicando todas las reglas del orquestador.
---

# 🏗️ Creación de Módulo Fullstack (/crear-modulo-fullstack)

Usa este flujo para crear un módulo o funcionalidad completa desde cero, asegurando consistencia absoluta en todo el stack tecnológico.

## 1. Base de Datos (Supabase / PostgreSQL)
- Analiza los requerimientos y propone el modelo de tablas y relaciones para PostgreSQL.
- Aplica las reglas de indexación, UUIDs/BigInt y convenciones del workflow **`/postgres-best-practice`**.
- Define las Políticas de Seguridad de Filas (RLS - Row Level Security) necesarias y sugiere el script SQL de migración para Supabase.

## 2. Backend (Arquitectura Modular NestJS & API)
Aplica la regla **`@estandares-backend-api.md`** para generar la estructura del nuevo módulo en NestJS:
1. **Módulo (`*.module.ts`):** Define los proveedores, controladores y dependencias inyectadas (ej. Supabase).
2. **Servicios (`*.service.ts`):** Contiene toda la lógica de negocio y las llamadas al cliente de Supabase.
3. **Controladores (`*.controller.ts`):** Exponen los endpoints HTTP delegando la ejecución a los servicios (Cero lógica aquí).
4. **DTOs (`*.dto.ts`):** Clases con `class-validator` para validar estrictamente la entrada y salida de datos.

Usa el workflow **`/diseno-api-rest`** y la regla **`@rest-api-rules.md`** para estructurar las rutas de los controladores con los verbos HTTP y códigos de estado correctos. Tipa absolutamente todo usando la regla **`@typescript-pro.md`**.

## 3. Frontend (Next.js App Router)
Aplica la regla **`@nextjs-frontend.md`** para estructurar la UI:
- Crea la ruta bajo la carpeta correspondiente en el frontend (ej. `apps/web/src/app/...`).
- Construye la página principal como **Server Component** para el fetching inicial de datos.
- Construye los componentes interactivos (formularios, botones) como **Client Components**.
- Asegura que el diseño sea Mobile-First y accesible aplicando el workflow **`/auditar-ui`**.

## 4. Entregable y Documentación Modular (Paso Final)
1. Provee el árbol de carpetas y el código inicial paso a paso.
2. **ALTO:** Antes de dar por terminada la tarea, DEBES crear un archivo `README.md` ESPECÍFICO para este nuevo módulo, ubicado dentro de su carpeta principal.
3. En este documento local, detalla:
   - Arquitectura y flujo de datos específico del módulo.
   - Endpoints de la API correspondientes.
   - Componentes principales.
   - **Changelog:** Añade una entrada con la Fecha y Hora exacta de creación de este módulo.
4. Si es necesario, añade un enlace a este nuevo módulo en el índice del `README.md` principal del proyecto.