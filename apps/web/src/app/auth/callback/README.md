# Changelog Auth Callback

## [2026-03-12 18:59:00]
- **Qué se hizo**: Se actualizó la lógica de redirección (`route.ts`) para el callback de autenticación.
- **Por qué**: Al correr la aplicación detrás de proxies inversos en algunas plataformas como Railway o Vercel, el `request.url` retornaba `localhost` en el origin por los manejadores internos de la plataforma. Se forzó una variable de entorno `NEXT_PUBLIC_SITE_URL` para garantizar redirecciones con dominio 100% seguro (por ejemplo al dominio `.up.railway.app`) luego de validaciones como correos de registro, evitando el error visual o bloqueos en producción.
