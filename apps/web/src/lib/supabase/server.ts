import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para el servidor (server-side)
 * Usa la clave secreta para operaciones administrativas
 * 
 * ⚠️ SOLO usar en Server Components, API Routes o Server Actions
 * NUNCA exponer en el cliente
 */

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

/**
 * Crear cliente de Supabase con privilegios elevados
 * - Usa la clave secreta (reemplaza a service_role)
 * - Bypass de RLS - Acceso completo
 * - Solo para operaciones del servidor
 */
export function createServerClient() {
 if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
   'Faltan las variables de entorno SUPABASE_URL o SUPABASE_SECRET_KEY para el servidor'
  );
 }

 return createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
   persistSession: false,
   autoRefreshToken: false,
  },
 });
}

export default createServerClient;
