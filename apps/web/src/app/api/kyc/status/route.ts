import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/kyc/status
 * 
 * Obtiene el estado de verificación KYC del usuario actual.
 * Con ?sync=true, fuerza una re-consulta a Didit y actualiza la BD.
 */
export async function GET(request: Request) {
 try {
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';
  // Crear cliente Supabase con cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    cookies: {
     getAll() {
      return cookieStore.getAll();
     },
     setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
       cookieStore.set(name, value, options);
      });
     },
    },
   }
  );

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
   );
  }

  // Obtener estado del perfil
  const { data: profile } = await supabase
   .from('profiles')
   .select('is_kyc_verified, role')
   .eq('id', user.id)
   .single();

  if (!profile) {
   return NextResponse.json(
    { error: 'Perfil no encontrado' },
    { status: 404 }
   );
  }

  // Si no es cliente, no requiere KYC
  if (!['CLIENT', 'AFFILIATE'].includes(profile.role)) {
   return NextResponse.json({
    requires_kyc: false,
    is_verified: true,
    role: profile.role,
   });
  }

  // Si se pide sync y NO está verificado todavía
  if (sync && !profile.is_kyc_verified) {
   console.log('[KYC Status Sync] Iniciando sincronización forzada para user:', user.id);
   try {
    // Buscar la última sesión en la DB para este user
    const { data: latestSession } = await supabase
     .from('kyc_verifications')
     .select('session_id, status')
     .eq('user_id', user.id)
     .order('created_at', { ascending: false })
     .limit(1)
     .single();

    console.log('[KYC Status Sync] Última sesión encontrada:', latestSession);

    if (latestSession?.session_id) {
     // Usar el cliente Didit que YA FUNCIONA con API Key v3
     const { getVerificationSession } = await import('@/lib/didit/client');
     const sessionDetails = await getVerificationSession(latestSession.session_id);

     console.log('[KYC Status Sync] Respuesta de Didit:', {
      status: sessionDetails?.status,
      has_id_verifications: !!sessionDetails?.id_verifications,
      has_full_name: !!sessionDetails?.full_name,
     });

     if (sessionDetails) {
      const diditStatus = (sessionDetails.status || '').toLowerCase();

      // Mapear status de Didit a los permitidos por la BD
      let mappedStatus = diditStatus;
      if (diditStatus === 'approved' || diditStatus === 'approved_manual') {
       mappedStatus = 'approved';
      } else if (diditStatus === 'not started' || diditStatus === 'created') {
       mappedStatus = 'pending';
      } else if (diditStatus === 'started' || diditStatus === 'submitted' || diditStatus === 'in review') {
       mappedStatus = 'in_progress';
      }

      // Crear cliente con service role para actualizar sin restricciones RLS
      const supabaseAdmin = createClient(
       process.env.SUPABASE_URL!,
       process.env.SUPABASE_SECRET_KEY!
      );

      // Actualizar kyc_verifications con el estado real
      await supabaseAdmin
       .from('kyc_verifications')
       .update({
        status: mappedStatus,
        completed_at: new Date().toISOString(),
        didit_response: sessionDetails,
       })
       .eq('session_id', latestSession.session_id);

      console.log('[KYC Status Sync] Estado de Didit mapeado:', mappedStatus);

      // Si fue aprobado, ejecutar validación de nombre y actualizar perfil
      if (mappedStatus === 'approved') {
       // Obtener nombre del usuario registrado
       const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

       if (userProfile) {
        const diditFullName = sessionDetails.id_verifications?.[0]?.full_name || sessionDetails.full_name || '';

        // Normalizar para comparación
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

        const dbFirstNames = normalize(userProfile.first_name || '').split(' ').filter(Boolean);
        const dbLastNames = normalize(userProfile.last_name || '').split(' ').filter(Boolean);
        const diditNames = normalize(diditFullName).split(' ').filter(Boolean);

        const hasFirstNameMatch = dbFirstNames.some(name => diditNames.includes(name));
        const hasLastNameMatch = dbLastNames.some(name => diditNames.includes(name));

        console.log('[KYC Status Sync] Validación de nombres:', {
         db: `${userProfile.first_name} ${userProfile.last_name}`,
         didit: diditFullName,
         firstMatch: hasFirstNameMatch,
         lastMatch: hasLastNameMatch,
        });

        if (hasFirstNameMatch && hasLastNameMatch) {
         // Nombre coincide: construir datos completos del perfil
         const updateProfileData: Record<string, any> = {
          is_kyc_verified: true,
          updated_at: new Date().toISOString(),
         };

         // 1. Datos del Documento (Prioridad: id_document > id_verifications[0] > root)
         const idDoc = sessionDetails.id_document || (sessionDetails.id_verifications && sessionDetails.id_verifications[0]);
         const type = (idDoc?.document_type || sessionDetails.document_type || '').toLowerCase();
         const docCountry = (idDoc?.country || idDoc?.issuing_state || sessionDetails.country || '').toUpperCase();
         const docNumber = idDoc?.document_number || sessionDetails.document_number;

         if (type || docCountry) {
          // Mapa ISO 3 a ISO 2
          const iso3to2: Record<string, string> = {
           'VEN': 'VE', 'COL': 'CO', 'PER': 'PE', 'CHL': 'CL',
           'ECU': 'EC', 'ARG': 'AR', 'MEX': 'MX', 'USA': 'US',
           'ESP': 'ES', 'PAN': 'PA', 'DOM': 'DO', 'BRA': 'BR'
          };
          const countryIso2 = iso3to2[docCountry] || docCountry;

          // Tipo de documento
          if (type.includes('passport')) {
           updateProfileData.document_type = 'PASAPORTE';
          } else if (type.includes('identity card') || type.includes('id_card')) {
           if (['PE', 'AR', 'ES'].includes(countryIso2)) {
            updateProfileData.document_type = 'DNI';
           } else if (countryIso2 === 'CL') {
            updateProfileData.document_type = 'RUT';
           } else if (countryIso2 === 'MX') {
            updateProfileData.document_type = 'CURP';
           } else if (countryIso2 === 'US') {
            updateProfileData.document_type = 'SSN';
           } else {
            updateProfileData.document_type = 'CEDULA';
           }
          } else if (type.includes('residence')) {
           updateProfileData.document_type = 'DNI';
          } else {
           updateProfileData.document_type = 'OTRO';
          }

          // Número de documento
          if (docNumber) {
           updateProfileData.document_number = docNumber;
          }

          // Nacionalidad
          const nationalityMap: Record<string, string> = {
           'VE': 'Venezolana', 'VEN': 'Venezolana',
           'CO': 'Colombiana', 'COL': 'Colombiana',
           'PE': 'Peruana', 'PER': 'Peruana',
           'CL': 'Chilena', 'CHL': 'Chilena',
           'EC': 'Ecuatoriana', 'ECU': 'Ecuatoriana',
           'AR': 'Argentina', 'ARG': 'Argentina',
           'MX': 'Mexicana', 'MEX': 'Mexicana',
           'US': 'Estadounidense', 'USA': 'Estadounidense',
           'ES': 'Española', 'ESP': 'Española',
           'PA': 'Panameña', 'PAN': 'Panameña',
           'DO': 'Dominicana', 'DOM': 'Dominicana',
           'BR': 'Brasileña', 'BRA': 'Brasileña'
          };
          updateProfileData.nationality = nationalityMap[docCountry] || nationalityMap[countryIso2] || countryIso2;
         }

         // 2. País de Residencia (IP Analysis > Documento fallback)
         const ipAnalyses = sessionDetails.ip_analyses;
         if (Array.isArray(ipAnalyses) && ipAnalyses.length > 0) {
          const analysis = ipAnalyses[ipAnalyses.length - 1];
          if (analysis?.ip_country_code) {
           const countryCode = analysis.ip_country_code.toUpperCase();
           const countryMap: Record<string, string> = {
            'VE': 'Venezuela', 'CO': 'Colombia', 'PE': 'Perú',
            'CL': 'Chile', 'EC': 'Ecuador', 'AR': 'Argentina',
            'MX': 'México', 'US': 'Estados Unidos', 'ES': 'España',
            'PA': 'Panamá', 'DO': 'República Dominicana', 'BR': 'Brasil'
           };
           updateProfileData.country = countryMap[countryCode] || countryCode;
          }
         }
         // Fallback: usar país del documento
         if (!updateProfileData.country && docCountry) {
          const iso3to2: Record<string, string> = {
           'VEN': 'VE', 'COL': 'CO', 'PER': 'PE', 'CHL': 'CL',
           'ECU': 'EC', 'ARG': 'AR', 'MEX': 'MX', 'USA': 'US',
           'ESP': 'ES', 'PAN': 'PA', 'DOM': 'DO', 'BRA': 'BR'
          };
          const rc = iso3to2[docCountry] || docCountry;
          const countryMap: Record<string, string> = {
           'VE': 'Venezuela', 'CO': 'Colombia', 'PE': 'Perú',
           'CL': 'Chile', 'EC': 'Ecuador', 'AR': 'Argentina',
           'MX': 'México', 'US': 'Estados Unidos', 'ES': 'España',
           'PA': 'Panamá', 'DO': 'República Dominicana', 'BR': 'Brasil'
          };
          updateProfileData.country = countryMap[rc] || rc;
         }

         // 3. Imagen de perfil (Portrait de Didit)
         if (sessionDetails.portrait_image) {
          try {
           const imageResponse = await fetch(sessionDetails.portrait_image);
           if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
            const { error: uploadError } = await supabaseAdmin.storage
             .from('kyc')
             .upload(fileName, imageBuffer, { contentType, upsert: true });
            if (!uploadError) {
             updateProfileData.avatar_url = fileName;
            }
           }
          } catch (imgErr) {
           console.error('[KYC Status Sync] Error procesando imagen:', imgErr);
          }
         }

         console.log('[KYC Status Sync] Actualizando perfil con datos:', Object.keys(updateProfileData));

         const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(updateProfileData)
          .eq('id', user.id);

         if (!profileError) {
          profile.is_kyc_verified = true;
          console.log('[KYC Status Sync] ✓ Perfil verificado y datos del documento actualizados');
         } else {
          console.error('[KYC Status Sync] Error actualizando perfil:', profileError);
         }
        } else {
         // Nombre NO coincide: rechazar
         await supabaseAdmin.from('kyc_verifications').update({
          status: 'declined',
          decline_reasons: 'El nombre del documento no coincide con el registrado en el sistema.'
         }).eq('session_id', latestSession.session_id);
         console.error('[KYC Status Sync] Nombre no coincide - verificación rechazada');
        }
       }
      }
     }
    }
   } catch (err) {
    console.error('[KYC Status Sync] Error sincronizando con Didit:', err);
   }
  }

  // Obtener última verificación
  const { data: lastVerification } = await supabase
   .from('kyc_verifications')
   .select('session_id, status, created_at, completed_at')
   .eq('user_id', user.id)
   .order('created_at', { ascending: false })
   .limit(1)
   .single();

  return NextResponse.json({
   requires_kyc: true,
   is_verified: profile.is_kyc_verified,
   last_verification: lastVerification ? {
    session_id: lastVerification.session_id,
    status: lastVerification.status,
    created_at: lastVerification.created_at,
    completed_at: lastVerification.completed_at,
   } : null,
  });

 } catch (error) {
  console.error('[KYC Status] Error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
