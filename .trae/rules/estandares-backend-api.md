---
alwaysApply: false
globs: apps/web/src/lib/**/*.ts,apps/web/src/services/**/*.ts,scripts/**/*
---
---
trigger: model_decision
description: Define la arquitectura estricta del backend basada en el patrón Modular de NestJS, principios SOLID y manejo de datos con Supabase (PostgreSQL).
---

# Estándares Universales y Mejores Prácticas del Proyecto Backend

## 1. Principios Fundamentales e Idioma
- **Estándar de Idioma (Inglés/Español)**: 
  - **Inglés (Código)**: Todo el código fuente del proyecto DEBE escribirse en inglés. Esto incluye variables, funciones, clases, interfaces, tipado, esquemas de base de datos, nombres de archivos y rutas de API.
  - **Español (Contexto y Documentación)**: DEBEN escribirse en español estrictamente los comentarios dentro del código, mensajes de commit de Git, logs de la aplicación, mensajes de error devueltos al usuario, documentación (README, guías, API docs), tickets de Jira (títulos, descripciones, comentarios) y los nombres/descripciones de las pruebas.
- **Seguridad de Tipado**: Todo el código debe estar completamente tipado usando TypeScript en modo estricto. Queda estrictamente prohibido el uso de `any`; se debe usar `unknown` o tipos específicos. En Supabase, se DEBEN usar los tipos generados de la base de datos.
- **Cambios Incrementales y TDD**: Preferir cambios enfocados en pasos pequeños. Para nuevas funcionalidades, utilizar Desarrollo Guiado por Pruebas (TDD).
- **Documentación**: Cada función pública debe incluir comentarios (JSDoc) explicando su propósito, parámetros y valor de retorno.

## 2. Arquitectura: Patrón Modular (NestJS)
La aplicación debe dividirse en una arquitectura rígida basada en el patrón modular nativo de NestJS:

- **Módulos (`*.module.ts`)**: Agrupan de forma cohesiva los componentes de un dominio específico de la aplicación (ej. `WhatsappModule`, `SupabaseModule`).
- **Controladores y Gateways (`*.controller.ts`, `*.gateway.ts`)**: Son la capa de presentación. Manejan peticiones HTTP o eventos de WebSockets. Extraen parámetros y delegan el trabajo. **Prohibido colocar lógica de negocio aquí.**
- **Servicios (`*.service.ts`)**: Orquestan toda la lógica de negocio, validaciones complejas de negocio y coordinan las llamadas a la base de datos o APIs externas.
- **DTOs (`*.dto.ts`)**: Data Transfer Objects. Clases que definen y validan estrictamente la forma de los datos que entran por los controladores.
- **Proveedores de Infraestructura**: Clases inyectables encargadas exclusivamente de hablar con servicios externos (ej. el cliente de Supabase, cliente de WhatsApp).

## 3. Principios de Diseño (SOLID y DRY)
- **Responsabilidad Única (SRP)**: Cada clase debe tener una sola razón para cambiar. Se debe separar estrictamente la validación de la lógica de negocio.
- **Abierto/Cerrado (OCP)**: Las clases deben estar abiertas para extensión (mediante herencia o composición) pero cerradas para modificación directa.
- **Sustitución de Liskov (LSP)**: Las clases derivadas deben poder reemplazar a sus clases base sin alterar el funcionamiento del sistema.
- **Segregación de Interfaces (ISP)**: Crear múltiples interfaces pequeñas y específicas en lugar de interfaces monolíticas y generales.
- **Inversión de Dependencias (DIP)**: Los módulos de alto nivel no deben depender de implementaciones de bajo nivel (ej. instanciar directamente el cliente de Supabase). Ambos deben depender de abstracciones (interfaces inyectadas).
- **DRY (No te repitas)**: Toda pieza de conocimiento, como validaciones o configuraciones, debe tener una única representación centralizada.

## 4. Estándares de Código y Nomenclatura
- **Archivos**: Usar convención NestJS en kebab-case con su tipo (ej. `user.service.ts`, `auth.controller.ts`).
- **Variables y Funciones**: Usar `camelCase` (ej. `getUserById`, `activeUsers`).
- **Clases e Interfaces**: Usar `PascalCase` (ej. `UserService`, `CreateUserDto`).
- **Constantes**: Usar `UPPER_SNAKE_CASE` (ej. `MAX_RETRY_ATTEMPTS`).
- **Manejo de Errores**:
  - Prohibido omitir errores o usar bloques `try-catch` vacíos.
  - Utilizar las excepciones nativas de NestJS (ej. `NotFoundException`, `BadRequestException`).
  - Implementar Filtros Globales (Exception Filters) para capturar y estandarizar la respuesta de errores de Supabase/Postgres.

## 5. Diseño de API REST
Para todo lo relacionado con la creación de endpoints, estructura de URLs, métodos HTTP, paginación, códigos de estado y respuestas JSON, el agente DEBE acatar estrictamente las reglas definidas en el archivo de configuración manual. 
> **Acción requerida:** Si estás editando o creando controladores/rutas, debes aplicar las reglas de `@rest-api-rules.md`.

## 6. Base de Datos (Supabase / PostgreSQL)

- **Fuente de Verdad**: Los tipos autogenerados de Supabase (`Database` types) son la única fuente de la verdad para la estructura de datos en el código.
- **Migraciones e Infraestructura**: Todo cambio en la estructura de la BD debe controlarse mediante migraciones SQL de Supabase, no manipulando la BD manualmente en producción.
- **Acceso a Datos**: El cliente de Supabase se debe inyectar a través del sistema de Inyección de Dependencias de NestJS, no instanciar globalmente en cada archivo.
- **Tipos de Datos**: Usar siempre `bigint` o `uuid` para IDs y `timestamptz` para fechas (consistencia horaria).
- **Snake Case**: Las tablas y columnas en Postgres deben ser siempre `snake_case` (ej. `user_id`, no `userId`) para evitar problemas de sensibilidad a mayúsculas.
- **Row Level Security (RLS)**: Se debe asumir que las tablas tienen RLS activo. Utilizar el cliente de Supabase con el contexto de autenticación del usuario siempre que sea posible, reservando el `service_role` (bypass) únicamente para tareas administrativas internas del servidor.

## 7. Rendimiento y Seguridad

- **Optimización de Consultas**: Prevenir el problema "N+1" al consultar Supabase. En lugar de hacer consultas en bucle, usar las capacidades de join de Supabase (ej. `.select('*, relation_table(*)')`) para traer datos relacionados eficientemente.
- **Operaciones Asíncronas**: Usar siempre async/await. Implementar `Promise.all()` para ejecutar operaciones concurrentes o paralelas hacia Supabase cuando no dependan entre sí.
- **Validación Temprana**: Validar toda entrada de datos (body, params, query) usando `ValidationPipe` global y DTOs antes de iniciar cualquier lógica de negocio en el servicio.
- **Variables de Entorno**: Es obligatorio validar la existencia de las variables de entorno críticas (ej. `SUPABASE_URL`, `SUPABASE_KEY`) al arrancar la aplicación usando el `ConfigModule` de NestJS.

## 8. Pruebas (Testing)

- **Cobertura Exigida**: Mantener obligatoriamente un 90% de cobertura en ramas, funciones, líneas y sentencias.
- **Estructura (Patrón AAA)**: Todas las pruebas deben seguir la convención Organizar (Arrange), Actuar (Act) y Afirmar (Assert).
- **Nomenclatura de Pruebas**: Nombrar de forma descriptiva utilizando el patrón: `deberia_[comportamiento]_cuando_[condicion]`.
- **Mocking (Simulación)**:
  - Simular (mockear) obligatoriamente el cliente de Supabase y todas las dependencias externas (como WhatsApp) en las pruebas unitarias usando las herramientas de testing de NestJS.
  - Limpiar los mocks en cada bloque `beforeEach()` para garantizar el aislamiento.
- **Categorías**: Es obligatorio incluir casos de ruta feliz (happy path), casos límite (edge cases), pruebas de manejo de errores y pruebas de integración.

## 9. Patrones Técnicos de Infraestructura (Senior)

### Inyección de Dependencias (DI)
- Se debe utilizar SIEMPRE el contenedor de dependencias nativo de NestJS.
- Las clases (Servicios, Controladores) deben recibir sus dependencias (Supabase, otros servicios) a través del constructor. Prohibido instanciar clases fuertemente acopladas.

### Transacciones y Seguridad
- **Transacciones**: Dado que el cliente JS de Supabase no maneja transacciones complejas nativamente, para operaciones que involucren múltiples escrituras atómicas, usar funciones RPC (Remote Procedure Calls) de Postgres.
- **Seguridad Base**: Todo servidor NestJS debe implementar `helmet()`, configurar `cors()` de forma restrictiva y asegurar los límites de payload.
- **Validación con class-validator**: Utilizar decoradores de `class-validator` y `class-transformer` en los DTOs para sanitizar la data entrante en los controladores.