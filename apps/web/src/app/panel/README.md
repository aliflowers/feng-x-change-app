# Panel Module

Este módulo contiene los componentes y la lógica relacionados con el panel principal de control (dashboard).

## Changelog

### 2026-03-08 18:26:00 -04:00
* **Feature:** Se agregó una alerta visual en el dashboard del Super Admin (`apps/web/src/app/panel/page.tsx`) para notificar la existencia de "Operaciones sin verificar".
* **Detalle:** La alerta utiliza la misma consulta a la base de datos de las operaciones que se encuentran en el "Pool" y avisa al administrador la cantidad de operaciones en este estado, ayudando a agilizar el flujo de revisión y evitar demoras, mostrando un mensaje precautorio en caso de haber alguna y un mensaje de éxito cuando no hay ninguna.
