import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { createAndSendInvoice } from '@/lib/paypal/client';

/**
 * POST /api/paypal/create-invoice
 *
 * Creates and sends a PayPal invoice (payment request) to the client's
 * PayPal email address. Used when the client selects PayPal as the
 * deposit method in the transaction flow.
 *
 * Body:
 * - recipientEmail: string (client's PayPal email)
 * - amount: string (amount in USD, e.g. "150.00")
 * - currencyCode: string (e.g. "USD")
 * - transactionNumber: string (e.g. "OP-2026-00045")
 * - recipientName?: string (optional client name)
 */
export async function POST(request: NextRequest) {
 try {
  // 1. Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate body
  const body = await request.json();
  const { recipientEmail, amount, currencyCode, transactionNumber, recipientName } = body;

  if (!recipientEmail || !amount || !currencyCode || !transactionNumber) {
   return NextResponse.json(
    { error: 'Missing required fields: recipientEmail, amount, currencyCode, transactionNumber' },
    { status: 400 }
   );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
   return NextResponse.json(
    { error: 'Invalid email address' },
    { status: 400 }
   );
  }

  // 3. Create and send PayPal invoice
  const result = await createAndSendInvoice({
   invoiceNumber: transactionNumber,
   recipientEmail,
   recipientName,
   currencyCode,
   amount,
   description: `Cambio de divisas - ${transactionNumber}`,
   note: `Solicitud de pago por operación de cambio ${transactionNumber}. Feng Digital Service LLC.`,
  });

  console.log(`[PayPal Invoice] Created for user ${user.id}: ${result.invoiceId}`);

  return NextResponse.json({
   success: true,
   invoiceId: result.invoiceId,
   status: result.status,
  });
 } catch (error) {
  console.error('[PayPal Invoice] Error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
 }
}
