/**
 * Servicio de 2FA - Autenticación de Dos Factores
 * 
 * Soporta dos métodos:
 * - Email: Envía código de 6 dígitos por email
 * - TOTP: Google Authenticator / Authy (código basado en tiempo)
 */

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';

export type TwoFactorMethod = 'none' | 'email' | 'totp';

export interface TwoFactorSetupResult {
 method: TwoFactorMethod;
 secret?: string;      // Solo para TOTP
 qrCodeUri?: string;   // Solo para TOTP
 backupCodes?: string[];
}

export interface TwoFactorVerifyResult {
 success: boolean;
 error?: string;
}

/**
 * Genera un secret TOTP para Google Authenticator
 */
export function generateTOTPSecret(): string {
 const secret = new OTPAuth.Secret({ size: 20 });
 return secret.base32;
}

/**
 * Genera URI para QR code de Google Authenticator
 */
export function generateTOTPUri(
 email: string,
 secret: string,
 issuer: string = 'FengXchange'
): string {
 const totp = new OTPAuth.TOTP({
  issuer,
  label: email,
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: OTPAuth.Secret.fromBase32(secret),
 });
 return totp.toString();
}

/**
 * Genera imagen QR code en formato base64
 */
export async function generateQRCode(uri: string): Promise<string> {
 try {
  return await QRCode.toDataURL(uri, {
   errorCorrectionLevel: 'M',
   width: 256,
   margin: 2,
  });
 } catch (error) {
  console.error('[2FA] Error generating QR code:', error);
  throw new Error('Error generando código QR');
 }
}

/**
 * Verifica un código TOTP
 */
export function verifyTOTPCode(token: string, secret: string): boolean {
 try {
  const totp = new OTPAuth.TOTP({
   algorithm: 'SHA1',
   digits: 6,
   period: 30,
   secret: OTPAuth.Secret.fromBase32(secret),
  });
  // delta devuelve null si el token es inválido, o el offset de ventana si es válido
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
 } catch (error) {
  console.error('[2FA] Error verifying TOTP:', error);
  return false;
 }
}

/**
 * Genera un código aleatorio de 6 dígitos para email
 */
export function generateEmailCode(): string {
 return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Genera códigos de respaldo (backup codes)
 * Retorna 8 códigos de 8 caracteres cada uno
 */
export function generateBackupCodes(count: number = 8): string[] {
 const codes: string[] = [];
 for (let i = 0; i < count; i++) {
  // Generar código de 8 caracteres alfanuméricos
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  codes.push(code);
 }
 return codes;
}

/**
 * Hashea los códigos de respaldo antes de guardarlos en BD
 */
export function hashBackupCodes(codes: string[]): string[] {
 return codes.map(code =>
  crypto.createHash('sha256').update(code.toLowerCase()).digest('hex')
 );
}

/**
 * Verifica si un código de respaldo es válido
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
 const hashedInput = crypto.createHash('sha256')
  .update(code.toLowerCase().replace(/-/g, ''))
  .digest('hex');

 return hashedCodes.findIndex(hashed => hashed === hashedInput);
}

/**
 * Formatea códigos de respaldo para mostrar al usuario
 * Formato: XXXX-XXXX
 */
export function formatBackupCodes(codes: string[]): string[] {
 return codes.map(code => {
  const cleaned = code.replace(/-/g, '').toUpperCase();
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
 });
}

/**
 * Token temporal para verificación 2FA durante login
 * Válido por 5 minutos
 */
export interface TwoFactorPendingSession {
 userId: string;
 email: string;
 method: TwoFactorMethod;
 expiresAt: number;
 emailCode?: string; // Solo para método email
}

// Cache en memoria para sesiones pendientes (en producción usar Redis)
const pendingSessions = new Map<string, TwoFactorPendingSession>();

/**
 * Crea una sesión pendiente de 2FA
 */
export function createPending2FASession(
 userId: string,
 email: string,
 method: TwoFactorMethod,
 emailCode?: string
): string {
 const sessionId = crypto.randomBytes(32).toString('hex');
 const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

 pendingSessions.set(sessionId, {
  userId,
  email,
  method,
  expiresAt,
  emailCode,
 });

 // Limpiar sesión expirada automáticamente
 setTimeout(() => {
  pendingSessions.delete(sessionId);
 }, 5 * 60 * 1000);

 return sessionId;
}

/**
 * Obtiene y valida una sesión pendiente de 2FA
 */
export function getPending2FASession(sessionId: string): TwoFactorPendingSession | null {
 const session = pendingSessions.get(sessionId);

 if (!session) {
  return null;
 }

 if (Date.now() > session.expiresAt) {
  pendingSessions.delete(sessionId);
  return null;
 }

 return session;
}

/**
 * Elimina una sesión pendiente de 2FA (después de verificación exitosa)
 */
export function deletePending2FASession(sessionId: string): void {
 pendingSessions.delete(sessionId);
}
