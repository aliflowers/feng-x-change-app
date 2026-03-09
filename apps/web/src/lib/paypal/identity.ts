'use server';

/**
 * PayPal Identity API — OpenID Connect
 * Handles OAuth 2.0 flow for "Log In with PayPal" identity verification.
 */

const PAYPAL_SANDBOX_BASE = 'https://www.sandbox.paypal.com';
const PAYPAL_LIVE_BASE = 'https://www.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const PAYPAL_LIVE_API = 'https://api-m.paypal.com';

function getBaseUrl(): string {
 const mode = process.env.PAYPAL_MODE || 'sandbox';
 return mode === 'live' ? PAYPAL_LIVE_BASE : PAYPAL_SANDBOX_BASE;
}

function getApiUrl(): string {
 const mode = process.env.PAYPAL_MODE || 'sandbox';
 return mode === 'live' ? PAYPAL_LIVE_API : PAYPAL_SANDBOX_API;
}

/**
 * Generates the PayPal OAuth 2.0 authorization URL.
 * The user is redirected to this URL to log in with PayPal.
 */
export function getPaypalAuthUrl(state: string, redirectUri: string): string {
 const clientId = process.env.PAYPAL_CLIENT_ID;
 const baseUrl = getBaseUrl();

 const params = new URLSearchParams({
  client_id: clientId || '',
  response_type: 'code',
  scope: 'openid email profile',
  redirect_uri: redirectUri,
  state,
  nonce: `nonce_${Date.now()}_${Math.random().toString(36).substring(2)}`,
 });

 return `${baseUrl}/signin/authorize?${params.toString()}`;
}

/**
 * Exchanges an authorization code for an access token.
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
 access_token: string;
 token_type: string;
 expires_in: number;
 id_token?: string;
}> {
 const apiUrl = getApiUrl();
 const clientId = process.env.PAYPAL_CLIENT_ID;
 const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

 const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

 const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
   'Authorization': `Basic ${credentials}`,
   'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
   grant_type: 'authorization_code',
   code,
   redirect_uri: redirectUri,
  }).toString(),
 });

 if (!response.ok) {
  const errorData = await response.text();
  console.error('PayPal token exchange error:', errorData);
  throw new Error(`Failed to exchange code for token: ${response.status}`);
 }

 return response.json();
}

/**
 * Fetches user info from PayPal using the access token.
 * Returns the user's email and full name.
 */
export async function getUserInfo(accessToken: string): Promise<{
 email: string;
 name: string;
 givenName: string;
 familyName: string;
 payerId: string;
}> {
 const apiUrl = getApiUrl();

 const response = await fetch(
  `${apiUrl}/v1/identity/openidconnect/userinfo?schema=openid`,
  {
   headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
   },
  }
 );

 if (!response.ok) {
  const errorData = await response.text();
  console.error('PayPal userinfo error:', errorData);
  throw new Error(`Failed to fetch user info: ${response.status}`);
 }

 const data = await response.json();

 return {
  email: data.email || '',
  name: data.name || '',
  givenName: data.given_name || '',
  familyName: data.family_name || '',
  payerId: data.payer_id || data.user_id || '',
 };
}

/**
 * Normalizes and compares two names (case-insensitive, accent-insensitive).
 * Returns true if names are a reasonable match.
 */
export function normalizeAndCompareNames(name1: string, name2: string): boolean {
 const normalize = (name: string) =>
  name
   .toLowerCase()
   .normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '') // Remove accents
   .replace(/\s+/g, ' ')
   .trim();

 const n1 = normalize(name1);
 const n2 = normalize(name2);

 // Exact match
 if (n1 === n2) return true;

 // Check if one contains the other (partial name match)
 const words1 = n1.split(' ');
 const words2 = n2.split(' ');

 // At least 2 words match (first + last name typical match)
 const matchCount = words1.filter(w => words2.includes(w)).length;
 return matchCount >= 2;
}
