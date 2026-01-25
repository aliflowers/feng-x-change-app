---
description: Crea estructura completa de feature fullstack. Usa 6 skills (arch, api, node, db, next, react, ui, ts) para generar: arquitectura de carpetas, API routes, schema Supabase con RLS, componentes optimizados, tipos end-to-end y README de la feature.
---

# Scaffold de feature fullstack

Pregúntame primero:
- Nombre de la feature
- Tipo (CRUD, formulario, dashboard, etc.)
- Stack (Server Components, Client Components, API routes, DB tables)

Luego ejecuta:

1. **Arquitectura:**
   - Usa `/arch` para decidir estructura de carpetas
   - Define separación de concerns (UI, lógica, data)

2. **Backend:**
   - Crea API routes con `/api` + `/node`
   - Define schema Supabase con `/db`
   - Implementa RLS policies

3. **Frontend:**
   - Crea componentes con `/next` patterns
   - Implementa UI con `/ui` guidelines
   - Optimiza con `/react` best practices

4. **Types:**
   - Define tipos con `/ts` para toda la feature
   - Genera types de DB (desde Supabase)
   - Tipos de request/response

5. **Genera:**
   - Estructura de carpetas
   - Archivos base con TODOs
   - README de la feature
