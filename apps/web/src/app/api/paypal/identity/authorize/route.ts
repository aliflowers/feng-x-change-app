import { NextResponse } from 'next/server';
import { getPaypalAuthUrl } from '@/lib/paypal/identity';

/**
 * GET /api/paypal/identity/authorize
 * Generates the PayPal OAuth authorization URL.
 * Detects the host dynamically to support Ngrok and localhost.
 */
export async function GET(request: Request) {
 try {
  const url = new URL(request.url);
  const origin = request.headers.get('origin') || request.headers.get('referer')
   ? new URL(request.headers.get('referer') || request.headers.get('origin') || '').origin
   : url.origin;

  // Use env var if set, otherwise build from origin
  const redirectUri = process.env.PAYPAL_REDIRECT_URI || `${origin}/app/paypal-callback`;
  const state = `pp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
