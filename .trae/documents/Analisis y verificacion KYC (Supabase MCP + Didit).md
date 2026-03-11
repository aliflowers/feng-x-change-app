## Alcance del análisis
1. Mapear el flujo KYC end-to-end (UI → API → Didit → webhook → DB → gating).
2. Verificar en Supabase (vía MCP) qué usuarios están marcados como verificados y su última sesión KYC.
3. Cruzar esa evidencia con el estado real en Didit (consultando la sesión por `session_id`) y comparar.
4. Identificar inconsistencias, riesgos de seguridad/robustez y puntos de fallo probables.

## Lo que ya está identificado en el código (base para validar contra DB)
- Inicio KYC: [start/route.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/api/kyc/start/route.ts)
- Polling de estado: [status/route.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/api/kyc/status/route.ts)
- Webhook Didit (actualiza `kyc_verifications` y `profiles.is_kyc_verified`): [webhook/route.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/api/didit/webhook/route.ts)
- Cliente Didit + validación de firma: [client.ts](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/lib/didit/client.ts)
- UI de verificación + callback/polling: [verificar-identidad/page.tsx](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/app/verificar-identidad/page.tsx), [callback/page.tsx](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/app/verificar-identidad/callback/page.tsx), gating: [layout.tsx](file:///c:/Users/jesus/OneDrive/Escritorio/PROYECTOS%20WEB/feng-x-change-app/apps/web/src/app/app/layout.tsx)

## Plan de verificación en Supabase usando MCP (sin tocar datos)
1. Enumerar el esquema relevante (ya inicié listado de tablas y confirmé `profiles.is_kyc_verified` y FK hacia `kyc_verifications`).
2. Ejecutar consultas **solo lectura** (SELECT) vía MCP para:
   - Obtener usuarios con `profiles.is_kyc_verified = true` y su `role`.
   - Para cada uno, obtener su última fila en `kyc_verifications` (por `user_id`, orden `created_at desc`), incluyendo `session_id`, `status`, `completed_at`, y `didit_response`.
   - Detectar discrepancias típicas:
     - `is_kyc_verified=true` pero `kyc_verifications.status` no es `approved`.
     - `kyc_verifications` sin `completed_at` pero `approved`.
     - Estados no contemplados (`review_needed`, etc.) si la columna es enum.
3. Confirmar políticas RLS relacionadas (si afectan lecturas desde la app) y cómo se está usando la Service Role en server routes.

## Plan de verificación contra Didit (comparación con DB)
1. Tomar `session_id` (desde `kyc_verifications`) de los casos verificados o del caso más reciente.
2. Consultar a Didit por sesión usando el mismo patrón del cliente actual (`getVerificationSession`), para obtener:
   - `status` real (approved/declined/in_review/etc.)
   - metadatos clave (documento/país/face match si vienen)
   - `vendor_data` para comprobar que corresponde al `user_id` esperado
3. Comparar:
   - `Didit.status` vs `kyc_verifications.status`
   - `Didit` vs `profiles.is_kyc_verified`
   - `Didit.vendor_data` vs `profiles.id`
4. Reportar un cuadro de resultados por usuario/sesión (DB vs Didit), marcando “OK” o “Mismatch”.

## Hallazgos/hipótesis a validar (probables causas de inconsistencias)
- Mapeo de estados incompleto: el webhook solo normaliza algunos valores y podría persistir `review_needed` literal; si `kyc_verifications.status` es enum estricto puede fallar el update.
- Diferencias de rutas Didit: creación usa `/session/` y consulta usa `/sessions/{id}` con fallback; si Didit cambió endpoints, podrías tener sesiones creadas pero no consultables con la ruta principal.
- “Verified” por fallback: si falla `getVerificationSession` en el webhook, se marca `is_kyc_verified=true` igualmente (esto puede generar falsos positivos si llega un webhook malformado, aunque hay HMAC).

## Seguridad (importante)
- No voy a volver a imprimir ni persistir tus credenciales en respuestas/archivos.
- Como compartiste claves en chat, recomiendo rotarlas en Didit y en tu `.env.local` después del análisis.

## Entregable final tras ejecutar el plan
- Diagrama textual del flujo KYC (código + DB) con puntos de entrada/salida.
- Resultado de verificación: lista de usuarios/sesiones “DB verificado” y su estado real en Didit.
- Lista priorizada de problemas encontrados + causa + cómo corregirlos (sin aplicar cambios extra no solicitados).

Si confirmas este plan, ejecuto las consultas SELECT por MCP y la comparación con Didit usando las credenciales ya disponibles en tu entorno, y te devuelvo el reporte completo.