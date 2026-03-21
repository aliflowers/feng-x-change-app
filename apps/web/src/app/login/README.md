# Changelog - Login

## 2026-03-21T00:15:07.9691680-04:00
- **Fix (P0 - Accesibilidad Toggle)**: Se corrigió el botón de mostrar/ocultar contraseña para que sea alcanzable por teclado, con etiqueta accesible dinámica, estado `aria-pressed`, foco visible y tamaño táctil mínimo.
- **Fix (P1 - Alertas Accesibles)**: Se añadieron regiones en vivo para feedback (`role="status"` + `aria-live="polite"` en mensajes informativos y `role="alert"` + `aria-live="assertive"` en errores).
- **Fix (P2 - Inputs Mobile/Autofill)**: Se incorporaron atributos de autofill y experiencia móvil en campos de acceso (`autoComplete`, `inputMode`, `autoCapitalize`, `autoCorrect`, `spellCheck`, `enterKeyHint`).

## 2026-03-11T23:23:00-04:00
- **Refactor (Mobile Responsiveness)**: Se arregló el comportamiento de la disposición flexible al posicionar el botón de "Volver al inicio" dentro del bloque del componente padre.
- **Refactor (UI Contrast)**: Se mejoró el componente visual envolviendo el logo de la cabecera móvil en un contenedor con los gradientes/degradados por defecto de la marca con bordes curvos, permitiendo una perfecta visibilidad en entornos claros.
