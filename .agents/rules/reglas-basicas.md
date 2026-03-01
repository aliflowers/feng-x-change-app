---
trigger: manual
---

# Estándares Universales y Mejores Prácticas del Proyecto Backend

## 1. Principios Fundamentales e Idioma
- - **Estándar de Idioma (Inglés/Español)**: 
  - **Inglés (Código)**: Todo el código fuente del proyecto DEBE escribirse en inglés. Esto incluye variables, funciones, clases, interfaces, tipado, esquemas de base de datos, nombres de archivos y rutas de API.
  - **Español (Contexto y Documentación)**: DEBEN escribirse en español estrictamente los comentarios dentro del código, mensajes de commit de Git, logs de la aplicación, mensajes de error devueltos al usuario, documentación (README, guías, API docs), tickets de Jira (títulos, descripciones, comentarios) y los nombres/descripciones de las pruebas.
- **Seguridad de Tipado**: Todo el código debe estar completamente tipado usando TypeScript en modo estricto. Queda estrictamente prohibido el uso de `any`; se debe usar `unknown` o tipos específicos.
- **Cambios Incrementales y TDD**: Preferir cambios enfocados en pasos pequeños. Para nuevas funcionalidades, utilizar Desarrollo Guiado por Pruebas (TDD).
- **Documentación**: Cada función pública debe incluir comentarios (JSDoc) explicando su propósito, parámetros y valor de retorno.

## 2. Arquitectura: Diseño Guiado por el Dominio (DDD)
La aplicación debe dividirse en una arquitectura de capas rígida basada en principios DDD:

- **Capa de Presentación (`src/presentacion/`)**: Controladores que manejan peticiones y respuestas HTTP. Definen las rutas (endpoints).
- **Capa de Aplicación (`src/aplicacion/`)**: Servicios que orquestan la lógica de negocio y módulos validadores de entrada.
- **Capa de Dominio (`src/dominio/`)**: Núcleo del sistema sin dependencias externas. Contiene:
  - **Entidades**: Objetos con identidad única (ID) que encapsulan su propia lógica y estado.
  - **Objetos de Valor**: Conceptos definidos puramente por sus atributos, sin identidad única (ej. direcciones o periodos de tiempo).
  - **Agregados**: Clústeres de objetos tratados como una unidad, controlados por una "entidad raíz" que asegura la consistencia.
  - **Servicios de Dominio**: Lógica de negocio que no pertenece naturalmente a una sola entidad.
  - **Interfaces de Repositorio**: Definen los contratos de acceso a datos.
- **Capa de Infraestructura (`src/infraestructura/`)**: Implementación concreta de repositorios (usando Prisma), utilidades de logs y conexión a servicios externos.

## 3. Principios de Diseño (SOLID y DRY)
- **Responsabilidad Única (SRP)**: Cada clase debe tener una sola razón para cambiar. Se debe separar estrictamente la validación de la persistencia de datos.
- **Abierto/Cerrado (OCP)**: Las entidades deben estar abiertas para extensión (mediante herencia o composición) pero cerradas para modificación directa.
- **Sustitución de Liskov (LSP)**: Las clases derivadas deben poder reemplazar a sus clases base sin alterar el funcionamiento del sistema.
- **Segregación de Interfaces (ISP)**: Crear múltiples interfaces pequeñas y específicas en lugar de interfaces monolíticas y generales.
- **Inversión de Dependencias (DIP)**: Los módulos de alto nivel no deben depender de implementaciones de bajo nivel (ej. PrismaClient), ambos deben depender de abstracciones (interfaces).
- **DRY (No te repitas)**: Toda pieza de conocimiento, como validaciones o configuraciones, debe tener una única representación centralizada.

## 4. Estándares de Código y Nomenclatura
- **Archivos y Variables**: Usar `camelCase` (ej. `servicioUsuario.ts`, `idUsuario`).
- **Clases e Interfaces**: Usar `PascalCase` (ej. `Usuario`, `IRepositorioUsuario`).
- **Constantes**: Usar `UPPER_SNAKE_CASE` (ej. `MAXIMO_INTENTOS`).
- **Manejo de Errores**:
  - Prohibido omitir errores o usar bloques `try-catch` vacíos.
  - Crear y utilizar clases de error personalizadas por dominio (ej. `ErrorNoEncontrado`).
  - Implementar un middleware global para capturar errores de forma estandarizada.

## 5. Diseño de API REST
Para todo lo relacionado con la creación de endpoints, estructura de URLs, métodos HTTP, paginación, códigos de estado y respuestas JSON, el agente DEBE acatar estrictamente las reglas definidas en el archivo de configuración manual. 
> **Acción requerida:** Si estás editando o creando controladores/rutas, debes aplicar las reglas de `@rest-api-rules.md`.

## 6. Base de Datos (Prisma)

- **Fuente de Verdad**: El archivo schema.prisma es la única fuente de la verdad para la estructura de datos.

- **Migraciones**: Todo cambio en la estructura debe controlarse y versionarse mediante migraciones.


- **Patrón Repositorio**: El acceso a la base de datos se debe inyectar a través de interfaces, aislando a Prisma en la capa de infraestructura.

- **Tipos de Datos**: Usar siempre `bigint` para IDs (evitar `int` por desbordamiento) y `timestamptz` para fechas (consistencia horaria).
- **Índices de FK**: Prisma no indexa automáticamente las llaves foráneas. El agente DEBE añadir índices explícitamente en todas las columnas de relación para evitar scans de tabla completa.
- **Snake Case**: Las tablas y columnas deben ser siempre snake_case (ej. user_id, no userId) para evitar problemas de sensibilidad a mayúsculas en Postgres.

## 7. Rendimiento y Seguridad

- **Optimización de Consultas**: Prevenir explícitamente el problema "N+1" utilizando la funcionalidad include de Prisma para cargar relaciones de forma eficiente.

- **Operaciones Asíncronas**: Usar siempre async/await. Implementar Promise.all() para ejecutar operaciones concurrentes o paralelas cuando no dependan entre sí.


- **Validación Temprana**: Validar toda entrada de datos (body, params, query) antes de iniciar cualquier lógica de negocio.
+1


- **Variables de Entorno**: Es obligatorio validar la existencia de las variables de entorno críticas (ej. DATABASE_URL) al arrancar la aplicación.


## 8. Pruebas (Testing)

- **Cobertura Exigida**: Mantener obligatoriamente un 90% de cobertura en ramas, funciones, líneas y sentencias.
+1


- **Estructura (Patrón AAA)**: Todas las pruebas deben seguir la convención Organizar (Arrange), Actuar (Act) y Afirmar (Assert).


- **Nomenclatura de Pruebas**: Nombrar de forma descriptiva utilizando el patrón: deberia_[comportamiento]_cuando_[condicion].

- **Mocking (Simulación)**:

 - Simular (mockear) obligatoriamente la base de datos (Prisma) y todas las dependencias externas en las pruebas unitarias.

 - Limpiar los mocks en cada bloque beforeEach() para garantizar el aislamiento.


- **Categorías**: Es obligatorio incluir casos de ruta feliz (happy path), casos límite (edge cases), pruebas de manejo de errores y pruebas de integración.


## 9. Patrones Técnicos de Infraestructura (Senior)

### Inyección de Dependencias (DI)
- Se debe utilizar un contenedor de dependencias o inyección manual en el punto de entrada (Main/Server).
- Las clases deben recibir sus dependencias (repositorios, servicios) a través del constructor.

### Transacciones y Seguridad
- **Transacciones**: Para operaciones que involucren múltiples escrituras, usar `$transaction` de Prisma para asegurar la atomicidad.
- **Seguridad Base**: Todo servidor Express debe implementar `helmet()`, `cors()` con orígenes limitados y `compression()`.
- **Validación con Zod**: Utilizar esquemas de Zod para validar `req.body` y `req.params` antes de que lleguen al controlador.
