import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para el navegador (client-side)
 * Usa la clave ANON para autenticación con RLS
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
 throw new Error(
  'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY'
 );
}

/**
 * Cliente de Supabase para uso en el navegador
 * - Usa la clave anon (respeta RLS)
 * - Gestiona cookies automáticamente para SSR
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export default supabase;
