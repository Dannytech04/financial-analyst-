/**
 * Paystack API client — server-side only.
 * Handles transaction initialization and verification.
 * Secret key must NEVER reach the client.
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number; // in kobo (subunits)
    currency: string;
    customer: {
      email: string;
    };
    metadata: {
      custom_fields?: Array<{ display_name: string; variable_name: string; value: string }>;
      [key: string]: unknown;
    };
    requested_amount: number;
  };
}

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY in your environment.');
  }
  return key;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeTransactionResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const data = await res.json() as InitializeTransactionResponse;

  if (!res.ok || !data.status) {
    const msg = (data as any)?.message || 'Paystack initialization failed.';
    throw new Error(msg);
  }

  return data;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getSecretKey()}`,
    },
  });

  const data = await res.json() as VerifyTransactionResponse;

  if (!res.ok || !data.status) {
    const msg = (data as any)?.message || 'Transaction verification failed.';
    throw new Error(msg);
  }

  return data;
}

/**
 * Verifies the Paystack webhook signature using HMAC-SHA512.
 * Returns true if the signature matches the raw body.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
