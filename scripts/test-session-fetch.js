
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const BASE_URL = 'https://verification.didit.me/v3';

async function test() {
 console.log('\n--- 3. Escaneo Manual de Últimas 50 Sesiones ---');
 const targetId = 'e1a58fe1-e6a4-4151-bac2-e9582616b901';

 // Solo probaremos el endpoint principal que sabemos que funciona para listar
 const url = `${BASE_URL}/sessions?limit=50`;
 console.log(`GET ${url}...`);

 try {
  const listResp = await fetch(url, { headers: { 'x-api-key': DIDIT_API_KEY } });
  if (listResp.ok) {
   const data = await listResp.json();
   const items = data.results || data.items || [];
   console.log(`Descargadas ${items.length} sesiones.`);

   // Buscar manualmente
   const match = items.find(i => i.session_id === targetId || i.id === targetId);

   if (match) {
    console.log('✅ ¡OBJETIVO ENCONTRADO!');
    console.log('--- DATOS DEL DOCUMENTO (Si existen) ---');
    // Intentar encontrar document number en cualquier parte
    console.log('Document Type:', match.document_type || match.id_document?.document_type);
    console.log('Document Number:', match.document_number || match.id_document?.document_number || 'NO DISPONIBLE');
    console.log('Country:', match.country || match.id_document?.country);

    console.log('--- FEATURES DUMP ---');
    console.log(JSON.stringify(match.features, null, 2));

    console.log('--- FULL DUMP (Para revisión) ---');
    console.log(JSON.stringify(match, null, 2));
   } else {
    console.log('❌ El ID objetivo NO está en las últimas 50 sesiones.');
    console.log('IDs encontrados (primeros 5):', items.slice(0, 5).map(i => i.session_id).join(', '));
   }
  } else {
   console.log(`Error API: ${listResp.status} - ${await listResp.text()}`);
  }
 } catch (e) { console.error(e); }
}

test();
