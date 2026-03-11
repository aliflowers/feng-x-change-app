
// Script para verificar si Didit devuelve la IP o geolocalización en los detalles de sesión
// Ejecutar con: node scripts/inspect-didit-ip.js

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_API_URL = 'https://verification.didit.me/v3';

async function inspectIP() {
 if (!DIDIT_API_KEY) {
  console.error('Falta DIDIT_API_KEY en variables de entorno.');
  return;
 }

 console.log('--- Buscando datos de IP/Geolocalización en Didit ---');

 try {
  // 1. Listar sesiones recientes para tomar una real
  const listResponse = await fetch(`${DIDIT_API_URL}/sessions?limit=5`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
    'Content-Type': 'application/json'
   }
  });

  if (listResponse.ok) {
   const data = await listResponse.json();
   if (data.items && data.items.length > 0) {
    const session = data.items[0];
    console.log(`Analizando sesión: ${session.session_id}`);

    // 2. Consultar detalles completos y buscar "ip", "location", "geo"
    const detailResponse = await fetch(`${DIDIT_API_URL}/session/${session.session_id}`, {
     headers: { 'x-api-key': DIDIT_API_KEY }
    });
    const detailData = await detailResponse.json();

    console.log('--- CAMPOS RELEVANTES ENCONTRADOS ---');
    // Filtrar y mostrar claves que parezcan IP o geo ubicación
    const keys = Object.keys(detailData);
    const potentialKeys = keys.filter(k => k.includes('ip') || k.includes('geo') || k.includes('location') || k.includes('country'));

    if (potentialKeys.length > 0) {
     potentialKeys.forEach(k => {
      console.log(`${k}:`, detailData[k]);
     });
    } else {
     console.log('No se encontraron campos obvios de IP/Geo en el nivel raíz.');
     // Buscar recursivamente es mejor, pero por ahora...
     console.log('Keys raíz:', keys.join(', '));
    }

    // Revisar decision object por si acaso
    if (detailData.decision) {
     console.log('\n--- DATA EN DECISION ---');
     console.dir(detailData.decision, { depth: 1 });
    }

   } else {
    console.log('No hay sesiones para analizar.');
   }
  } else {
   console.log('Error listando sesiones:', listResponse.status);
  }

 } catch (err) {
  console.error('Error:', err);
 }
}

inspectIP();
