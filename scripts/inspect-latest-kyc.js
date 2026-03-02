
// Script para inspeccionar la última verificación KYC y el perfil del usuario asociado (versión nativa sin dependencias)
// Ejecutar con: item env:SUPABASE_SERVICE_ROLE_KEY="..." node scripts/inspect-latest-kyc.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_KEY) {
 console.error('Error: Falta SUPABASE_SECRET_KEY');
 process.exit(1);
}

const headers = {
 'apikey': SUPABASE_KEY,
 'Authorization': `Bearer ${SUPABASE_KEY}`,
 'Content-Type': 'application/json'
};

async function fetchSupabase(table, queryParams) {
 const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
 const response = await fetch(url, { headers });
 if (!response.ok) {
  throw new Error(`Error ${response.status}: ${await response.text()}`);
 }
 return await response.json();
}

async function inspect() {
 console.log('--- Buscando última verificación KYC ---');
 try {
  // 1. Obtener última verificación
  const verifications = await fetchSupabase('kyc_verifications', 'select=*&order=created_at.desc&limit=1');

  if (!verifications || verifications.length === 0) {
   console.log('No se encontraron verificaciones en la tabla kyc_verifications.');
   return;
  }

  const verification = verifications[0];
  console.log(`Última Verificación (ID: ${verification.id}):`);
  console.log(`- User ID: ${verification.user_id}`);
  console.log(`- Session ID: ${verification.session_id}`);
  console.log(`- Estado: ${verification.status}`);
  console.log(`- Creado: ${verification.created_at}`);

  if (verification.didit_response) {
   console.log('- Didit Response (Full JSON from DB):');
   console.log(JSON.stringify(verification.didit_response, null, 2));
  } else {
   console.log('- Didit Response: NULL');
  }


  // 1.5 Consultar API de Didit directamente para ver qué devuelve
  const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
  if (DIDIT_API_KEY) {
   console.log('\n--- Consultando API Didit (Session Details) ---');
   const url = `https://verification.didit.me/v3/sessions/${verification.session_id}`;
   console.log(`Querying: ${url}`);

   try {
    const resp = await fetch(url, { headers: { 'x-api-key': DIDIT_API_KEY } });
    if (resp.ok) {
     const data = await resp.json();
     console.log('✅ DIDIT SESSION DATA:');
     console.log(JSON.stringify(data, null, 2));
    } else {
     console.log(`❌ Failed: ${resp.status} - ${await resp.text()}`);
    }
   } catch (e) { console.log('Error:', e.message); }
  }


  // 2. Obtener perfil del usuario
  console.log('\n--- Consultando Perfil del Usuario ---');
  const profiles = await fetchSupabase('profiles', `select=id,email,first_name,last_name,document_type,document_number,nationality,country,is_kyc_verified&id=eq.${verification.user_id}&limit=1`);

  if (profiles && profiles.length > 0) {
   console.log('Datos del Perfil:');
   console.table(profiles[0]);
  } else {
   console.log('Perfil no encontrado.');
  }

 } catch (err) {
  console.error('Error durante la inspección:', err.message);
 }
}

inspect();
