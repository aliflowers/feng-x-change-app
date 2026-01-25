---
description: Validación pre-commit de archivos modificados. Usa skills según tipo de archivo. Valida: no console.log, tipos completos (sin any), imports limpios, accesibilidad. Genera checklist de performance, seguridad y best practices.
---

# Validación pre-commit

## 1. Identifica archivos modificados

Lee archivos cambiados en git (modificados, nuevos, eliminados).

## 2. Clasifica archivos por tipo

Agrupa por:
- **Componentes React:** `*.tsx` en `/components`, `/app`
- **API Routes:** `*.ts` en `/api`
- **Database:** `*.sql`, migrations
- **Types:** `*.ts` en `/types`

## 3. Revisión por tipo de archivo

### Para componentes React:
Usa `/component` - Revisa performance, accesibilidad, App Router, types

### Para endpoints API:
Usa `/endpoint` - Revisa seguridad, error handling, queries, types

### Para tipos:
Usa `/ts` - Revisa no any, inferencia, utility types

### Para archivos de DB:
Usa `/db` - Revisa migrations, índices, RLS policies

## 4. Validaciones obligatorias

### 🚫 Code smells
- [ ] No hay `console.log` (solo console.error en catch)
- [ ] No hay `debugger`
- [ ] No hay TODOs sin issue vinculado
- [ ] No hay código comentado sin explicación

### 📦 Imports
- [ ] No hay imports no usados
- [ ] Imports ordenados (externos, internos, relativos)
- [ ] No circular dependencies

### 🎯 TypeScript
- [ ] No hay `any` types (usar `unknown` si necesario)
- [ ] No `@ts-ignore` sin comentario
- [ ] Parámetros con tipos
- [ ] Funciones con return type

### ♿ Accesibilidad (componentes UI)
- [ ] Imágenes con alt text
- [ ] Buttons con aria-label cuando necesario
- [ ] Forms con labels
- [ ] Keyboard navigation funcional

## 5. Genera checklist

- [ ] **Performance:** OK / Issues
- [ ] **Seguridad:** OK / Issues
- [ ] **Accesibilidad:** OK / Issues
- [ ] **Types:** OK / Issues
- [ ] **Best practices:** OK / Issues

## 6. Decisión final

**Si hay issues CRÍTICOS:**
- ❌ BLOQUEA el commit
- Lista todos los problemas críticos
- Propón fixes específicos

**Si solo hay issues menores:**
- ⚠️ ADVIERTE pero permite commit
- Lista mejoras recomendadas
