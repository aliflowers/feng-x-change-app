
const { createClient } = require('@supabase/supabase-js');

// Configuración manual para el script (hardcoded para pruebas rápidas o leyendo process.env si se carga dotenv)
// Nota: Se asume que quien corre esto tiene las variables en su entorno o las pega aquí.
// Para seguridad, leeré de process.env y el usuario debe tenerlas seteadas o yo las inyecto al correr.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kltdktiqliipphcbtjfp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_API_URL = 'https://verification.didit.me/v3';

async function checkDiditSession() {
 if (!SUPABASE_KEY || !DIDIT_API_KEY) {
  console.error('Faltan variables de entorno (SUPABASE_KEY o DIDIT_API_KEY). Asegúrate de pasarlas.');
  return;
 }

 const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

 // 2. Consultar la API de Didit
 try {
  // Intentar endpoint de detalles de decisión (donde suele estar la data extraída)
  console.log('Consultando endpoint /decision...');
  const response = await fetch(`${DIDIT_API_URL}/session/${lastVerification.session_id}/decision`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   },
  });

  if (response.ok) {
   const data = await response.json();
   console.log('--- DATA DE DECISIÓN ---');
   console.dir(data, { depth: null });
  } else {
   console.log(`Endpoint /decision falló (${response.status}). Probando GET sesión general...`);
  }

  // Intentar endpoint general de sesión
  const response2 = await fetch(`${DIDIT_API_URL}/session/${lastVerification.session_id}`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   },
  });

  if (response2.ok) {
   const data2 = await response2.json();
   console.log('--- DATA DE SESIÓN GENERAL ---');
   console.dir(data2, { depth: null });
  } else {
   console.error('Error consultando API Didit general:', response2.status);
  }

 } catch (err) {
  console.error('Excepción ejecutando script:', err);
 }
}

checkDiditSession();
