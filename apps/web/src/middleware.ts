import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMIT_PRESETS, type RateLimitPreset } from './lib/rate-limiter';

/**
 * Middleware de Seguridad para Next.js
 * 
 * Funcionalidades:
 * - Rate Limiting por IP y tipo de ruta
 * - Headers de seguridad (XSS, Frame, HSTS, etc.)
 * - Detección de IP para Railway/Cloudflare
 * - Logging de requests bloqueados
 */

// ==================== HEADERS DE SEGURIDAD ====================
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permitir cámara para futuro KYC, bloquear micrófono y geolocalización del navegador
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  // HSTS - activar solo en producción (comentar en desarrollo)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// ==================== CONFIGURACIÓN DE CACHE ====================
let cachedConfig: { enabled: boolean; requestsPerMinute: number } | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minuto

// ==================== BLACKLIST DE IPs (en memoria) ====================
const BLACKLISTED_IPS = new Set<string>();
const IP_BLOCK_COUNT = new Map<string, number>();
const MAX_BLOCKS_BEFORE_BLACKLIST = 20;

// ==================== FUNCIONES HELPER ====================

/**
 * Determina el preset de rate limit según la ruta
 */
function getPresetForPath(pathname: string): RateLimitPreset {
  if (pathname.startsWith('/api/auth') || pathname.includes('/login') || pathname.includes('/register')) {
    return 'auth';
  }
  if (pathname.startsWith('/api/whatsapp')) {
    return 'whatsapp';
  }
  if (pathname.startsWith('/api/public') || pathname.startsWith('/api/exchange-rates')) {
    return 'public';
  }
  return 'default';
}

/**
 * Obtiene IP del cliente (Railway/Cloudflare/Vercel compatible)
 * Implementa protección básica contra spoofing
 */
function getClientIP(request: NextRequest): string {
  // Railway usa x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Tomar solo la primera IP (la del cliente real)
    const firstIP = forwarded.split(',')[0].trim();
    // Validar que parezca una IP válida
    if (isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Header estándar de algunos proxies
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Valida formato básico de IP (IPv4 o IPv6)
 */
function isValidIP(ip: string): boolean {
  // IPv4 básico
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 simplificado
  const ipv6Regex = /^[a-fA-F0-9:]+$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Añade headers de seguridad a la respuesta
 */
function addSecurityHeaders(response: NextResponse): void {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
}

/**
 * Incrementa contador de bloqueos y blacklistea si supera umbral
 */
function handleBlockedRequest(ip: string): void {
  const currentCount = IP_BLOCK_COUNT.get(ip) || 0;
  const newCount = currentCount + 1;
  IP_BLOCK_COUNT.set(ip, newCount);

  if (newCount >= MAX_BLOCKS_BEFORE_BLACKLIST) {
    BLACKLISTED_IPS.add(ip);
    console.warn(`[Security] IP blacklisted after ${newCount} blocks: ${ip}`);
  }
}

// ==================== MIDDLEWARE PRINCIPAL ====================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);

  // Verificar blacklist primero
  if (BLACKLISTED_IPS.has(clientIP)) {
    console.warn(`[Security] Blocked blacklisted IP: ${clientIP} - ${pathname}`);
    return new NextResponse(
      JSON.stringify({
        error: 'Access Denied',
        message: 'Tu acceso ha sido temporalmente bloqueado por actividad sospechosa.'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Solo aplicar rate limiting a rutas API
  if (!pathname.startsWith('/api')) {
    const response = NextResponse.next();
    // Aplicar headers de seguridad a todas las rutas
    addSecurityHeaders(response);
    return response;
  }

  // Excluir rutas de health check y webhooks de rate limiting
  if (pathname === '/api/health' || pathname.startsWith('/api/whatsapp/webhook')) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Verificar si rate limiting está habilitado
  const now = Date.now();
  if (!cachedConfig || now - configCacheTime > CONFIG_CACHE_TTL) {
    cachedConfig = { enabled: true, requestsPerMinute: 100 };
    configCacheTime = now;
  }

  if (!cachedConfig.enabled) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Obtener preset y config
  const preset = getPresetForPath(pathname);
  const config = RATE_LIMIT_PRESETS[preset];

  // Crear identificador único (IP + tipo de ruta)
  const identifier = `${clientIP}:${preset}`;

  // Verificar rate limit
  const result = checkRateLimit(identifier, config);

  // Crear respuesta
  let response: NextResponse;

  if (result.success) {
    response = NextResponse.next();
  } else {
    // Rate limit excedido
    handleBlockedRequest(clientIP);
    console.warn(`[RateLimit] Blocked: ${clientIP} - ${pathname} (${preset})`);

    response = new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
        retryAfterSeconds: Math.ceil((result.retryAfterMs || 0) / 1000)
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    response.headers.set('Retry-After', String(Math.ceil((result.retryAfterMs || 0) / 1000)));
  }

  // Aplicar headers de seguridad
  addSecurityHeaders(response);

  // Headers de rate limit
  response.headers.set('X-RateLimit-Limit', String(config.requests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

  return response;
}

// Configurar qué rutas usan el middleware
export const config = {
  matcher: [
    // Aplicar a todas las rutas
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
