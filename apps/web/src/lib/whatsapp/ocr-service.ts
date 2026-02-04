/**
 * OCR Service - Extracción de datos de comprobantes de pago
 * 
 * Usa Tesseract.js para OCR local (gratuito, sin API externa).
 * Extrae: monto, referencia, fecha del comprobante.
 */

import Tesseract from 'tesseract.js';

// ============================================================================
// TIPOS
// ============================================================================

export interface OCRResult {
 success: boolean;
 confidence: number;
 extractedData: {
  amount?: number;
  currency?: string;
  reference?: string;
  date?: string;
  bank?: string;
 };
 rawText: string;
 error?: string;
}

// ============================================================================
// PATRONES DE EXTRACCIÓN
// ============================================================================

// Patrones para detectar montos (USD, EUR, etc.)
const AMOUNT_PATTERNS = [
 // USD formats: $100.00, USD 100.00, 100.00 USD
 /(?:USD|\$)\s*[\d,]+\.?\d*/gi,
 /[\d,]+\.?\d*\s*(?:USD|\$)/gi,
 // EUR formats
 /(?:EUR|€)\s*[\d,]+\.?\d*/gi,
 /[\d,]+\.?\d*\s*(?:EUR|€)/gi,
 // Venezuelan Bolivares
 /(?:VES|Bs\.?|BsS\.?)\s*[\d.,]+/gi,
 /[\d.,]+\s*(?:VES|Bs\.?|BsS\.?)/gi,
 // Colombian Pesos
 /(?:COP|\$)\s*[\d.,]+/gi,
 // Chilean Pesos
 /(?:CLP|\$)\s*[\d.,]+/gi,
 // Generic large numbers (likely amounts)
 /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b/g,
];

// Patrones para referencias de transacción
const REFERENCE_PATTERNS = [
 /(?:ref(?:erencia)?|reference|comprobante|n[úu]mero|no\.?|#)\s*[:\-]?\s*([A-Z0-9\-]+)/gi,
 /\b([A-Z]{2,4}\d{6,20})\b/g, // Códigos tipo AB123456789
 /\b(\d{10,20})\b/g, // Números largos (referencias numéricas)
];

// Patrones para fechas
const DATE_PATTERNS = [
 /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g, // DD/MM/YYYY o MM/DD/YYYY
 /(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g, // YYYY/MM/DD
 /(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s+\d{2,4})/gi,
];

// Bancos conocidos
const KNOWN_BANKS = [
 // Venezuela
 'mercantil', 'provincial', 'banesco', 'venezuela', 'exterior', 'bnc', 'bicentenario',
 'bod', 'caribe', 'sofitasa', 'plaza', 'bancrecer', 'activo', 'banplus', 'fondo común',
 // USA
 'zelle', 'paypal', 'venmo', 'chase', 'bank of america', 'wells fargo', 'citibank',
 // Plataformas
 'pago móvil', 'pagomovil', 'transferencia', 'binance', 'usdt', 'crypto',
];

// ============================================================================
// FUNCIONES DE EXTRACCIÓN
// ============================================================================

/**
 * Extrae el monto más probable del texto
 */
function extractAmount(text: string): { amount?: number; currency?: string } {
 for (const pattern of AMOUNT_PATTERNS) {
  const matches = text.match(pattern);
  if (matches && matches.length > 0) {
   // Tomar el match más largo (probablemente el monto completo)
   const bestMatch = matches.sort((a, b) => b.length - a.length)[0];

   // Detectar moneda
   let currency: string | undefined;
   if (/USD|\$/i.test(bestMatch)) currency = 'USD';
   else if (/EUR|€/i.test(bestMatch)) currency = 'EUR';
   else if (/VES|Bs/i.test(bestMatch)) currency = 'VES';
   else if (/COP/i.test(bestMatch)) currency = 'COP';
   else if (/CLP/i.test(bestMatch)) currency = 'CLP';

   // Extraer número
   const numStr = bestMatch.replace(/[^\d.,]/g, '');
   // Normalizar: si tiene punto como separador de miles y coma como decimal
   let normalized = numStr;
   if (numStr.includes(',') && numStr.includes('.')) {
    // Formato europeo: 1.000,00 -> 1000.00
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
     normalized = numStr.replace(/\./g, '').replace(',', '.');
    } else {
     // Formato US: 1,000.00 -> 1000.00
     normalized = numStr.replace(/,/g, '');
    }
   } else if (numStr.includes(',') && !numStr.includes('.')) {
    // Solo coma: podría ser decimal o miles
    const parts = numStr.split(',');
    if (parts[parts.length - 1].length === 2) {
     // Probablemente decimal
     normalized = numStr.replace(',', '.');
    } else {
     // Probablemente miles
     normalized = numStr.replace(/,/g, '');
    }
   }

   const amount = parseFloat(normalized);
   if (!isNaN(amount) && amount > 0) {
    return { amount, currency };
   }
  }
 }
 return {};
}

/**
 * Extrae la referencia de transacción
 */
function extractReference(text: string): string | undefined {
 for (const pattern of REFERENCE_PATTERNS) {
  const matches = text.match(pattern);
  if (matches && matches.length > 0) {
   // Filtrar matches muy cortos o muy largos
   const validMatches = matches.filter(m => {
    const cleaned = m.replace(/[^A-Z0-9]/gi, '');
    return cleaned.length >= 6 && cleaned.length <= 30;
   });
   if (validMatches.length > 0) {
    return validMatches[0].replace(/[^A-Z0-9]/gi, '');
   }
  }
 }
 return undefined;
}

/**
 * Extrae la fecha
 */
function extractDate(text: string): string | undefined {
 for (const pattern of DATE_PATTERNS) {
  const matches = text.match(pattern);
  if (matches && matches.length > 0) {
   return matches[0];
  }
 }
 return undefined;
}

/**
 * Detecta el banco mencionado
 */
function extractBank(text: string): string | undefined {
 const lowerText = text.toLowerCase();
 for (const bank of KNOWN_BANKS) {
  if (lowerText.includes(bank)) {
   return bank.charAt(0).toUpperCase() + bank.slice(1);
  }
 }
 return undefined;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE OCR
// ============================================================================

/**
 * Procesa una imagen de comprobante de pago y extrae datos
 * @param imageSource - URL de la imagen o base64 data URL
 * @returns Datos extraídos del comprobante
 */
export async function processPaymentProof(imageSource: string): Promise<OCRResult> {
 try {
  console.log('[OCR] Starting image processing...');

  // Ejecutar OCR con Tesseract
  const result = await Tesseract.recognize(
   imageSource,
   'spa+eng', // Español e inglés
   {
    logger: (m) => {
     if (m.status === 'recognizing text') {
      console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
     }
    }
   }
  );

  const rawText = result.data.text;
  const confidence = result.data.confidence / 100; // Normalizar a 0-1

  console.log('[OCR] Raw text extracted:', rawText.substring(0, 200) + '...');
  console.log('[OCR] Confidence:', confidence);

  // Extraer datos estructurados
  const { amount, currency } = extractAmount(rawText);
  const reference = extractReference(rawText);
  const date = extractDate(rawText);
  const bank = extractBank(rawText);

  return {
   success: true,
   confidence,
   extractedData: {
    amount,
    currency,
    reference,
    date,
    bank,
   },
   rawText,
  };

 } catch (error) {
  console.error('[OCR] Error processing image:', error);
  return {
   success: false,
   confidence: 0,
   extractedData: {},
   rawText: '',
   error: error instanceof Error ? error.message : 'Unknown error',
  };
 }
}

/**
 * Descarga un media de WhatsApp y lo procesa con OCR
 * @param mediaId - ID del media de WhatsApp
 * @param accessToken - Token de acceso de WhatsApp
 * @returns Datos extraídos del comprobante
 */
export async function processWhatsAppMedia(
 mediaId: string,
 accessToken: string
): Promise<OCRResult> {
 try {
  // Paso 1: Obtener URL del media
  const mediaInfoResponse = await fetch(
   `https://graph.facebook.com/v21.0/${mediaId}`,
   {
    headers: { 'Authorization': `Bearer ${accessToken}` }
   }
  );

  if (!mediaInfoResponse.ok) {
   throw new Error('Failed to get media info');
  }

  const mediaInfo = await mediaInfoResponse.json();
  const mediaUrl = mediaInfo.url;

  // Paso 2: Descargar el archivo
  const downloadResponse = await fetch(mediaUrl, {
   headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!downloadResponse.ok) {
   throw new Error('Failed to download media');
  }

  // Paso 3: Convertir a base64
  const arrayBuffer = await downloadResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = downloadResponse.headers.get('content-type') || 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log('[OCR] Media downloaded, size:', Math.round(arrayBuffer.byteLength / 1024), 'KB');

  // Paso 4: Procesar con OCR
  return await processPaymentProof(dataUrl);

 } catch (error) {
  console.error('[OCR] Error processing WhatsApp media:', error);
  return {
   success: false,
   confidence: 0,
   extractedData: {},
   rawText: '',
   error: error instanceof Error ? error.message : 'Unknown error',
  };
 }
}
