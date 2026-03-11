import { NextResponse } from 'next/server';
import { exchangeCodeForToken, getUserInfo, normalizeAndCompareNames } from '@/lib/paypal/identity';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
 process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
 process.env.SUPABASE_SECRET_KEY || ''
);

/**
 * POST /api/paypal/identity/userinfo
 * Exchanges the authorization code for tokens, fetches user info,
 * and compares the PayPal name with the platform profile name.
 */
export async function POST(request: Request) {
 try {
  const { code, userId } = await request.json();

  if (!code) {
   return NextResponse.json(
    { error: 'Authorization code is required' },
    { status: 400 }
   );
  }

  const redirectUri = process.env.PAYPAL_REDIRECT_URI || '';

  // Exchange code for token
  const tokenData = await exchangeCodeForToken(code, redirectUri);

  // Get user info from PayPal
  const paypalUser = await getUserInfo(tokenData.access_token);

  // Compare names with platform profile if userId provided
  let nameMatch = true;
  let profileName = '';

  console.log('[PayPal Identity] userId received:', userId, '| type:', typeof userId, '| truthy:', !!userId);
  console.log('[PayPal Identity] PayPal user data:', { name: paypalUser.name, givenName: paypalUser.givenName, familyName: paypalUser.familyName, email: paypalUser.email });

  if (userId) {
   const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

   console.log('[PayPal Identity] Profile lookup result:', { profile, profileError });

   if (profile) {
    profileName = `${profile.first_name} ${profile.last_name}`.trim();
    const paypalFullName = paypalUser.name;
    nameMatch = normalizeAndCompareNames(paypalFullName, profileName);
    console.log('[PayPal Identity] Name comparison:', {
     paypalFullName,
     profileName,
     nameMatch,
    });
   }
  } else {
   console.log('[PayPal Identity] WARNING: No userId provided, skipping name comparison. nameMatch defaults to true!');
  }

  return NextResponse.json({
   email: paypalUser.email,
   name: paypalUser.name,
   givenName: paypalUser.givenName,
   familyName: paypalUser.familyName,
   payerId: paypalUser.payerId,
   verified: true,
   nameMatch,
   profileName,
  });
 } catch (error) {
  console.error('PayPal userinfo error:', error);
  return NextResponse.json(
   { error: 'Failed to verify PayPal identity' },
   { status: 500 }
  );
 }
}
