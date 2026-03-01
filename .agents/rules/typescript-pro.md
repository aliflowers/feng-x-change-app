---
trigger: manual
---

# TypeScript Advanced Types (Mastery)

Guía avanzada para el uso de tipos complejos, genéricos y patrones de diseño type-safe.

## 1. Conceptos Core

### Generics y Restricciones

Permiten crear componentes flexibles sin perder la seguridad de tipos.

```typescript
// Función con restricciones (debe tener propiedad length)
function logLength<T extends { length: number }>(item: T): T {
  console.log(item.length);
  return item;
}

// Múltiples parámetros y tipos de intersección
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

```

### Tipos Condicionales e Inferencia (`infer`)

Permiten lógica de tipos basada en condiciones y extracción de tipos internos.

```typescript
// Extraer el tipo de retorno de una función
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Extraer el tipo de una Promesa
type PromiseType<T> = T extends Promise<infer U> ? U : never;

// Extraer el tipo de elemento de un Array
type ElementType<T> = T extends (infer U)[] ? U : never;

```

### Mapped Types y Remapeo de Keys

Transforman tipos existentes iterando sobre sus propiedades.

```typescript
// Pick por tipo específico
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

// Generar Getters automáticamente
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

```

---

## 2. Patrones Avanzados Pro

### Patrón: Discriminated Unions (Estados de UI)

Fundamental para manejar estados en Next.js sin errores de nulidad.

```typescript
type AsyncState<T> = 
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function handleState<T>(state: AsyncState<T>) {
  if (state.status === "success") {
    console.log(state.data); // Type-safe: T
  }
}

```

### Patrón: API Client Type-Safe

Define contratos de API que validan rutas, métodos y respuestas.

```typescript
type EndpointConfig = {
  "/users": {
    GET: { response: User[] };
    POST: { body: { name: string }; response: User };
  };
};

class APIClient<Config extends Record<string, any>> {
  async request<Path extends keyof Config, Method extends keyof Config[Path]>(
    path: Path,
    method: Method,
    options?: any
  ): Promise<any> { /* impl */ }
}

```

### Patrón: Deep Readonly / Partial

Asegura que objetos anidados (como configuraciones) sean inmutables u opcionales.

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

```

---

## 3. Técnicas de Inferencia y Guardas

* **Type Guards**: `value is T` para estrechar tipos en bloques condicionales.
* **Assertion Functions**: `asserts value is T` para validaciones que lanzan excepciones.
* **Const Assertions**: `as const` para convertir objetos en literales de solo lectura.

---

## 4. Mejores Prácticas y Rendimiento

### ✅ Hacer (Do's)

* **Usar `unknown` en lugar de `any**`: Obliga a realizar comprobaciones de tipo antes del uso.
* **Priorizar `interface` para objetos**: Provee mejores mensajes de error y es extensible.
* **Habilitar `strict mode**`: Es la base de toda la seguridad del sistema.
* **Documentar tipos complejos**: Usar comentarios JSDoc para explicar la lógica de tipos avanzados.

### ❌ No Hacer (Don'ts)

* **Evitar aserciones de tipo (`as Type`)**: Son inseguras; preferir siempre Type Guards.
* **No abusar de tipos recursivos profundos**: Pueden ralentizar el compilador y el editor.
* **No ignorar `strictNullChecks**`: Evita errores de "undefined is not a function" en runtime.