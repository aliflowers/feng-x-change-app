# Panel Module

Este módulo contiene los componentes y la lógica relacionados con el panel principal de control (dashboard).

## Changelog

### 2026-03-08 18:44:00 -04:00
* **Feature:** Se agregó un botón "Copiar todos los datos" en el modal de detalles del beneficiario (`apps/web/src/app/panel/tomadas/page.tsx`).
* **Detalle:** Ahora, al visualizar los detalles de un beneficiario dentro de una operación tomada, el usuario administrador puede copiar toda la información relevante (nombre, documento, banco, cuenta y monto) agrupada en un solo bloque de texto mediante un clic, agilizando el proceso de realizar el pago en el banco.

### 2026-03-08 18:26:00 -04:00
* **Feature:** Se agregó una alerta visual en el dashboard del Super Admin (`apps/web/src/app/panel/page.tsx`) para notificar la existencia de "Operaciones sin verificar".
* **Detalle:** La alerta utiliza la misma consulta a la base de datos de las operaciones que se encuentran en el "Pool" y avisa al administrador la cantidad de operaciones en este estado, ayudando a agilizar el flujo de revisión y evitar demoras, mostrando un mensaje precautorio en caso de haber alguna y un mensaje de éxito cuando no hay ninguna.
