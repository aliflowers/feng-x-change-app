import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/didit/client';

/**
 * POST /api/didit/webhook
 * 
 * Recibe notificaciones de Didit cuando una verificación cambia de estado.
 * Verifica la firma HMAC antes de procesar.
 */
export async function POST(request: NextRequest) {
     try {
          // Leer el body raw para verificar la firma
          const rawBody = await request.text();

          // Obtener la firma y timestamp del header
          const signature = request.headers.get('x-signature') || '';
          const timestamp = request.headers.get('x-timestamp') || '';

          // Log para debugging
          console.log('[Didit Webhook] Recibido:', {
               signature: signature.substring(0, 16) + '...',
               timestamp,
               bodyLength: rawBody.length,
          });

          // Verificar firma HMAC
          const isValid = await verifyWebhookSignature(rawBody, signature, timestamp);

          if (!isValid) {
               console.error('[Didit Webhook] Firma inválida');
               return NextResponse.json(
                    { error: 'Firma inválida' },
                    { status: 401 }
               );
          }

          console.log('[Didit Webhook] Firma válida ✓');

          // Parsear el payload
          const payload = parseWebhookPayload(rawBody);

          if (!payload) {
               console.error('[Didit Webhook] Payload inválido:', rawBody.substring(0, 200));
               return NextResponse.json(
                    { error: 'Payload inválido' },
                    { status: 400 }
               );
          }

          console.log('[Didit Webhook] Procesando:', {
               session_id: payload.session_id,
               vendor_data: payload.vendor_data,
               status: payload.status,
          });

          // Usar service_role para actualizar la base de datos
          const supabase = createClient(
               process.env.SUPABASE_URL!,
               process.env.SUPABASE_SECRET_KEY!
          );

          // Buscar la verificación por session_id
          const { data: verification, error: findError } = await supabase
               .from('kyc_verifications')
               .select('id, user_id, status')
               .eq('session_id', payload.session_id)
               .single();

          if (findError || !verification) {
               console.error('[Didit Webhook] Sesión no encontrada:', payload.session_id);
               // Retornar 200 para que Didit no reintente
               return NextResponse.json({ received: true, message: 'session not found' });
          }

          // Mapear estados de Didit V3 a los permitidos por la base de datos
          // DB: 'pending', 'in_progress', 'approved', 'declined', 'expired'
          let dbStatus = payload.status.toLowerCase();

          if (dbStatus === 'not started' || dbStatus === 'created') {
               dbStatus = 'pending';
          } else if (dbStatus === 'started' || dbStatus === 'submitted' || dbStatus === 'in review') {
               dbStatus = 'in_progress';
          }

          // Preparar datos de actualización
          const updateData: Record<string, unknown> = {
               status: dbStatus,
               completed_at: payload.completed_at || new Date().toISOString(),
               didit_response: payload,
          };

          // Agregar datos de la decisión si existen
          // Variable para capturar número de documento del payload (para usar en perfil)
          let extractedDocNumber: string | undefined;

          if (payload.decision?.kyc || payload.raw_decision?.id_verifications) {
               const kyc = payload.decision?.kyc || (payload.raw_decision?.id_verifications && payload.raw_decision.id_verifications[0]);
               updateData.document_type = kyc?.document_type;
               updateData.document_country = kyc?.document_country || kyc?.issuing_state;
               if (kyc?.document_number) {
                    // updateData.document_number = kyc.document_number; // ELIMINADO para evitar error PGRST204
                    extractedDocNumber = kyc.document_number;
               }
          }

          if (payload.decision?.face_match?.score) {
               updateData.face_match_score = payload.decision.face_match.score;
          }

          if (payload.decision?.decline_reasons) {
               updateData.decline_reasons = payload.decision.decline_reasons;
          }

          // Actualizar kyc_verifications
          const { error: updateError } = await supabase
               .from('kyc_verifications')
               .update(updateData)
               .eq('id', verification.id);

          if (updateError) {
               console.error('[Didit Webhook] Error actualizando verificación:', updateError);
          }

          // Si fue aprobado, actualizar el perfil
          if (dbStatus === 'approved') {
               // Obtener detalles completos de la sesión (necesario porque el payload no trae todo)
               const { getVerificationSession } = await import('@/lib/didit/client');
               const sessionDetails = await getVerificationSession(payload.session_id);

               if (sessionDetails) {
                    const updateProfileData: Record<string, any> = {
                         is_kyc_verified: true,
                         updated_at: new Date().toISOString(),
                    };

                    // 1. Datos del Documento (Prioridad: id_document > id_verifications[0] > root fields)
                    const idDoc = sessionDetails.id_document || (sessionDetails.id_verifications && sessionDetails.id_verifications[0]);

                    // Mapear desde id_document (Detalle completo) o desde root (Lista fallback)
                    const type = (idDoc?.document_type || sessionDetails.document_type || '').toLowerCase();
                    const country = (idDoc?.country || idDoc?.issuing_state || sessionDetails.country || '').toUpperCase();
                    const docNumber = idDoc?.document_number || sessionDetails.document_number;

                    if (type || country) {
                         // Normalizar país de documento a ISO 2 si es posible o manejar nombres
                         // Mapa temporal de ISO 3 a 2 para latam común
                         const iso3to2: Record<string, string> = {
                              'VEN': 'VE', 'COL': 'CO', 'PER': 'PE', 'CHL': 'CL',
                              'ECU': 'EC', 'ARG': 'AR', 'MEX': 'MX', 'USA': 'US',
                              'ESP': 'ES', 'PAN': 'PA', 'DOM': 'DO', 'BRA': 'BR'
                         };
                         const countryIso2 = iso3to2[country] || country;

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

                         // Número de Documento (Priorizar el del payload del webhook si existe)
                         const finalDocNumber = extractedDocNumber || docNumber;
                         if (finalDocNumber) {
                              updateProfileData.document_number = finalDocNumber;
                         }

                         // Nacionalidad (Mapeo basado en país del documento o payload)
                         const finalCountry = (updateData.document_country as string) || country;
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

                         // Intentar mapear con ISO 2 o 3, si falla usar el valor original
                         const countryIso = finalCountry?.toUpperCase();
                         updateProfileData.nationality = nationalityMap[countryIso] || nationalityMap[countryIso2] || countryIso2 || countryIso;
                    }

                    // 2. País de Residencia (IP Detection)
                    // Buscar en ip_analyses o en la raíz (si existiera)
                    const ipAnalyses = sessionDetails.ip_analyses;
                    // A veces en lista viene 'features' con status, pero no IP. 
                    // No hay IP en root del listado por defecto.

                    if (Array.isArray(ipAnalyses) && ipAnalyses.length > 0) {
                         // Preferir uno que no sea centro de datos si es posible, o simplemente el último
                         const analysis = ipAnalyses[ipAnalyses.length - 1];

                         if (analysis?.ip_country_code) {
                              const countryCode = analysis.ip_country_code.toUpperCase(); // Viene como ISO 2 (US, VE)

                              const countryMap: Record<string, string> = {
                                   'VE': 'Venezuela', 'CO': 'Colombia', 'PE': 'Perú',
                                   'CL': 'Chile', 'EC': 'Ecuador', 'AR': 'Argentina',
                                   'MX': 'México', 'US': 'Estados Unidos', 'ES': 'España',
                                   'PA': 'Panamá', 'DO': 'República Dominicana', 'BR': 'Brasil'
                              };

                              updateProfileData.country = countryMap[countryCode] || countryCode;
                              console.log(`[Didit Webhook] Residencia detectada por IP (${analysis.ip_address}): ${countryCode} -> ${updateProfileData.country}`);
                         }
                    }

                    // Fallback para país de residencia: si no se detectó por IP, usar el del documento
                    if (!updateProfileData.country) {
                         const finalCountry = (updateData.document_country as string) || country;
                         if (finalCountry) {
                              const residenceCountryCode = finalCountry.toUpperCase();
                              const countryMap: Record<string, string> = {
                                   'VE': 'Venezuela', 'VEN': 'Venezuela',
                                   'CO': 'Colombia', 'COL': 'Colombia',
                                   'PE': 'Perú', 'PER': 'Perú',
                                   'CL': 'Chile', 'CHL': 'Chile',
                                   'EC': 'Ecuador', 'ECU': 'Ecuador',
                                   'AR': 'Argentina', 'ARG': 'Argentina',
                                   'MX': 'México', 'MEX': 'México',
                                   'US': 'Estados Unidos', 'USA': 'Estados Unidos',
                                   'ES': 'España', 'ESP': 'España',
                                   'PA': 'Panamá', 'PAN': 'Panamá',
                                   'DO': 'República Dominicana', 'DOM': 'República Dominicana',
                                   'BR': 'Brasil', 'BRA': 'Brasil'
                              };
                              updateProfileData.country = countryMap[residenceCountryCode] || residenceCountryCode;
                              console.log(`[Didit Webhook] Fallback: Usando país del documento para residencia: ${updateProfileData.country}`);
                         }
                    }

                    console.log('[Didit Webhook] Actualizando perfil con:', updateProfileData);

                    const { error: profileError } = await supabase
                         .from('profiles')
                         .update(updateProfileData)
                         .eq('id', verification.user_id);

                    if (profileError) {
                         console.error('[Didit Webhook] Error actualizando perfil:', profileError);
                    } else {
                         console.log('[Didit Webhook] ✓ Perfil verificado y actualizado:', verification.user_id);
                    }
               } else {
                    console.warn('[Didit Webhook] No se pudieron obtener detalles de sesión para kyc:', payload.session_id);
                    // Fallback: Si no hay detalles, al menos marcar como verificado (ya lo hace arriba el updateProfileData inicial si lo movieramos, pero aqui depende de sessionDetails)
                    // Mínimo marcar verificado
                    const fallbackUpdate: Record<string, any> = {
                         is_kyc_verified: true,
                         updated_at: new Date().toISOString(),
                    };

                    if (extractedDocNumber) {
                         fallbackUpdate.document_number = extractedDocNumber;
                         if (updateData.document_type) fallbackUpdate.document_type = updateData.document_type;
                         if (updateData.document_country) fallbackUpdate.country = updateData.document_country;
                    }

                    await supabase.from('profiles').update(fallbackUpdate).eq('id', verification.user_id);
               }
          }

          // Si el estado es 'in review' o 'review_needed', notificar al admin
          if (payload.status === 'in review' || payload.status === 'review_needed') {
               try {
                    let adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

                    // 1. Intentar buscar Super Admin en perfiles (priorizando whatsapp_number)
                    if (!adminNumber) {
                         const { data: adminProfile } = await supabase
                              .from('profiles')
                              .select('phone_number, whatsapp_number')
                              .eq('role', 'SUPER_ADMIN')
                              .or('phone_number.neq.null,whatsapp_number.neq.null')
                              .limit(1)
                              .single();

                         if (adminProfile) {
                              adminNumber = adminProfile.whatsapp_number || adminProfile.phone_number;
                         }
                    }

                    // 2. Si no hay Super Admin con teléfono, buscar en business_info
                    if (!adminNumber) {
                         const { data: businessInfo } = await supabase
                              .from('business_info')
                              .select('value')
                              .eq('key', 'contact_whatsapp')
                              .single();

                         if (businessInfo?.value) adminNumber = businessInfo.value;
                    }

                    if (adminNumber) {
                         const { sendTextMessage } = await import('@/lib/whatsapp');

                         const adminMessage = `🔔 *Nueva Verificación en Revisión*
        
Usuario ID: ${verification.user_id}
Session ID: ${payload.session_id}
Estado: ${payload.status}

⚠️ Esta verificación requiere revisión manual.

👉 *Ir al panel de Didit:*
https://business.didit.me/auth/login`;

                         await sendTextMessage(adminNumber, adminMessage);
                         console.log('[Didit Webhook] Notificación enviada al admin:', adminNumber);
                    } else {
                         console.warn('[Didit Webhook] No se encontró número de admin para notificar (Super Admin profile, business_info o env var)');
                    }
               } catch (notifyError) {
                    console.error('[Didit Webhook] Error enviando notificación al admin:', notifyError);
               }
          }

          // Retornar éxito
          return NextResponse.json({
               received: true,
               session_id: payload.session_id,
               status: payload.status,
          });

     } catch (error) {
          console.error('[Didit Webhook] Error:', error);
          // Retornar 200 para evitar reintentos innecesarios
          return NextResponse.json({ received: true, error: 'internal error' });
     }
}
