# Beneficiarios (Módulo Frontend)

## Changelog

### 2026-03-21 17:25:59
- Se sincronizó automáticamente la moneda a `USD` cuando el usuario parte de `PAYPAL` o `ZINLI` y luego selecciona en el select un banco diferente a esas plataformas.
- Se eliminó la inconsistencia visual donde el botón podía quedar en `PAYPAL`/`ZINLI` mientras la plataforma activa era un banco tradicional de USD.

### 2026-03-21 16:46:45
- Se corrigió el flujo de USDT sin bancos disponibles para mostrar directamente `Red` y `Dirección de Wallet`.
- Se ajustó el payload para guardar `bank_id` como `null` cuando el flujo es USDT sin banco, evitando conflictos de FK por valores forzados.
- Se actualizó el ícono del botón ZINLI para usar `public/flags/Zinli.jpg`.

### 2026-03-21 16:30:49
- Se mapeó el flujo de selección de moneda `PAYPAL` y `ZINLI` para operar internamente como `USD` en el formulario de `beneficiarios/nuevo`.
- Se agregó preselección automática de plataforma al elegir esos botones de moneda (`PayPal` o `Zinli`) cuando existe en el catálogo de bancos activos.
- Se evitó renderizar campos dinámicos de cuenta/documento sin banco seleccionado, mostrando un aviso guiado para prevenir el flujo legacy.
- Se mantuvo la lógica vigente de campos condicionales por plataforma (wallets, USA con ABA, USDT, Binance Pay, Pago Móvil y documentos).

### 2026-03-21 16:07:44
- Se actualizaron los iconos de moneda para PayPal, Zinli y USDT en el formulario de creación de beneficiarios.
- Se implementó lógica condicional de campos para Zelle, bancos USD con ABA, PayPal, Zinli, USDT y Binance Pay.
- Se ocultaron campos de documento en los escenarios requeridos y se agregaron los campos ABA, Red y Dirección de Wallet cuando aplica.
- Se ajustó el payload de creación para enviar `aba_routing_number`, `usdt_network`, `wallet_address` y `binance_pay_uid` cuando corresponda.
- Se añadió propuesta de migración SQL en `supabase/migrations` para alinear la base de datos con los nuevos identificadores.
