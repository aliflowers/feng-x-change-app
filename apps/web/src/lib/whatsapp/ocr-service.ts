/**
 * OCR Service - Extracción de datos de comprobantes de pago
 * 
 * Usa GPT-4o-mini con Vision para OCR (más preciso que Tesseract).
 * Extrae: monto, referencia, fecha, banco del comprobante.
 */

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
// FUNCIÓN PRINCIPAL DE OCR CON GPT-4o-mini
// ============================================================================

/**
 * Procesa una imagen de comprobante de pago usando GPT-4o-mini Vision
 * @param imageBase64 - Imagen en base64 (data URL)
 * @returns Datos extraídos del comprobante
 */
export async function processPaymentProof(imageBase64: string): Promise<OCRResult> {
 try {
  console.log('[OCR] Starting image processing with GPT-4o-mini...');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
   console.error('[OCR] OPENAI_API_KEY not configured');
   return {
    success: false,
    confidence: 0,
    extractedData: {},
    rawText: '',
    error: 'API key no configurada',
   };
  }

  // Preparar el prompt para extracción de datos
  const systemPrompt = `Eres un experto en extraer datos de comprobantes de pago bancarios.
Analiza la imagen y extrae los siguientes datos en formato JSON:
{
  "amount": número (solo el valor numérico, sin símbolos de moneda),
  "currency": "USD" | "EUR" | "VES" | "COP" | "CLP" | "PEN" (código de la moneda detectada),
  "reference": "string" (número de referencia o confirmación),
  "date": "DD/MM/YYYY" (fecha de la transacción),
  "bank": "string" (nombre del banco o plataforma: Zelle, PayPal, Binance, etc.),
  "confidence": número entre 0 y 1 (qué tan seguro estás de los datos)
}

REGLAS:
- Si no puedes leer un campo, omítelo del JSON
- Para montos, detecta si usa punto o coma como decimal
- Busca palabras clave como "Confirmation", "Reference", "Referencia", "Comprobante"
- Responde SOLO con el JSON, sin texto adicional`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
   },
   body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
     {
      role: 'system',
      content: systemPrompt,
     },
     {
      role: 'user',
      content: [
       {
        type: 'text',
        text: 'Extrae los datos de este comprobante de pago:',
       },
       {
        type: 'image_url',
        image_url: {
         url: imageBase64,
         detail: 'high',
        },
       },
      ],
     },
    ],
    max_tokens: 500,
    temperature: 0.1, // Baja temperatura para respuestas más consistentes
   }),
  });

  if (!response.ok) {
   const errorText = await response.text();
   console.error('[OCR] OpenAI API error:', errorText);
   return {
    success: false,
    confidence: 0,
    extractedData: {},
    rawText: '',
    error: `API error: ${response.status}`,
   };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  console.log('[OCR] GPT-4o-mini response:', content);

  // Parsear el JSON de respuesta
  try {
   // Limpiar el contenido por si tiene markdown
   const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
   const extracted = JSON.parse(jsonStr);

   return {
    success: true,
    confidence: extracted.confidence || 0.8,
    extractedData: {
     amount: extracted.amount,
     currency: extracted.currency,
     reference: extracted.reference,
     date: extracted.date,
     bank: extracted.bank,
    },
    rawText: content,
   };
  } catch (parseError) {
   console.warn('[OCR] Could not parse JSON response:', parseError);
   return {
    success: false,
    confidence: 0,
    extractedData: {},
    rawText: content,
    error: 'Could not parse response',
   };
  }

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
 * Descarga un media de WhatsApp y lo procesa con OCR (GPT-4o-mini)
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

  // Paso 4: Procesar con GPT-4o-mini Vision
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
