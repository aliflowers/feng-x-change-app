
// Script para reprocesar una sesión KYC y actualizar el perfil (Fix manual)
// Ejecutar con: item env:DIDIT_API_KEY="..." env:SUPABASE_SERVICE_ROLE_KEY="..." node scripts/reprocess-kyc-session.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;

if (!SUPABASE_KEY || !DIDIT_API_KEY) {
    console.error('Faltan variables de entorno (SUPABASE_SERVICE_ROLE_KEY o DIDIT_API_KEY)');
    process.exit(1);
}

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

async function fetchSupabase(table, queryParams, method = 'GET', body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
    const options = { headers, method };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Supabase Error ${response.status}: ${await response.text()}`);
    }
    return method === 'GET' ? await response.json() : null;
}

async function run() {
    console.log('--- Reprocesando KYC Session ---');

    // 1. Obtener última verificación por User ID
    // 1. Obtener la última verificación aprobada (o en revisión)
    console.log('Buscando última verificación...');
    const verifications = await fetchSupabase('kyc_verifications', 'select=*&order=created_at.desc&limit=1');

    if (!verifications || verifications.length === 0) {
        console.error('No se encontraron verificaciones.');
        return;
    }

    const verification = verifications[0];
    const userId = verification.user_id; // Sobreescribimos el userId global
    console.log(`Última verificación encontrada: ${verification.session_id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Status: ${verification.status}`);

    const sessionId = verification.session_id;
    console.log(`Sesión encontrada: ${sessionId} (User: ${verification.user_id})`);

    // 2. Obtener detalles de sesión de Didit
    console.log(`\nObteniendo detalles de sesión Didit: ${sessionId}...`);

    let sessionDetails = null;
    try {
        // Intentar fetch directo primero
        const DIDIT_API_URL = 'https://verification.didit.me/v3'; // Define DIDIT_API_URL
        const url = `${DIDIT_API_URL}/sessions/${sessionId}`;
        const resp = await fetch(url, { headers: { 'x-api-key': DIDIT_API_KEY } });

        if (resp.ok) {
            sessionDetails = await resp.json();
        } else if (resp.status === 404) {
            console.log('⚠ Detalle directo 404, intentando buscar en lista (Fallback)...');
            // Fallback: buscar en lista filtrada
            const listUrl = `${DIDIT_API_URL}/sessions?session_id=${sessionId}`;
            const listResp = await fetch(listUrl, { headers: { 'x-api-key': DIDIT_API_KEY } });

            if (listResp.ok) {
                const listData = await listResp.json();
                const items = listData.results || listData.items || listData.sessions || [];
                sessionDetails = items.find(s => s.session_id === sessionId || s.id === sessionId);
                if (sessionDetails) console.log('✅ Sesión encontrada en lista.');
            }
        }
    } catch (e) { console.error('Error fetching Didit:', e); }

    if (!sessionDetails) {
        console.error('❌ No se pudo obtener la sesión de Didit ni siquiera en la lista.');
        process.exit(1);
    }

    console.log('Datos obtenidos:', Object.keys(sessionDetails));

    // 3. Mapear datos
    const updateData = {
        is_kyc_verified: true,
        updated_at: new Date().toISOString()
    };

    // Datos del Documento (Prioridad: id_document > id_verifications[0] > root fields)
    const idDoc = sessionDetails.id_document || (sessionDetails.id_verifications && sessionDetails.id_verifications[0]);
    const type = (idDoc?.document_type || sessionDetails.document_type || '').toLowerCase();
    // country puede venir como VEN, COL (ISO 3) o como issuing_state en V3
    const countryRaw = (idDoc?.country || idDoc?.issuing_state || sessionDetails.country || '').toUpperCase();

    const iso3to2 = {
        'VEN': 'VE', 'COL': 'CO', 'PER': 'PE', 'CHL': 'CL',
        'ECU': 'EC', 'ARG': 'AR', 'MEX': 'MX', 'USA': 'US',
        'ESP': 'ES', 'PAN': 'PA', 'DOM': 'DO', 'BRA': 'BR'
    };
    const countryIso2 = iso3to2[countryRaw] || countryRaw;

    if (type || countryRaw) {
        if (type.includes('passport')) {
            updateData.document_type = 'PASAPORTE';
        } else if (type.includes('identity card') || type.includes('id_card')) {
            if (['PE', 'AR', 'ES'].includes(countryIso2)) updateData.document_type = 'DNI';
            else if (countryIso2 === 'CL') updateData.document_type = 'RUT';
            else if (countryIso2 === 'MX') updateData.document_type = 'CURP';
            else if (countryIso2 === 'US') updateData.document_type = 'SSN';
            else updateData.document_type = 'CEDULA';
        } else {
            updateData.document_type = 'OTRO';
        }

        if (idDoc?.document_number || sessionDetails.document_number) {
            updateData.document_number = idDoc?.document_number || sessionDetails.document_number;
        }

        const nationalityMap = {
            'VE': 'Venezolana', 'CO': 'Colombiana', 'PE': 'Peruana',
            'CL': 'Chilena', 'EC': 'Ecuatoriana', 'AR': 'Argentina',
            'MX': 'Mexicana', 'US': 'Estadounidense', 'ES': 'Española',
            'PA': 'Panameña', 'DO': 'Dominicana', 'BR': 'Brasileña'
        };
        updateData.nationality = nationalityMap[countryIso2] || countryIso2;
    }

    // IP Analysis (si existe)
    const ipAnalyses = sessionDetails.ip_analyses;
    if (Array.isArray(ipAnalyses) && ipAnalyses.length > 0) {
        const analysis = ipAnalyses[ipAnalyses.length - 1];
        if (analysis?.ip_country_code) {
            const countryCode = analysis.ip_country_code.toUpperCase();
            const countryMap = {
                'VE': 'Venezuela', 'CO': 'Colombia', 'PE': 'Perú',
                'CL': 'Chile', 'EC': 'Ecuador', 'AR': 'Argentina',
                'MX': 'México', 'US': 'Estados Unidos', 'ES': 'España',
                'PA': 'Panamá', 'DO': 'República Dominicana', 'BR': 'Brasil'
            };
            updateData.country = countryMap[countryCode] || countryCode;
        }
    }

    // Fallback para country si no hubo IP analysis
    if (!updateData.country && countryIso2) {
        const countryMap = {
            'VE': 'Venezuela', 'VEN': 'Venezuela',
            'CO': 'Colombia', 'COL': 'Colombia',
            'PE': 'Perú', 'PER': 'Perú',
            'CL': 'Chile', 'CHL': 'Chile',
            'EC': 'Ecuador', 'ECU': 'Ecuador',
            'AR': 'Argentina', 'ARG': 'Argentina',
            'MX': 'México', 'MEX': 'México',
            'US': 'Estados Unidos', 'USA': 'Estados Unidos',
            'ES': 'España', 'ESP': 'España',
            'PA': 'Panamá', 'DO': 'República Dominicana', 'BR': 'Brasil'
        };
        updateData.country = countryMap[countryIso2] || countryIso2;
    }

    console.log('Actualizando perfil con:', updateData);

    // 4. Actualizar Supabase
    try {
        await fetchSupabase('profiles', `id=eq.${userId}`, 'PATCH', updateData);
        console.log('✅ Perfil actualizado correctamente.');
    } catch (e) {
        console.error('Error actualizando perfil:', e.message);
    }
}

run();
