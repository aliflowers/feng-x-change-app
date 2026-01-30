'use strict';

/**
 * Rate Limiter In-Memory
 * 
 * Implementación simple de rate limiting usando memoria del servidor.
 * Ideal para desarrollo y producción con una sola instancia.
 * 
 * Limitaciones:
 * - Se resetea con cada deploy/restart
 * - En serverless (Vercel), cada instancia tiene su propia memoria
 */

interface RateLimitEntry {
 count: number;
 resetTime: number;
}

interface RateLimitConfig {
 requests: number;
 windowMs: number;
}

interface RateLimitResult {
 success: boolean;
 remaining: number;
 resetTime: number;
 retryAfterMs?: number;
}

// Almacenamiento en memoria por IP/identificador
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas expiradas (cada 5 minutos)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
 if (cleanupTimer) return;

 cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
   if (now > entry.resetTime) {
    rateLimitStore.delete(key);
   }
  }
 }, CLEANUP_INTERVAL);

 // No bloquear el proceso
 if (cleanupTimer.unref) {
  cleanupTimer.unref();
 }
}

// Iniciar limpieza automática
startCleanup();

/**
 * Verifica si una solicitud está dentro del límite permitido
 * 
 * @param identifier - IP, userId, o cualquier identificador único
 * @param config - Configuración del límite (requests, windowMs)
 * @returns Resultado indicando si se permite la solicitud
 */
export function checkRateLimit(
 identifier: string,
 config: RateLimitConfig
): RateLimitResult {
 const now = Date.now();
 const key = identifier;

 let entry = rateLimitStore.get(key);

 // Si no hay entrada o expiró, crear nueva
 if (!entry || now > entry.resetTime) {
  entry = {
   count: 0,
   resetTime: now + config.windowMs,
  };
  rateLimitStore.set(key, entry);
 }

 // Incrementar contador
 entry.count++;

 // Verificar límite
 if (entry.count > config.requests) {
  return {
   success: false,
   remaining: 0,
   resetTime: entry.resetTime,
   retryAfterMs: entry.resetTime - now,
  };
 }

 return {
  success: true,
  remaining: config.requests - entry.count,
  resetTime: entry.resetTime,
 };
}

/**
 * Obtiene el estado actual del rate limit para un identificador
 */
export function getRateLimitStatus(
 identifier: string,
 config: RateLimitConfig
): { current: number; limit: number; resetInMs: number } {
 const entry = rateLimitStore.get(identifier);
 const now = Date.now();

 if (!entry || now > entry.resetTime) {
  return {
   current: 0,
   limit: config.requests,
   resetInMs: config.windowMs,
  };
 }

 return {
  current: entry.count,
  limit: config.requests,
  resetInMs: Math.max(0, entry.resetTime - now),
 };
}

/**
 * Resetea el contador para un identificador específico
 */
export function resetRateLimit(identifier: string): void {
 rateLimitStore.delete(identifier);
}

/**
 * Limpia todo el store (útil para testing)
 */
export function clearAllRateLimits(): void {
 rateLimitStore.clear();
}

// Configuraciones predefinidas por tipo de ruta
export const RATE_LIMIT_PRESETS = {
 // Rutas de autenticación - muy restrictivas
 auth: { requests: 10, windowMs: 60 * 1000 }, // 10 req/min

 // Rutas de WhatsApp - moderadas
 whatsapp: { requests: 30, windowMs: 60 * 1000 }, // 30 req/min

 // Rutas públicas - moderadas
 public: { requests: 50, windowMs: 60 * 1000 }, // 50 req/min

 // API general - permisivas
 default: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;
