
// Script para listar sesiones de Didit y verificar conectividad/endpoint
// Ejecutar con: item env:DIDIT_API_KEY="..." node scripts/list-didit-sessions.js

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const BASE_URL = 'https://verification.didit.me/v3';

async function listSessions() {
 if (!DIDIT_API_KEY) {
  console.error('Falta DIDIT_API_KEY');
  return;
 }

 console.log(`Usando API Key: ${DIDIT_API_KEY.substring(0, 10)}...`);
 const url = `${BASE_URL}/sessions?limit=10`; // Listar últimas 10
 console.log(`Querying: ${url}`);

 try {
  const resp = await fetch(url, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   }
  });

  console.log(`Status: ${resp.status}`);
  if (resp.ok) {
   const data = await resp.json();
   console.log('✅ LISTADO DE SESIONES (RAW):');
   console.log(JSON.stringify(data, null, 2));
  } else {
   console.log(`Respuesta: ${await resp.text()}`);
  }
 } catch (e) {
  console.error('Error de red:', e.message);
 }
}

listSessions();
