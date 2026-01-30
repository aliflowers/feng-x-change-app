import crypto from 'crypto';

/**
 * Utilidad de cifrado AES-256-GCM para datos sensibles
 * 
 * Uso:
 * - encrypt(): Cifra texto plano (API keys, tokens, contraseñas)
 * - decrypt(): Descifra texto cifrado
 * - maskSecret(): Oculta un secreto mostrando solo primeros 3 y últimos 4 caracteres
 * 
 * IMPORTANTE: La variable CONFIG_ENCRYPTION_KEY debe estar configurada en .env.local
 * Generar con: openssl rand -hex 32
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
 const key = process.env.CONFIG_ENCRYPTION_KEY;

 if (!key) {
  throw new Error('CONFIG_ENCRYPTION_KEY no está configurada en las variables de entorno');
 }

 if (key.length !== 64) {
  throw new Error('CONFIG_ENCRYPTION_KEY debe ser de 64 caracteres hexadecimales (32 bytes)');
 }

 return Buffer.from(key, 'hex');
}

/**
 * Cifra un texto plano usando AES-256-GCM
 * @param plaintext Texto a cifrar
 * @returns Texto cifrado en formato "iv:authTag:ciphertext" (hex)
 */
export async function encrypt(plaintext: string): Promise<string> {
 if (!plaintext) return '';

 const key = getEncryptionKey();
 const iv = crypto.randomBytes(IV_LENGTH);
 const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

 let encrypted = cipher.update(plaintext, 'utf8', 'hex');
 encrypted += cipher.final('hex');

 const authTag = cipher.getAuthTag();

 return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descifra un texto cifrado con AES-256-GCM
 * @param encryptedText Texto cifrado en formato "iv:authTag:ciphertext"
 * @returns Texto plano descifrado
 */
export async function decrypt(encryptedText: string): Promise<string> {
 if (!encryptedText) return '';

 const parts = encryptedText.split(':');
 if (parts.length !== 3) {
  throw new Error('Formato de texto cifrado inválido');
 }

 const [ivHex, authTagHex, ciphertext] = parts;
 const key = getEncryptionKey();

 const iv = Buffer.from(ivHex, 'hex');
 const authTag = Buffer.from(authTagHex, 'hex');

 const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
 decipher.setAuthTag(authTag);

 let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
 decrypted += decipher.final('utf8');

 return decrypted;
}

/**
 * Oculta un secreto mostrando solo los primeros 3 y últimos 4 caracteres
 * @param secret Secreto a ocultar
 * @returns Secreto enmascarado (ej: "sk-***...***1234")
 */
export function maskSecret(secret: string): string {
 if (!secret) return '';
 if (secret.length <= 7) return '*'.repeat(secret.length);

 const prefix = secret.slice(0, 3);
 const suffix = secret.slice(-4);
 return `${prefix}${'*'.repeat(12)}${suffix}`;
}

/**
 * Verifica si un texto está cifrado (formato válido)
 * @param text Texto a verificar
 * @returns true si parece estar cifrado
 */
export function isEncrypted(text: string): boolean {
 if (!text) return false;
 const parts = text.split(':');
 if (parts.length !== 3) return false;

 const [iv, authTag, ciphertext] = parts;

 // Verificar que cada parte sea hex válido
 const hexRegex = /^[0-9a-fA-F]+$/;
 return (
  iv.length === IV_LENGTH * 2 &&
  authTag.length === AUTH_TAG_LENGTH * 2 &&
  ciphertext.length > 0 &&
  hexRegex.test(iv) &&
  hexRegex.test(authTag) &&
  hexRegex.test(ciphertext)
 );
}
