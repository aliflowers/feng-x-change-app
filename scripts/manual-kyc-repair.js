
const SUPABASE_URL = 'https://kltdktiqliipphcbtjfp.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_ZDk_X6FSTAUd_Mfy9na7YA_zFke_R7u';

async function fetchSupabase(table, queryParams, method = 'GET', body = null) {
 const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams ? '?' + queryParams : ''}`;
 const headers = {
  'apikey': SUPABASE_SECRET_KEY,
  'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
 };

 const options = { headers, method };
 if (body) options.body = JSON.stringify(body);

 const response = await fetch(url, options);
 if (!response.ok) {
  throw new Error(`Supabase Error ${response.status}: ${await response.text()}`);
 }
 return method === 'PATCH' || method === 'POST' || method === 'GET' ? await response.json() : null;
}

const userId = 'b62400b7-d2ae-4bff-8817-867fad826c23';
const kycData = {
 document_number: 'V17701219',
 document_type: 'CEDULA',
 country: 'Venezuela',
 nationality: 'Venezolana',
 is_kyc_verified: true,
 updated_at: new Date().toISOString()
};

async function repair() {
 console.log(`Starting repair for user: ${userId}`);

 try {
  // 1. Actualizar perfil
  console.log('Updating profile...');
  const profile = await fetchSupabase('profiles', `id=eq.${userId}`, 'PATCH', kycData);
  console.log('✅ Profile updated successfully:', JSON.stringify(profile[0], null, 2));

  // 2. Sincronizar kyc_verifications
  console.log('Syncing kyc_verifications...');
  const verif = await fetchSupabase('kyc_verifications', '', 'POST', {
   user_id: userId,
   session_id: 'e1a58fe1-e6a4-4151-bac2-e9582616b901',
   status: 'approved'
  });
  console.log('✅ kyc_verifications record synced:', JSON.stringify(verif[0], null, 2));
 } catch (e) {
  console.error('❌ Repair failed:', e.message);
 }
}

repair();
