
// Script sin dependencias externas (usa fetch nativo de Node 18+)
// Ejecutar con: node scripts/inspect-didit-session-native.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kltdktiqliipphcbtjfp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_API_URL = 'https://verification.didit.me/v3';

async function checkDiditSession() {
 if (!SUPABASE_KEY || !DIDIT_API_KEY) {
  console.error('Faltan variables de entorno. Configúralas al ejecutar.');
  console.log('Ejemplo: $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:DIDIT_API_KEY="..."; node scripts/inspect-didit-session-native.js');
  return;
 }

 console.log('1. Consultando Supabase para obtener última sesión...');

 try {
  // Consulta REST a Supabase para evitar usar la librería cliente
  const sbResponse = await fetch(`${SUPABASE_URL}/rest/v1/kyc_verifications?select=session_id&order=created_at.desc&limit=1`, {
   method: 'GET',
   headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
   }
  });

  if (!sbResponse.ok) {
   console.error('Error Supabase:', sbResponse.status, await sbResponse.text());
   return;
  }

  const sbData = await sbResponse.json();

  if (!sbData || sbData.length === 0) {
   console.error('No se encontraron sesiones en la base de datos.');
   return;
  }

  const sessionId = sbData[0].session_id;
  console.log(`Sesión encontrada: ${sessionId}`);

  // 2. Consultar API de Didit
  console.log('2. Consultando API de Didit (/decision)...');

  const diditResponse = await fetch(`${DIDIT_API_URL}/session/${sessionId}/decision`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   }
  });

  if (diditResponse.ok) {
   const data = await diditResponse.json();
   console.log('\n--- RESPUESTA DIDIT (DECISION) ---');
   console.dir(data, { depth: null });

   // Chequear si hay datos de documento
   if (data.kyc) {
    console.log('\n--- DATOS KYC ENCONTRADOS ---');
    console.log(JSON.stringify(data.kyc, null, 2));
   }
  } else {
   console.error('Error Didit /decision:', diditResponse.status, await diditResponse.text());

   // Fallback a sesión general
   console.log('Probando endpoint general de sesión...');
   const diditResponse2 = await fetch(`${DIDIT_API_URL}/session/${sessionId}`, {
    method: 'GET',
    headers: {
     'x-api-key': DIDIT_API_KEY,
     'Content-Type': 'application/json'
    }
   });

   if (diditResponse2.ok) {
    const data2 = await diditResponse2.json();
    console.log('\n--- RESPUESTA DIDIT (SESION) ---');
    console.dir(data2, { depth: null });
   }
  }

 } catch (err) {
  console.error('Excepción:', err);
 }
}

checkDiditSession();
