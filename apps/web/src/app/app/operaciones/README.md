# Operaciones (Frontend)

## Changelog
- **2026-03-15 13:36**: Corrección en la generación de `transaction_number`. Se eliminó la lógica manual de consultas y secuencias desde el frontend (`page.tsx`) ya que fallaba por restricciones de Row Level Security (RLS) al intentar buscar el último número generado, causando errores de restricción única (`duplicate key value violates unique constraint 'transactions_transaction_number_key'`). Ahora se delega la generación del número directamente a la base de datos de Supabase utilizando la función por defecto `generate_transaction_number()`.
