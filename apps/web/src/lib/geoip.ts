/**
 * GeoIP Service - Obtiene ubicación geográfica a partir de IP
 * 
 * Usa geoip-lite para búsquedas offline (sin API key)
 * Alternativa: ipinfo.io para mayor precisión (requiere API key)
 */

// Nota: geoip-lite usa una base de datos local que se actualiza mensualmente
// Para producción con mayor precisión, considerar ipinfo.io o MaxMind

export interface GeoLocation {
 country: string | null;
 countryName: string | null;
 city: string | null;
 region: string | null;
 timezone: string | null;
 coordinates: [number, number] | null;
}

// Mapeo de códigos de país a nombres
const COUNTRY_NAMES: Record<string, string> = {
 'VE': 'Venezuela',
 'US': 'Estados Unidos',
 'ES': 'España',
 'CO': 'Colombia',
 'CL': 'Chile',
 'AR': 'Argentina',
 'PE': 'Perú',
 'MX': 'México',
 'EC': 'Ecuador',
 'BR': 'Brasil',
 'PA': 'Panamá',
 'DO': 'República Dominicana',
 'CR': 'Costa Rica',
 'GT': 'Guatemala',
 'HN': 'Honduras',
 'SV': 'El Salvador',
 'NI': 'Nicaragua',
 'BO': 'Bolivia',
 'PY': 'Paraguay',
 'UY': 'Uruguay',
};

/**
 * Obtiene información geográfica usando geoip-lite (offline)
 * Instalación: pnpm add geoip-lite
 */
export async function getGeoFromIP(ip: string): Promise<GeoLocation> {
 try {
  // Import dinámico para evitar problemas con Edge Runtime
  const geoip = await import('geoip-lite');
  const geo = geoip.lookup(ip);

  if (!geo) {
   return {
    country: null,
    countryName: null,
    city: null,
    region: null,
    timezone: null,
    coordinates: null,
   };
  }

  return {
   country: geo.country,
   countryName: COUNTRY_NAMES[geo.country] || geo.country,
   city: geo.city || null,
   region: geo.region || null,
   timezone: geo.timezone || null,
   coordinates: geo.ll || null,
  };
 } catch (error) {
  console.warn('[GeoIP] Error looking up IP:', error);
  return {
   country: null,
   countryName: null,
   city: null,
   region: null,
   timezone: null,
   coordinates: null,
  };
 }
}

/**
 * Obtiene información geográfica usando ipinfo.io (online, mayor precisión)
 * Requiere: IPINFO_TOKEN en variables de entorno
 */
export async function getGeoFromIPApi(ip: string): Promise<GeoLocation> {
 const token = process.env.IPINFO_TOKEN;

 if (!token) {
  console.warn('[GeoIP] IPINFO_TOKEN not set, falling back to geoip-lite');
  return getGeoFromIP(ip);
 }

 try {
  const response = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`, {
   next: { revalidate: 86400 }, // Cache por 24 horas
  });

  if (!response.ok) {
   throw new Error(`ipinfo.io returned ${response.status}`);
  }

  const data = await response.json();

  return {
   country: data.country || null,
   countryName: COUNTRY_NAMES[data.country] || data.country || null,
   city: data.city || null,
   region: data.region || null,
   timezone: data.timezone || null,
   coordinates: data.loc
    ? data.loc.split(',').map(Number) as [number, number]
    : null,
  };
 } catch (error) {
  console.warn('[GeoIP] Error with ipinfo.io, falling back to geoip-lite:', error);
  return getGeoFromIP(ip);
 }
}

/**
 * Obtiene la IP del cliente desde headers (Railway/Cloudflare compatible)
 */
export function getClientIP(headers: Headers): string {
 // Railway y proxies estándar
 const forwardedFor = headers.get('x-forwarded-for');
 if (forwardedFor) {
  // Tomar solo la primera IP (la del cliente real)
  return forwardedFor.split(',')[0].trim();
 }

 // Cloudflare
 const cfIP = headers.get('cf-connecting-ip');
 if (cfIP) {
  return cfIP;
 }

 // Header estándar de algunos proxies
 const realIP = headers.get('x-real-ip');
 if (realIP) {
  return realIP;
 }

 return 'unknown';
}

/**
 * Valida si una IP es una IP privada/localhost
 */
export function isPrivateIP(ip: string): boolean {
 const privateRanges = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^localhost$/i,
 ];

 return privateRanges.some(range => range.test(ip));
}
