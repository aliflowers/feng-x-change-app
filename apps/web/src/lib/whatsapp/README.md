# WhatsApp Bot Handlers

## Changelog
- **2026-03-15 13:36**: Corrección en la generación de `transaction_number` en los flujos de creación de operaciones (`send-flow.ts` y `multi-send-flow.ts`). Se removió el cálculo manual del número de transacción para prevenir colisiones y violaciones de restricción única (causadas por la limitación de visibilidad de transacciones bajo RLS). Ahora se delega a la base de datos de Supabase la generación mediante la función `generate_transaction_number()` de forma segura, y se obtiene el valor generado leyendo la respuesta de la inserción (`.select('transaction_number')`).
