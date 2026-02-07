/**
 * Cliente para API de Didit KYC
 * 
 * Documentación: https://docs.didit.me/reference
 */

// Tipos para la API de Didit
export interface DiditSession {
 session_id: string;
 verification_url: string;
 status: 'pending' | 'in_progress' | 'approved' | 'declined' | 'expired';
}

export interface CreateSessionOptions {
 userId: string;
 callbackUrl: string;
 vendorData?: Record<string, string>;
}

export interface DiditWebhookPayload {
 session_id: string;
 vendor_data?: string;
 status: 'approved' | 'declined' | 'expired' | 'in review' | 'review_needed';
 workflow_id: string;
 decision: {
  kyc?: {
   document_type?: string;
   document_country?: string;
   document_number?: string;
  };
  face_match?: {
   score?: number;
  };
  decline_reasons?: string[];
 };
 raw_decision?: any;
 created_at: string;
 completed_at: string;
}

// Configuración desde variables de entorno
let DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://verification.didit.me/v3';

// Forzar V3 si se detectan URLs antiguas o si el webhook es v3.0 (Recomendado)
if (DIDIT_API_URL.includes('apx.didit.me') || DIDIT_API_URL.includes('api.didit.me') || DIDIT_API_URL.endsWith('/v2')) {
 console.warn('[Didit] URL detectada como v2/Legacy, cambiando a la recomendada v3 para compatibilidad con webhooks v3.0');
 DIDIT_API_URL = 'https://verification.didit.me/v3';
}

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET;

/**
 * Crea una nueva sesión de verificación en Didit
 */
export async function createVerificationSession(
 options: CreateSessionOptions
): Promise<DiditSession> {
 if (!DIDIT_API_KEY || !DIDIT_WORKFLOW_ID) {
  throw new Error('DIDIT_API_KEY y DIDIT_WORKFLOW_ID son requeridos');
 }

 // En V3, el endpoint de creación es /session/ (singular y con slash final)
 const endpoint = `${DIDIT_API_URL}/session/`;
 console.log('[Didit] Creating session at:', endpoint);

 const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
   'x-api-key': DIDIT_API_KEY,
  },
  body: JSON.stringify({
   workflow_id: DIDIT_WORKFLOW_ID,
   callback: options.callbackUrl,
   // En v3 vendor_data debe ser un string (el ID del usuario)
   vendor_data: options.userId,
  }),
 });

 if (!response.ok) {
  const error = await response.text();
  console.error('[Didit] Error creating session:', error);
  throw new Error(`Error al crear sesión de verificación: ${response.status}`);
 }

 const data = await response.json();
 console.log('[Didit] Session created response:', data);

 return {
  session_id: data.session_id,
  verification_url: data.url, // En V3 la propiedad es 'url'
  status: 'pending',
 };
}

/**
 * Obtiene el estado de una sesión de verificación
 */
export async function getVerificationSession(sessionId: string): Promise<any | null> {
 if (!DIDIT_API_KEY) {
  throw new Error('DIDIT_API_KEY es requerido');
 }

 try {
  // 1. Intentar endpoint de detalle directo (V3 suele usar /sessions/id)
  const response = await fetch(`${DIDIT_API_URL}/sessions/${sessionId}`, {
   method: 'GET',
   headers: {
    'x-api-key': DIDIT_API_KEY,
   },
  });

  if (response.ok) {
   return await response.json();
  }

  // Fallback 1: Intentar /session/id/ (singular)
  const singularResponse = await fetch(`${DIDIT_API_URL}/session/${sessionId}/`, {
   method: 'GET',
   headers: { 'x-api-key': DIDIT_API_KEY },
  });
  if (singularResponse.ok) return await singularResponse.json();

  // Fallback 2: buscar en lista filtrada
  if (response.status === 404 || singularResponse.status === 404) {
   console.warn(`[Didit] Sesión ${sessionId} no encontrada en detalle, buscando en lista...`);
   const listResponse = await fetch(`${DIDIT_API_URL}/sessions?session_id=${sessionId}`, {
    method: 'GET',
    headers: {
     'x-api-key': DIDIT_API_KEY,
    },
   });

   if (listResponse.ok) {
    const listData = await listResponse.json();
    const sessions = listData.results || listData.items || listData.sessions || [];
    const found = sessions.find((s: any) => s.session_id === sessionId || s.id === sessionId);

    if (found) {
     console.log(`[Didit] Sesión ${sessionId} encontrada en lista (fallback).`);
     return found;
    }
   }

   return null;
  }

  throw new Error(`Error al obtener sesión: ${response.status}`);
 } catch (e) {
  console.error('[Didit] Error en getVerificationSession:', e);
  throw e;
 }
}

/**
 * Obtiene el código de país (ISO 2) desde una IP usando API pública
 */
export async function getCountryFromIP(ip: string): Promise<string | null> {
 try {
  // Usar ip-api.com (gratis, sin key para uso moderado)
  const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`);
  if (!response.ok) return null;

  const data = await response.json();
  return data.status === 'success' ? data.countryCode : null;
 } catch (e) {
  console.error('[GeoIP] Error obteniendo país:', e);
  return null;
 }
}

/**
 * Verifica la firma HMAC del webhook de Didit
 * 
 * Didit genera la firma: HMAC-SHA256(payload, webhook_secret)
 * Enviada en el header X-Signature como hex string
 */
export async function verifyWebhookSignature(
 payload: string,
 signature: string,
 timestamp?: string
): Promise<boolean> {
 if (!DIDIT_WEBHOOK_SECRET) {
  console.error('[Didit] DIDIT_WEBHOOK_SECRET no configurado');
  return false;
 }

 // Verificar que el timestamp no sea muy viejo (5 minutos máximo)
 if (timestamp) {
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;

  if (Math.abs(now - timestampNum) > fiveMinutes) {
   console.error('[Didit] Timestamp fuera de rango:', { timestamp: timestampNum, now, diff: Math.abs(now - timestampNum) });
   return false;
  }
 }

 try {
  // Crear HMAC SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
   'raw',
   encoder.encode(DIDIT_WEBHOOK_SECRET),
   { name: 'HMAC', hash: 'SHA-256' },
   false,
   ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
   'HMAC',
   key,
   encoder.encode(payload)
  );

  // Convertir a hex
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
   .map(b => b.toString(16).padStart(2, '0'))
   .join('');

  // Log para debugging
  console.log('[Didit] Verificando firma:', {
   computed: computedSignature.substring(0, 16) + '...',
   received: signature.substring(0, 16) + '...',
   match: computedSignature.toLowerCase() === signature.toLowerCase()
  });

  // Comparar firmas (case-insensitive)
  return computedSignature.toLowerCase() === signature.toLowerCase();
 } catch (error) {
  console.error('[Didit] Error verificando firma:', error);
  return false;
 }
}

/**
 * Parsea el payload del webhook v3.0 de Didit
 */
export function parseWebhookPayload(rawPayload: string): DiditWebhookPayload | null {
 try {
  const data = JSON.parse(rawPayload);

  return {
   session_id: data.session_id,
   vendor_data: data.vendor_data,
   status: data.status,
   workflow_id: data.workflow_id,
   decision: {
    kyc: data.decision?.kyc,
    face_match: data.decision?.face_match,
    decline_reasons: data.decision?.decline_reasons,
   },
   raw_decision: data.decision,
   created_at: data.created_at,
   completed_at: data.completed_at,
  };
 } catch (error) {
  console.error('[Didit] Error parseando webhook:', error);
  return null;
 }
}
