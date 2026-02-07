
const https = require('https');

const API_KEY = process.env.DIDIT_API_KEY || 'sIvc-im-bNXoL1e023Q4VBOHiqdx7pJDsE-b2WiOfgQ';
const SESSION_ID = 'e1a58fe1-e6a4-4151-bac2-e9582616b901';

const endpoints = [
 { name: 'APX V2 (Configured)', url: `https://apx.didit.me/v2/sessions/${SESSION_ID}` },
 { name: 'APX V3', url: `https://apx.didit.me/v3/sessions/${SESSION_ID}` },
 { name: 'Verification V3 (Direct)', url: `https://verification.didit.me/v3/sessions/${SESSION_ID}` },
 { name: 'Verification V3 (List Search)', url: `https://verification.didit.me/v3/sessions?limit=50` }
];

async function fetchUrl(url) {
 return new Promise((resolve) => {
  const req = https.request(url, {
   method: 'GET',
   headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' }
  }, (res) => {
   let data = '';
   res.on('data', (chunk) => data += chunk);
   res.on('end', () => resolve({ status: res.statusCode, data }));
  });
  req.on('error', (e) => resolve({ status: 'ERR', data: e.message }));
  req.end();
 });
}

async function run() {
 console.log(`Searching for Session: ${SESSION_ID}\n`);

 for (const ep of endpoints) {
  console.log(`Checking ${ep.name}...`);
  const { status, data } = await fetchUrl(ep.url);

  if (status === 200) {
   const json = JSON.parse(data);
   if (ep.name.includes('List')) {
    const items = json.results || json.items || [];
    const match = items.find(i => i.session_id === SESSION_ID || i.id === SESSION_ID);
    if (match) {
     console.log(`✅ FOUND in List! Status: ${match.status}`);
     console.log(`   Document: ${match.document_type || match.id_document?.document_type}`);
     console.log(`   Number: ${match.document_number || match.id_document?.document_number}`);
     console.log(`   Detailed Data keys: ${Object.keys(match)}`);
    } else {
     console.log(`❌ Not found in list of ${items.length} items.`);
    }
   } else {
    console.log('✅ FOUND Direct Access!');
    console.log(`   Keys: ${Object.keys(json)}`);
    // Check for document info
    console.log(`   Document: ${json.document_type || json.id_document?.document_type}`);
   }
  } else {
   console.log(`❌ Status: ${status}`);
  }
  console.log('---');
 }
}

run();
