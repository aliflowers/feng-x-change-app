---
alwaysApply: true
---
# Reglas Básicas y Disciplina del Proyecto

## 1. Principios Fundamentales
- **Tareas pequeñas, una a la vez**: Trabajar siempre en pasos de bebé, uno a la vez.
- **Nunca avanzar más de un paso**: No intentar realizar múltiples tareas complejas simultáneamente.
- **Desarrollo Guiado por Pruebas (TDD)**: Comenzar con pruebas fallidas para cualquier nueva funcionalidad, de acuerdo con los detalles de la tarea.
- **Seguridad de Tipado**: Todo el código debe estar completamente tipado.
- **Nombres Claros**: Usar nombres claros y descriptivos para todas las variables y funciones.
- **Cambios Incrementales**: Preferir cambios incrementales y enfocados sobre modificaciones grandes y complejas.
- **Cuestionar Suposiciones**: Cuestionar siempre las suposiciones e inferencias.
- **Detección de Patrones**: Detectar y resaltar patrones de código repetidos.
- **Confirmación de Eliminación**: Antes de eliminar funcionalidad existente o archivos que no parezcan estar en uso, el agente DEBE confirmar con el usuario.
- **Documentación de Funciones**: Cada función pública debe incluir comentarios (JSDoc o Docstrings) que expliquen su propósito, parámetros y valor de retorno.
- **Documentación como Código (Modular)**: Ningún ticket, feature o refactor está terminado sin documentar. Encuentra el `README.md` del módulo específico en el que estás trabajando (o créalo si no existe) y registra allí los cambios técnicos, incluyendo la fecha y hora exacta, antes de proponer un commit.

## 2. Estándares de Idioma

- **Código en Inglés**: Todos los elementos estructurales y lógicos del proyecto deben escribirse en inglés siguiendo los estándares de la industria. Esto incluye explícitamente:
    - Variables, funciones, clases, tipos e interfaces.
    - Esquemas de datos y nombres de tablas/columnas en bases de datos.
    - Archivos de configuración, nombres de archivos y scripts.
    - Endpoints y rutas de la API.

- **Soporte y Documentación en Español**: Todos los elementos destinados a la legibilidad humana, soporte y gestión del proyecto deben escribirse en español. Esto incluye exclusivamente:
    - Comentarios explicativos dentro del código (JSDoc, Docstrings).
    - Mensajes de commit de Git.
    - Logs del sistema y mensajes de error (tanto internos como los devueltos al cliente).
    - Documentación técnica (README, guías, API docs).
    - Tickets de Jira (títulos, descripciones, comentarios).
    - Nombres (títulos de los bloques `describe` e `it`) y descripciones de las pruebas.

## 3. Manejo de Errores y Logs

- **No omitir errores**: Queda prohibido el uso de bloques `try-catch` vacíos.
- **Registro descriptivo**: Todo error capturado debe ser tipado y registrado con un mensaje en español que facilite la depuración.