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
  if (payload.decision?.kyc) {
   updateData.document_type = payload.decision.kyc.document_type;
   updateData.document_country = payload.decision.kyc.document_country;
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
  if (payload.status === 'approved') {
   const { error: profileError } = await supabase
    .from('profiles')
    .update({
     is_kyc_verified: true,
     updated_at: new Date().toISOString(),
    })
    .eq('id', verification.user_id);

   if (profileError) {
    console.error('[Didit Webhook] Error actualizando perfil:', profileError);
   } else {
    console.log('[Didit Webhook] ✓ Perfil verificado:', verification.user_id);
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
