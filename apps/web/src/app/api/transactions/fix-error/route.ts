import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server-cookies';

export async function POST(request: NextRequest) {
 try {
  // Verify the user is authenticated via cookies
  const cookieClient = await createClient();
  const { data: { user }, error: authError } = await cookieClient.auth.getUser();

  if (authError || !user) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { txId } = await request.json();

  if (!txId || typeof txId !== 'string') {
   return NextResponse.json({ error: 'Missing or invalid txId' }, { status: 400 });
  }

  // Use admin client to bypass RLS
  const supabaseAdmin = createServerClient();

  // Verify the transaction belongs to this user and is in ERROR status
  const { data: tx, error: fetchError } = await supabaseAdmin
   .from('transactions')
   .select('id, status, user_id')
   .eq('id', txId)
   .eq('user_id', user.id)
   .eq('status', 'ERROR')
   .single();

  if (fetchError || !tx) {
   return NextResponse.json(
    { error: 'Transaction not found or not in ERROR status' },
    { status: 404 }
   );
  }

  // Update the transaction status back to TAKEN
  const { error: updateError } = await supabaseAdmin
   .from('transactions')
   .update({
    status: 'TAKEN',
    admin_notes: null,
    taken_at: new Date().toISOString()
   })
   .eq('id', txId);

  if (updateError) {
   console.error('Error updating transaction:', updateError);
   return NextResponse.json(
    { error: 'Failed to update transaction' },
    { status: 500 }
   );
  }

  return NextResponse.json({ success: true });
 } catch (error) {
  console.error('Error in fix-error route:', error);
  return NextResponse.json(
   { error: 'Internal server error' },
   { status: 500 }
  );
 }
}
