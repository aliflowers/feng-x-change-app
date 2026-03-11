
// Script para depurar acceso a una sesión específica
// Ejecutar con: item env:DIDIT_API_KEY="..." node scripts/debug-session-access.js

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const BASE_URL = 'https://verification.didit.me/v3';
const SESSION_ID = 'e1a58fe1-e6a4-4151-bac2-e9582616b901'; // ID de la sesión fallida RECIENTE

async function debugSession() {
 console.log(`Debug Session: ${SESSION_ID}`);

 // 1. Listar sesiones para ver si aparece en la lista general
 console.log('\n--- 1. Listando últimas 10 sesiones ---');
 try {
  const listUrl = `${BASE_URL}/sessions?limit=10`;
  const resp = await fetch(listUrl, { headers: { 'x-api-key': DIDIT_API_KEY } });
  if (resp.ok) {
   const data = await resp.json();
   const found = data.sessions?.find(s => s.session_id === SESSION_ID) || data.find?.(s => s.session_id === SESSION_ID);

   if (found) {
    console.log('✅ Sesión encontrada en la lista!');
    console.log(JSON.stringify(found, null, 2));
   } else {
    console.log('❌ Sesión NO encontrada en las últimas 10.');
    console.log('IDs recientes:', data.sessions?.map(s => s.session_id) || data.map?.(s => s.session_id));
   }
  } else {
   console.log(`Error listando: ${resp.status}`);
  }
 } catch (e) { console.error(e); }

 // 2. Probar endpoints directos con el ID
 const endpoints = [
  `/sessions/${SESSION_ID}`,
  `/verification-sessions/${SESSION_ID}`,
  `/verifications/${SESSION_ID}`,
  `/session/${SESSION_ID}`
 ];

 console.log('\n--- 2. Probando endpoints directos ---');
 for (const ep of endpoints) {
  console.log(`GET ${ep}...`);
  try {
   const resp = await fetch(`${BASE_URL}${ep}`, { headers: { 'x-api-key': DIDIT_API_KEY } });
   if (resp.ok) {
    console.log(`✅ ÉXITO en ${ep}`);
    const json = await resp.json();
    console.log(JSON.stringify(json, null, 2));
    return;
   } else {
    console.log(`❌ ${resp.status} ${resp.statusText}`);
   }
  } catch (e) { console.error(e.message); }
 }
}

debugSession();
