/**
 * Configuración de control de sesión estricto para Clientes y Afiliados
 * 
 * Estos valores controlan cuándo expira la sesión de un cliente en la plataforma web:
 * - INACTIVITY_TIMEOUT: Tiempo sin actividad antes de cerrar sesión
 */

// Tiempo de inactividad: 15 minutos (en milisegundos)
export const CLIENT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Keys de localStorage específicas para el área de clientes
export const CLIENT_SESSION_STORAGE_KEYS = {
 LOGIN_TIME: 'fxc_client_session_login_time',
 LAST_ACTIVITY: 'fxc_client_session_last_activity',
} as const;

/**
 * Guarda el timestamp de inicio de sesión del cliente
 * Llamar después de un login exitoso en /login
 */
export function initializeClientSession(): void {
 const now = Date.now().toString();
 localStorage.setItem(CLIENT_SESSION_STORAGE_KEYS.LOGIN_TIME, now);
 localStorage.setItem(CLIENT_SESSION_STORAGE_KEYS.LAST_ACTIVITY, now);
}

/**
 * Actualiza el timestamp de última actividad del cliente
 * Llamar tras interacciones o navegación
 */
export function updateClientLastActivity(): void {
 localStorage.setItem(CLIENT_SESSION_STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Limpia los datos de sesión del cliente del localStorage
 * Llamar al cerrar sesión
 */
export function clearClientSessionData(): void {
 localStorage.removeItem(CLIENT_SESSION_STORAGE_KEYS.LOGIN_TIME);
 localStorage.removeItem(CLIENT_SESSION_STORAGE_KEYS.LAST_ACTIVITY);
}

/**
 * Verifica si la sesión del cliente ha expirado por inactividad
 * @returns { expired: boolean, reason?: 'inactivity' }
 */
export function checkClientSessionExpiration(): {
 expired: boolean;
 reason?: 'inactivity';
} {
 const loginTime = localStorage.getItem(CLIENT_SESSION_STORAGE_KEYS.LOGIN_TIME);
 const lastActivity = localStorage.getItem(CLIENT_SESSION_STORAGE_KEYS.LAST_ACTIVITY);

 // Si no hay datos de sesión, consideramos que no hay sesión válida
 if (!loginTime || !lastActivity) {
  return { expired: true, reason: 'inactivity' };
 }

 const now = Date.now();
 const lastActivityTimestamp = parseInt(lastActivity, 10);

 // Verificar inactividad (15 minutos)
 const inactivityDuration = now - lastActivityTimestamp;
 if (inactivityDuration > CLIENT_INACTIVITY_TIMEOUT_MS) {
  return { expired: true, reason: 'inactivity' };
 }

 return { expired: false };
}
