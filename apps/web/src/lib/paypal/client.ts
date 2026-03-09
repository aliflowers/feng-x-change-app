/**
 * PayPal Invoicing API Client
 *
 * Uses PayPal REST API v2 to create and send invoices (payment requests).
 * Credentials are loaded from environment variables for easy switching
 * between sandbox and production.
 *
 * Environment Variables:
 * - PAYPAL_CLIENT_ID: PayPal app client ID
 * - PAYPAL_CLIENT_SECRET: PayPal app client secret
 * - PAYPAL_MODE: 'sandbox' | 'live' (defaults to 'sandbox')
 * - PAYPAL_INVOICER_EMAIL: Business email for invoices
 * - PAYPAL_INVOICER_NAME: Business display name for invoices
 *
 * @module paypal/client
 */

// ---------- Types ----------

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalInvoiceItem {
  name: string;
  description?: string;
  quantity: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
}

interface PayPalInvoiceRecipient {
  billing_info: {
    email_address: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
}

interface CreateInvoiceParams {
  invoiceNumber: string;
  recipientEmail: string;
  recipientName?: string;
  currencyCode: string;
  amount: string;
  description?: string;
  note?: string;
}

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

// ---------- Configuration ----------

const getBaseUrl = (): string => {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

const getCredentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing PayPal credentials. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.'
    );
  }

  return { clientId, clientSecret };
};

const getInvoicerInfo = () => ({
  email: process.env.PAYPAL_INVOICER_EMAIL || '',
  name: process.env.PAYPAL_INVOICER_NAME || 'Feng Digital Service LLC.',
});

// ---------- Token Management ----------

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtains a PayPal OAuth2 access token.
 * Caches the token until it expires (with 60s buffer).
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayPal] Failed to get access token:', errorBody);
    throw new Error(`PayPal authentication failed: ${response.status}`);
  }

  const data: PayPalAccessToken = await response.json();

  // Cache token with 60s buffer before expiry
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

// ---------- Helper ----------

/**
 * Extracts the invoice ID from the PayPal API response.
 * PayPal's create invoice endpoint returns the ID in the `href` link,
 * not always as a direct `id` field in the response body.
 */
function extractInvoiceId(data: Record<string, unknown>): string {
  // Option 1: Direct id field
  if (data.id && typeof data.id === 'string') {
    return data.id;
  }

  // Option 2: href in root
  if (data.href && typeof data.href === 'string') {
    const parts = (data.href as string).split('/');
    return parts[parts.length - 1];
  }

  // Option 3: href inside links array (rel=self)
  if (Array.isArray(data.links)) {
    const selfLink = (data.links as PayPalLink[]).find((l) => l.rel === 'self');
    if (selfLink) {
      const parts = selfLink.href.split('/');
      return parts[parts.length - 1];
    }
  }

  throw new Error('PayPal create invoice succeeded but no invoice ID found in response');
}

// ---------- Invoice Operations ----------

/**
 * Creates a draft invoice in PayPal.
 */
export async function createDraftInvoice(
  params: CreateInvoiceParams
): Promise<{ id: string }> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const invoicer = getInvoicerInfo();


  const invoiceBody = {
    detail: {
      invoice_number: params.invoiceNumber,
      reference: params.invoiceNumber,
      currency_code: params.currencyCode,
      note: "Gracias por confiar en Feng Digital Service LLC",
      terms_and_conditions: "Al pagar esta factura usted acepta que el pago de la misma no es reembolsable y representa que usted esta satisfacho(a) con los servicios digitales prestados.",
      payment_term: {
        term_type: 'DUE_ON_RECEIPT',
      },
    },
    invoicer: {
      business_name: invoicer.name,
      name: {
        given_name: invoicer.name,
        surname: '',
      },
      email_address: invoicer.email,
    },
    primary_recipients: [
      {
        billing_info: {
          email_address: params.recipientEmail,
          ...(params.recipientName && {
            name: { full_name: params.recipientName },
          }),
        },
      },
    ] as PayPalInvoiceRecipient[],
    items: [
      {
        name: "Servicios de Marketing digital y desarrollo web",
        quantity: '1',
        unit_amount: {
          currency_code: params.currencyCode,
          value: params.amount,
        },
      },
    ] as PayPalInvoiceItem[],
    configuration: {
      partial_payment: {
        allow_partial_payment: false,
      },
      allow_tip: false,
      tax_calculated_after_discount: false,
      tax_inclusive: false,
    },
  };

  const response = await fetch(`${baseUrl}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayPal] Failed to create invoice:', errorBody);
    throw new Error(`PayPal create invoice failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  console.log('[PayPal] Create invoice raw response:', JSON.stringify(data));

  const invoiceId = extractInvoiceId(data);
  return { id: invoiceId };
}

/**
 * Sends a draft invoice to the recipient via PayPal email.
 */
export async function sendInvoice(invoiceId: string): Promise<void> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}/v2/invoicing/invoices/${invoiceId}/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_to_invoicer: true,
        send_to_recipient: true,
        subject: 'Solicitud de pago - Feng Digital Service LLC.',
        note: 'Por favor, pague esta solicitud para completar su operación de cambio de divisas.',
      }),
    }
  );

  console.log(`[PayPal] Send invoice response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayPal] Failed to send invoice:', errorBody);
    throw new Error(`PayPal send invoice failed: ${response.status} - ${errorBody}`);
  }
}

/**
 * Creates and immediately sends a PayPal invoice.
 * This is the main function to use from the transaction flow.
 *
 * Returns the PayPal invoice ID for tracking.
 */
/**
 * Gets invoice details to verify its status.
 */
export async function getInvoiceDetails(invoiceId: string): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}/v2/invoicing/invoices/${invoiceId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayPal] Failed to get invoice details:', errorBody);
    throw new Error(`PayPal get invoice failed: ${response.status}`);
  }

  return response.json();
}

export async function createAndSendInvoice(
  params: CreateInvoiceParams
): Promise<{ invoiceId: string; status: string }> {
  // Step 1: Create draft
  const invoice = await createDraftInvoice(params);
  console.log(`[PayPal] Draft invoice created: ${invoice.id}`);

  // Step 2: Send to recipient
  await sendInvoice(invoice.id);
  console.log(`[PayPal] Invoice sent to: ${params.recipientEmail}`);

  // Step 3: Verify status
  try {
    const details = await getInvoiceDetails(invoice.id);
    const actualStatus = (details as { status?: string }).status || 'UNKNOWN';
    console.log(`[PayPal] Invoice ${invoice.id} verified status: ${actualStatus}`);
    return {
      invoiceId: invoice.id,
      status: actualStatus,
    };
  } catch {
    // Verification failed but invoice was sent
    console.warn('[PayPal] Could not verify invoice status, but send was successful');
    return {
      invoiceId: invoice.id,
      status: 'SENT',
    };
  }
}
