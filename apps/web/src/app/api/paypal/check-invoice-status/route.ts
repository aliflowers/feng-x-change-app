import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { getInvoiceDetails } from '@/lib/paypal/client';

/**
 * GET /api/paypal/check-invoice-status?invoiceId=INV2-XXXX-XXXX
 *
 * Checks the payment status of a PayPal invoice.
 * Used by the frontend polling mechanism to detect when a client
 * has paid the invoice.
 *
 * Returns full transaction details when the invoice is PAID:
 * - status: Invoice status (DRAFT, SENT, PAID, etc.)
 * - transactionId: PayPal payment transaction ID (e.g. 9LP07066L63395531)
 * - paymentDate: Actual payment date from PayPal
 * - reference: Invoice reference number (REQ-XXXXXXXXXX)
 */
export async function GET(request: NextRequest) {
 try {
  // 1. Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get invoiceId from query params
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('invoiceId');

  if (!invoiceId) {
   return NextResponse.json(
    { error: 'Missing required parameter: invoiceId' },
    { status: 400 }
   );
  }

  // 3. Query PayPal for invoice details
  const details = await getInvoiceDetails(invoiceId);

  // Type guards for PayPal response
  const invoiceDetails = details as {
   status?: string;
   detail?: {
    reference?: string;
    invoice_number?: string;
   };
   payments?: {
    transactions?: Array<{
     payment_id?: string;
     payment_date?: string;
     method?: string;
     amount?: {
      currency_code?: string;
      value?: string;
     };
    }>;
   };
  };

  const status = invoiceDetails.status || 'UNKNOWN';

  // 4. Extract payment transaction details when PAID
  let transactionId: string | null = null;
  let paymentDate: string | null = null;
  let paymentMethod: string | null = null;
  const reference = invoiceDetails.detail?.reference || invoiceDetails.detail?.invoice_number || null;

  if (status === 'PAID' || status === 'MARKED_AS_PAID') {
   const transactions = invoiceDetails.payments?.transactions;
   if (transactions && transactions.length > 0) {
    const lastPayment = transactions[transactions.length - 1];
    transactionId = lastPayment.payment_id || null;
    paymentDate = lastPayment.payment_date || null;
    paymentMethod = lastPayment.method || null;
   }
  }

  return NextResponse.json({
   invoiceId,
   status,
   transactionId,
   paymentDate,
   paymentMethod,
   reference,
  });
 } catch (error) {
  console.error('[PayPal Check Status] Error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
 }
}
