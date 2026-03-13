import { NextResponse } from 'next/server';
import { getPaypalAuthUrl } from '@/lib/paypal/identity';

/**
 * GET /api/paypal/identity/authorize
 * Generates the PayPal OAuth authorization URL.
 * Accepts userId as query param and encodes it in the state parameter
 * so the callback can extract it reliably.
 */
export async function GET(request: Request) {
 try {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || '';

  let origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
      origin = request.headers.get('origin') || request.headers.get('referer')
       ? new URL(request.headers.get('referer') || request.headers.get('origin') || '').origin
       : url.origin;
  }

  // Salvavidas para evitar localhost en Railway en producción
  if (process.env.NODE_ENV === 'production' && origin.includes('localhost')) {
      origin = 'https://feng-x-change-app-ambiente-de-prueba.up.railway.app';
  }

  // Use env var if set, otherwise build from origin
  const redirectUri = process.env.PAYPAL_REDIRECT_URI || `${origin}/paypal-callback`;

  // Encode userId in the state parameter so the callback can extract it
  const state = `pp_${Date.now()}_${userId}`;

  const authUrl = getPaypalAuthUrl(state, redirectUri);

  return NextResponse.json({ authUrl, state });
 } catch (error) {
  console.error('PayPal authorize error:', error);
  return NextResponse.json(
   { error: 'Failed to generate authorization URL' },
   { status: 500 }
  );
 }
}
