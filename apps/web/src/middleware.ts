import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMIT_PRESETS, type RateLimitPreset } from './lib/rate-limiter';

/**
 * Middleware de Rate Limiting para Next.js
 * 
 * Aplica límites de requests por IP según el tipo de ruta.
 * Lee configuración de DB de forma asíncrona (cacheada).
 */

// Cache de configuración (se actualiza cada minuto)
let cachedConfig: { enabled: boolean; requestsPerMinute: number } | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minuto

// Función para determinar el preset según la ruta
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

// Obtener IP del request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a rutas API
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Excluir rutas de health check y webhooks
  if (pathname === '/api/health' || pathname.startsWith('/api/whatsapp/webhook')) {
    return NextResponse.next();
  }

  // Verificar si rate limiting está habilitado (usar cache)
  const now = Date.now();
  if (!cachedConfig || now - configCacheTime > CONFIG_CACHE_TTL) {
    // En middleware de Edge no podemos hacer fetch a Supabase directamente,
    // usamos los presets por defecto y la configuración se aplica desde el endpoint
    cachedConfig = { enabled: true, requestsPerMinute: 100 };
    configCacheTime = now;
  }

  if (!cachedConfig.enabled) {
    return NextResponse.next();
  }

  // Obtener IP y preset
  const clientIP = getClientIP(request);
  const preset = getPresetForPath(pathname);
  const config = RATE_LIMIT_PRESETS[preset];

  // Crear identificador único (IP + ruta base)
  const identifier = `${clientIP}:${preset}`;

  // Verificar rate limit
  const result = checkRateLimit(identifier, config);

  // Agregar headers de rate limit
  const response = result.success
    ? NextResponse.next()
    : NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
        retryAfterSeconds: Math.ceil((result.retryAfterMs || 0) / 1000)
      },
      { status: 429 }
    );

  // Headers estándar de rate limit
  response.headers.set('X-RateLimit-Limit', String(config.requests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

  if (!result.success) {
    response.headers.set('Retry-After', String(Math.ceil((result.retryAfterMs || 0) / 1000)));
  }

  return response;
}

// Configurar qué rutas usan el middleware
export const config = {
  matcher: [
    // Aplicar a todas las rutas /api excepto algunas
    '/api/:path*',
  ],
};
