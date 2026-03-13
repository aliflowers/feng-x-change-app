# Changelog KYC

## [2026-03-12 20:10:00]
- **Qué se hizo**: Se parcheó la generación de la URL de redirección en `api/kyc/start/route.ts` al crear sesiones KYC en Didit.
- **Por qué**: Ya que Railway expone las peticiones en los contenedores con un root en el puerto o host de localhost internamente, la URL asignada al parámetro `callbackUrl` enviado a Didit tomaba `localhost`. Al inyectar una doble validación forzando el dominio correcto (`NEXT_PUBLIC_SITE_URL` o el link de prueba), cuando la persona termine en la plataforma de terceros (Didit), regresará de forma óptima de vuelta a Railway en vez de redirigirla a `localhost:8080/app/verificar-identidad/callback`.
