
import { createClient } from '@supabase/supabase-js';

// Configuración manual para el script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar service role si es posible, sino anon
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_API_URL = 'https://verification.didit.me/v3';

async function checkDiditSession() {
 if (!SUPABASE_URL || !DIDIT_API_KEY) {
  console.error('Faltan variables de entorno (SUPABASE_URL, DIDIT_API_KEY)');
  return;
 }

 const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || '');

 // 1. Obtener la última sesión de verificación creada
 const { data: lastVerification, error } = await supabase
  .from('kyc_verifications')
  .select('session_id')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

 if (error || !lastVerification) {
  console.error('No se encontraron verificaciones en la BD o error:', error);
  return;
 }

 console.log(`Consultando sesión Didit ID: ${lastVerification.session_id}`);

 // 2. Consultar la API de Didit para ver el payload completo de esa sesión
 try {
  // Intentar endpoint de detalles de sesión
  const response = await fetch(`${DIDIT_API_URL}/session/${lastVerification.session_id}/decision`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   },
  });

  if (!response.ok) {
   // Intentar endpoint alternativo si el primero falla (a veces es /sessions/ o similar)
   console.log('Intento 1 falló, probando endpoint alternativo...');
   const response2 = await fetch(`${DIDIT_API_URL}/session/${lastVerification.session_id}`, {
    method: 'GET',
    headers: {
     'x-api-key': DIDIT_API_KEY,
     'Content-Type': 'application/json'
    },
   });

   if (!response2.ok) {
    console.error('Error consultando API Didit:', response2.status, await response2.text());
    return;
   }

   const data2 = await response2.json();
   console.log('--- DATA DE SESIÓN (Endpoint General) ---');
   console.dir(data2, { depth: null });
   return;
  }

  const data = await response.json();
  console.log('--- DATA DE DECISIÓN (Endpoint Decision) ---');
  console.dir(data, { depth: null });

 } catch (err) {
  console.error('Excepción ejecutando script:', err);
 }
}

checkDiditSession();
