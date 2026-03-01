---
trigger: always_on
---

# Estándares Next.js App Router (v14+)

Guía técnica para el desarrollo con App Router, Server Components y optimización para Turbopack.

## 1. Modos de Renderizado y Convenciones

* **Server Components (Default)**: Para fetching de datos, lógica pesada y manejo de secretos. No tienen estado ni hooks de navegador.
* **Client Components (`'use client'`)**: Para interactividad, uso de hooks (`useState`, `useEffect`) y APIs del navegador.
* **Streaming**: Uso de `Suspense` para cargar progresivamente componentes lentos sin bloquear la página.

### Estructura de Archivos Estandarizada

* `layout.tsx`: UI compartida que preserva el estado en la navegación.
* `page.tsx`: Punto de entrada único de la ruta.
* `loading.tsx`: Estado de carga automático envuelto en Suspense.
* `error.tsx`: Límite de errores para la ruta (debe ser un Client Component).
* `route.ts`: Manejador de rutas API (Route Handlers).

---

## 2. Patrones de Implementación

### Fetching de Datos (Server Component)

```typescript
// app/products/page.tsx
export default async function ProductsPage({ searchParams }: { searchParams: Promise<any> }) {
  const query = (await searchParams).q;
  
  // Cache de datos e ISR (Incremental Static Regeneration)
  const res = await fetch(`${process.env.API_URL}/products?search=${query}`, {
    next: { revalidate: 3600, tags: ['products'] }
  });
  
  const products = await res.json();
  return <main>{/* Renderizado de productos */}</main>;
}

```

### Server Actions (Mutaciones con "use server")

```typescript
// app/actions/cart.ts
"use server";
import { revalidateTag } from "next/cache";

export async function addToCart(productId: string) {
  // Lógica de base de datos (Prisma)
  await db.cart.create({ data: { productId } });
  
  // Invalida la cache para reflejar cambios inmediatamente
  revalidateTag("cart");
  return { success: true };
}

### Seguridad y Rendimiento Estricto

**Seguridad en Server Actions**: Tratar los Server Actions como endpoints públicos. Validar SIEMPRE la sesión del usuario (Auth) y los permisos DENTRO de la función antes de ejecutar cualquier mutación en la base de datos.

**Evitar "Barrel Files"**: Prohibido importar librerías completas (ej. `import { Icon } from 'lucide-react'`). Usar importaciones directas (`import Icon from 'lucide-react/dist/esm/icons/icon'`) para no destruir el rendimiento de Turbopack.

```

### Streaming con Suspense

```typescript
import { Suspense } from 'react';
import { SlowComponent, Skeleton } from '@/components';

export default function Page() {
  return (
    <div>
      <h1>Main Content</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowComponent /> {/* Se carga por stream al estar listo */}
      </Suspense>
    </div>
  );
}

```

---

## 3. Estrategias de Caché y Optimización

* **Force Cache**: `fetch(url, { cache: 'force-cache' })` para datos estáticos.
* **No Store**: `fetch(url, { cache: 'no-store' })` para datos dinámicos que cambian en cada petición.
* **Revalidación por Tags**: Uso de `revalidateTag('tag-name')` en Server Actions para limpiezas de caché granulares.

---

## 4. Mejores Prácticas (Checklist)

### ✅ Hacer (Do's)

* **Empezar siempre con Server Components**: Solo añadir `'use client'` cuando sea estrictamente necesario por interactividad.
* **Colocar el Fetching cerca del uso**: Evitar pasar props a través de muchos niveles; dejar que el componente pida sus propios datos.
* **Usar Componentes de Optimización**: Utilizar `next/image` y `next/font` para aprovechar las mejoras de Turbopack en assets.
* **Validar Params y SearchParams**: Siempre aplicar `await` a los parámetros de ruta en versiones recientes de Next.js.

### ❌ No Hacer (Don'ts)

* **No usar Hooks en Server Components**: El uso de `useState` o `useEffect` disparará un error de compilación.
* **No enviar datos sensibles al cliente**: Solo pasar datos serializables a través de la frontera Servidor -> Cliente.
* **No ignorar los Boundary de Error**: Siempre proveer un `error.tsx` para manejar fallos de red o de renderizado con elegancia.

---