/**
 * Servicio de Alertas de Seguridad
 * 
 * Detecta y notifica intentos de login fallidos
 * Canales: Email + WhatsApp
 */

import createClient from '@/lib/supabase/server';
import { getGeoFromIP } from '@/lib/geoip';

interface FailedLoginData {
 email: string;
 ip: string;
 userAgent: string;
 reason: 'invalid_password' | 'user_not_found' | '2fa_failed' | 'account_locked' | 'rate_limited';
}

interface AlertConfig {
 enabled: boolean;
 threshold: number;
 notifyEmail: string;
 notifyWhatsapp?: string;
}

/**
 * Registra un intento de login fallido y dispara alerta si supera umbral
 */
export async function recordFailedLogin(data: FailedLoginData): Promise<void> {
 try {
  const supabase = await createClient();

  // Obtener geolocalización
  const geo = await getGeoFromIP(data.ip);

  // Registrar intento fallido
  await supabase.from('failed_login_attempts').insert({
   email: data.email,
   ip_address: data.ip,
   user_agent: data.userAgent,
   geo_country: geo.country,
   geo_city: geo.city,
   reason: data.reason,
  });

  // Verificar si debemos enviar alerta
  await checkAndSendAlert(supabase, data.email, data.ip, geo);

 } catch (error) {
  console.error('[Security Alert] Error recording failed login:', error);
 }
}

/**
 * Verifica umbral y envía alerta si es necesario
 */
async function checkAndSendAlert(
 supabase: Awaited<ReturnType<typeof createClient>>,
 email: string,
 ip: string,
 geo: { country: string | null; city: string | null }
): Promise<void> {
 try {
  // Obtener configuración de alertas
  const { data: config } = await supabase
   .from('security_config')
   .select('value')
   .eq('key', 'failed_login_alerts')
   .single();

  const alertConfig: AlertConfig = config?.value || {
   enabled: true,
   threshold: 5,
   notifyEmail: 'admin@fengxchange.com',
  };

  if (!alertConfig.enabled) {
   return;
  }

  // Contar intentos recientes (últimos 30 minutos)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { count } = await supabase
   .from('failed_login_attempts')
   .select('*', { count: 'exact', head: true })
   .or(`email.eq.${email},ip_address.eq.${ip}`)
   .gte('created_at', thirtyMinutesAgo);

  if ((count || 0) >= alertConfig.threshold) {
   await sendSecurityAlert({
    count: count || 0,
    email,
    ip,
    country: geo.country,
    city: geo.city,
    notifyEmail: alertConfig.notifyEmail,
    notifyWhatsapp: alertConfig.notifyWhatsapp,
   });
  }

 } catch (error) {
  console.error('[Security Alert] Error checking threshold:', error);
 }
}

/**
 * Envía alerta de seguridad por Email y/o WhatsApp
 */
async function sendSecurityAlert(data: {
 count: number;
 email: string;
 ip: string;
 country: string | null;
 city: string | null;
 notifyEmail: string;
 notifyWhatsapp?: string;
}): Promise<void> {
 const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
 const location = data.city && data.country
  ? `${data.city}, ${data.country}`
  : data.country || 'Desconocido';

 console.warn(`[SECURITY ALERT] ${data.count} failed login attempts from ${data.ip} (${location}) for ${data.email}`);

 // Enviar por Email
 try {
  const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/email`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
    to: data.notifyEmail,
    subject: '🚨 Alerta de Seguridad - Intentos de Login Fallidos',
    html: `
          <h2>🚨 Alerta de Seguridad</h2>
          <p>Se han detectado <strong>${data.count} intentos de login fallidos</strong>.</p>
          <table>
            <tr><td><strong>Email intentado:</strong></td><td>${data.email}</td></tr>
            <tr><td><strong>IP:</strong></td><td>${data.ip}</td></tr>
            <tr><td><strong>Ubicación:</strong></td><td>${location}</td></tr>
            <tr><td><strong>Fecha/Hora:</strong></td><td>${timestamp}</td></tr>
          </table>
          <p>Revisa los logs de auditoría para más detalles.</p>
        `,
   }),
  });

  if (!emailResponse.ok) {
   console.error('[Security Alert] Failed to send email');
  }
 } catch (error) {
  console.error('[Security Alert] Error sending email:', error);
 }

 // Enviar por WhatsApp (si está configurado)
 if (data.notifyWhatsapp) {
  try {
   const whatsappResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/send-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     to: data.notifyWhatsapp,
     templateName: 'alerta_seguridad',
     variables: [
      String(data.count),
      data.email,
      data.ip,
      timestamp,
     ],
    }),
   });

   if (!whatsappResponse.ok) {
    console.error('[Security Alert] Failed to send WhatsApp');
   }
  } catch (error) {
   console.error('[Security Alert] Error sending WhatsApp:', error);
  }
 }
}

/**
 * Obtiene estadísticas de intentos fallidos recientes
 */
export async function getFailedLoginStats(
 supabase: Awaited<ReturnType<typeof createClient>>,
 hours: number = 24
): Promise<{
 total: number;
 byReason: Record<string, number>;
 topIPs: { ip: string; count: number }[];
}> {
 const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

 const { data: attempts } = await supabase
  .from('failed_login_attempts')
  .select('*')
  .gte('created_at', since)
  .order('created_at', { ascending: false });

 if (!attempts || attempts.length === 0) {
  return { total: 0, byReason: {}, topIPs: [] };
 }

 // Agrupar por razón
 const byReason: Record<string, number> = {};
 const ipCounts: Record<string, number> = {};

 for (const attempt of attempts) {
  byReason[attempt.reason] = (byReason[attempt.reason] || 0) + 1;
  if (attempt.ip_address) {
   ipCounts[attempt.ip_address] = (ipCounts[attempt.ip_address] || 0) + 1;
  }
 }

 // Top IPs
 const topIPs = Object.entries(ipCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([ip, count]) => ({ ip, count }));

 return {
  total: attempts.length,
  byReason,
  topIPs,
 };
}
