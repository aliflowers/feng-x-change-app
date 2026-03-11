---
trigger: manual
---

# Estándares Avanzados de Diseño API REST

## 1. Estructura de URLs y Recursos
- **Nombres en Plural**: Los recursos deben ser sustantivos en plural (ej. `GET /api/users`, `POST /api/orders`). Queda prohibido el uso de verbos en la URL (NUNCA usar `/api/getUser`).
- **Recursos Anidados**: Mantener un anidamiento superficial (máximo un nivel). 
  - ✅ Bien: `GET /api/users/{id}/orders`
  - ❌ Mal: `GET /api/users/{id}/orders/{orderId}/items` (Mejor usar `GET /api/orders/{orderId}/items`).

## 2. Métodos HTTP y Códigos de Estado
- `GET`: Recuperar recursos. Devuelve `200 OK` (o `404 Not Found`).
- `POST`: Crear recursos. Devuelve `201 Created`.
- `PUT`: Reemplazar el recurso completo. Devuelve `200 OK`.
- `PATCH`: Actualización parcial. Devuelve `200 OK`.
- `DELETE`: Eliminar recurso. Devuelve `204 No Content` (sin cuerpo de respuesta) o `409 Conflict` si hay restricciones de llave foránea.

## 3. Filtrado, Ordenamiento y Búsqueda (Query Params)
Utilizar parámetros de consulta estandarizados para operaciones de listado:
- **Filtrado**: `GET /api/users?status=active&role=admin`
- **Ordenamiento**: `GET /api/users?sort=createdAt` (ascendente) o `GET /api/users?sort=-createdAt` (descendente).
- **Búsqueda**: `GET /api/users?search=john`

## 4. Patrones de Paginación
Toda colección de datos DEBE estar paginada.
- **Paginación por Offset (Por defecto)**: 
  Usar `page` y `limit`. La respuesta debe incluir metadatos:
  ```json
  {
    "items": [...],
    "pagination": {
      "page": 2,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }

Paginación por Cursor (Para grandes volúmenes): Usar cursor y limit. Ideal para feeds infinitos.


## 5. Formato de Respuesta de Errores
Todos los errores deben seguir una estructura JSON estricta y predecible:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}


## 6. Rate Limiting y Seguridad.

- Los endpoints públicos deben estar protegidos por un middleware de Rate Limiting (ej. express-rate-limit).

- Cuando se excede el límite, devolver código 429 Too Many Requests con el header Retry-After.

- Las rutas privadas deben requerir un token Bearer (Authorization: Bearer <token>) devolviendo 401 Unauthorized si falta o 403 Forbidden si no hay permisos.

## 7. Caché e Idempotencia.

- Caché: Usar headers Cache-Control (public, max-age=3600) para recursos estáticos o de lectura frecuente.

- Idempotencia: Para operaciones críticas de creación (POST), como pagos o envíos, soportar el header Idempotency-Key para evitar procesamiento duplicado si el cliente reintenta la petición.


## 8. Operaciones en Lote (Bulk)

- Para endpoints que procesan múltiples items a la vez, devolver un resumen de los resultados individuales:

{
  "results": [
    {"id": "1", "status": "created"},
    {"id": null, "status": "failed", "error": "Email already exists"}
  ]
}