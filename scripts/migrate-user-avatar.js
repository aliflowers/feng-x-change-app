
// Script manual para migrar el avatar de Didit a Supabase para un usuario específico.
// No depende de librerías externas (solo fetch nativo de Node 18+)

const SUPABASE_URL = 'https://kltdktiqliipphcbtjfp.supabase.co';
const SUPABASE_KEY = 'sb_secret_ZDk_X6FSTAUd_Mfy9na7YA_zFke_R7u';
const USER_ID = '1c65490a-4801-4de3-995c-de7a21e6af7a';
const PORTRAIT_URL = "https://service-didit-verification-production-a1c5f9b8.s3.amazonaws.com/ocr/d8c8f493-4257-476b-be60-1d09149f3283-portrait_image-5f92acb8-25ac-4b62-aecd-e46a9cb92684.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAUH6QTJHNTW2BOKOL%2F20260207%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260207T051143Z&X-Amz-Expires=14400&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEI3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCWV1LXdlc3QtMSJGMEQCIC5Ied55qlHDG0N83EtdMpHZF7O02HqcpF6YhxzfJoWVAiAQLDKUY5W1B3g8U3D%2FXzTwDgs3hnHvXIkdb6PfO9ykxirhAwhWEAAaDDI5MTk1ODM3NjkyMyIMoEMw7vchGLi3k921Kr4DKPOC4nZlRQEg4CZ1%2FWsg8b8bLbdr0H0OInjJtBIwxZhcCdDodtV47s8HU7tnqFdDfHL%2F3GkaIG1WNvHgNtlGbZTnwjOf4KyxBRWbtddV3Absx%2B66rfjWTsFurRFVzxNBlclVcf5%2FvBfqeBwsJ2LaCUI87Rjc29QJj0NocU4xdC%2FFFVGUwbtODmf5Ov9Zg5xhZ89irXmixdNNVmVZcu9j%2F6PxtMfqYkPnYvZ6xGbn6L%2Frdvv80XTd6oUK2exJ9jnBb9qNUSAm4y2EYgT4humh%2BKatwN7O6Y%2FSMXPoVyK9G6kq4wg5npROHywltnsPO740t1%2Frj7bGE8KDd2YOxcIiVSqTJhMv19GvsTd5F9xxQdIZ4VvmNbFgqPkbX0i3dBrL39NeLSNLSVEGMGP0AjPBBSQ0aBjcmXMqBW6bSQurTqdMt%2FQEG%2BtztZw%2B1A8jLZPHTzCM3u6ZsnceGnDtEgGi6IQhweOD6zJAH3TcRBselWAGRTymgJcwy%2Bagg8jSfJ30seG%2FEVgdQhVb3ax%2BswlxxFvu0wLVv7eXV0mF2Al8v6%2BBZBcKGykgmraSQsRbScfEC4YAvbp2WBnrjL%2B3UfIwvZCbzAY6pgF5hPeLVc7zqwgH3YFisvbU%2FDdcrRnRMMoYhsqz5CV8seNCCLyt81pCL90iQ8FdcJOTr7UmqLZOfVP96GsqZbRNJ66GOkbZP39ng4iZukx5ie2O1w2vjBwk3DGo5VAqsC9%2B847AEpdmeG5rGdcBYE1DzzkC6Yp8AHocWxj9b%2BzbPv9KVbsb3zhantQyIzHaetpJvv0rBgGQ4ldVkYb7wRSJ%2Fn9qs8zY&X-Amz-Signature=dcfd9f8886dc3ea94b4940dffcd0e139a6cd14a96ef1bb8bc6f002f7dd6a5d94";

async function run() {
 console.log('--- Migración Manual de Avatar ---');

 console.log('1. Descargando imagen de Didit...');
 const resp = await fetch(PORTRAIT_URL);
 if (!resp.ok) {
  console.error('Error descargando imagen:', resp.statusText);
  return;
 }

 const buffer = await resp.arrayBuffer();
 const fileName = `${USER_ID}/avatar_migration_${Date.now()}.jpg`;

 console.log('2. Subiendo a Supabase Storage (bucket: kyc)...');
 // Usamos el API de Storage de Supabase directamente vía fetch
 const uploadUrl = `${SUPABASE_URL}/storage/v1/object/kyc/${fileName}`;
 const uploadResp = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
   'Authorization': `Bearer ${SUPABASE_KEY}`,
   'x-upsert': 'true',
   'Content-Type': 'image/jpeg'
  },
  body: buffer
 });

 if (!uploadResp.ok) {
  const errorText = await uploadResp.text();
  console.error('Error subiendo a Storage:', errorText);
  return;
 }
 console.log('✓ Imagen subida con éxito:', fileName);

 console.log('3. Vinculando imagen al perfil del usuario...');
 const patchUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_ID}`;
 const patchResp = await fetch(patchUrl, {
  method: 'PATCH',
  headers: {
   'Authorization': `Bearer ${SUPABASE_KEY}`,
   'apikey': SUPABASE_KEY,
   'Content-Type': 'application/json'
  },
  body: JSON.stringify({ avatar_url: fileName })
 });

 if (!patchResp.ok) {
  const errorText = await patchResp.text();
  console.error('Error actualizando perfil:', errorText);
  return;
 }

 console.log('✅ PROCESO COMPLETADO.');
 console.log(`Usuario: ${USER_ID}`);
 console.log(`Avatar: ${fileName}`);
}

run();
