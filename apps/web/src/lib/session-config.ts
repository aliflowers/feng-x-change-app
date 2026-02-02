/**
 * Configuración de control de sesión para usuarios internos
 * 
 * Estos valores controlan cuándo expira la sesión del usuario:
 * - INACTIVITY_TIMEOUT: Tiempo sin actividad antes de cerrar sesión
 * - MAX_SESSION_DURATION: Tiempo máximo de sesión sin importar actividad
 */

// Tiempo de inactividad: 1 hora (en milisegundos)
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos

// Duración máxima de sesión: 24 horas (en milisegundos)
export const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

// Tiempo de advertencia antes del logout (5 minutos antes)
export const WARNING_BEFORE_LOGOUT_MS = 5 * 60 * 1000; // 5 minutos

// Keys de localStorage
export const SESSION_STORAGE_KEYS = {
 LOGIN_TIME: 'fxc_session_login_time',
 LAST_ACTIVITY: 'fxc_session_last_activity',
} as const;

/**
 * Guarda el timestamp de inicio de sesión
 * Llamar después de un login exitoso
 */
export function initializeSession(): void {
 const now = Date.now().toString();
 localStorage.setItem(SESSION_STORAGE_KEYS.LOGIN_TIME, now);
 localStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY, now);
}

/**
 * Actualiza el timestamp de última actividad
 * Llamar al navegar entre páginas
 */
export function updateLastActivity(): void {
 localStorage.setItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Limpia los datos de sesión del localStorage
 * Llamar al cerrar sesión
 */
export function clearSessionData(): void {
 localStorage.removeItem(SESSION_STORAGE_KEYS.LOGIN_TIME);
 localStorage.removeItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY);
}

/**
 * Verifica si la sesión ha expirado
 * @returns { expired: boolean, reason?: 'inactivity' | 'max_duration' }
 */
export function checkSessionExpiration(): {
 expired: boolean;
 reason?: 'inactivity' | 'max_duration';
 minutesRemaining?: number;
} {
 const loginTime = localStorage.getItem(SESSION_STORAGE_KEYS.LOGIN_TIME);
 const lastActivity = localStorage.getItem(SESSION_STORAGE_KEYS.LAST_ACTIVITY);

 // Si no hay datos de sesión, consideramos que no hay sesión válida
 if (!loginTime || !lastActivity) {
  return { expired: true, reason: 'max_duration' };
 }

 const now = Date.now();
 const loginTimestamp = parseInt(loginTime, 10);
 const lastActivityTimestamp = parseInt(lastActivity, 10);

 // Verificar duración máxima de sesión (24 horas)
 const sessionDuration = now - loginTimestamp;
 if (sessionDuration > MAX_SESSION_DURATION_MS) {
  return { expired: true, reason: 'max_duration' };
 }

 // Verificar inactividad (1 hora)
 const inactivityDuration = now - lastActivityTimestamp;
 if (inactivityDuration > INACTIVITY_TIMEOUT_MS) {
  return { expired: true, reason: 'inactivity' };
 }

 // Calcular minutos restantes (el menor de los dos límites)
 const msUntilMaxSession = MAX_SESSION_DURATION_MS - sessionDuration;
 const msUntilInactivity = INACTIVITY_TIMEOUT_MS - inactivityDuration;
 const msRemaining = Math.min(msUntilMaxSession, msUntilInactivity);
 const minutesRemaining = Math.floor(msRemaining / 60000);

 return { expired: false, minutesRemaining };
}

/**
 * Verifica si se debe mostrar advertencia de expiración próxima
 */
export function shouldShowExpirationWarning(): boolean {
 const { expired, minutesRemaining } = checkSessionExpiration();

 if (expired) return false;
 if (minutesRemaining === undefined) return false;

 // Mostrar advertencia si quedan menos de 5 minutos
 return minutesRemaining <= 5;
}
