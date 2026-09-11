/**
 * Payment service — bridges Paystack verification with Firestore subscription activation.
 * Uses Firebase Admin SDK to write tier changes that client SDK cannot (blocked by Firestore rules).
 */
import { getAdminFirestore } from './firebaseAdmin';
import { verifyTransaction, type VerifyTransactionResponse } from './paystackService';
import { SubscriptionTier } from '../types';

// Plan prices in kobo (1 NGN = 100 kobo). USD prices converted at 1,500 NGN/USD.
// These are authoritative server-side — client prices are display-only.
export const PLAN_PRICES_KOBO: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  [SubscriptionTier.FREE]: { monthly: 0, yearly: 0 },
  [SubscriptionTier.PRO]: { monthly: 29 * 100 * 1500, yearly: 280 * 100 * 1500 },
  [SubscriptionTier.ELITE]: { monthly: 99 * 100 * 1500, yearly: 950 * 100 * 1500 },
};

const DURATION_DAYS: Record<'monthly' | 'yearly', number> = {
  monthly: 30,
  yearly: 365,
};

function generateReference(uid: string, tier: SubscriptionTier, cycle: 'monthly' | 'yearly'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ps_${uid.substring(0, 12)}_${tier.toLowerCase()}_${cycle}_${timestamp}_${random}`;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export async function initializePayment(params: {
  uid: string;
  email: string;
  tier: SubscriptionTier;
  cycle: 'monthly' | 'yearly';
  callbackUrl: string;
}): Promise<InitializePaymentResult> {
  const { uid, email, tier, cycle, callbackUrl } = params;

  if (tier === SubscriptionTier.FREE) {
    throw new Error('Cannot initialize payment for FREE tier.');
  }

  const priceKobo = PLAN_PRICES_KOBO[tier][cycle];
  const reference = generateReference(uid, tier, cycle);

  const result = await initializeTransactionInternal({
    email,
    amountKobo: priceKobo,
    reference,
    callbackUrl,
    metadata: {
      uid,
      tier,
      cycle,
      custom_fields: [
        { display_name: 'User ID', variable_name: 'uid', value: uid },
        { display_name: 'Plan', variable_name: 'tier', value: tier },
        { display_name: 'Billing Cycle', variable_name: 'cycle', value: cycle },
      ],
    },
  });

  return {
    authorizationUrl: result.data.authorization_url,
    reference: result.data.reference,
  };
}

async function initializeTransactionInternal(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const { initializeTransaction } = await import('./paystackService');
  return initializeTransaction(params);
}

export async function activateSubscriptionFromPayment(reference: string): Promise<{
  uid: string;
  tier: SubscriptionTier;
  status: string;
  subscriptionExpiry: number;
}> {
  const verification = await verifyTransaction(reference);

  if (verification.data.status !== 'success') {
    throw new Error(`Payment was not successful. Status: ${verification.data.status}`);
  }

  const metadata = verification.data.metadata || {};
  const uid = (metadata as any).uid || (metadata as any).custom_fields?.find(
    (f: any) => f.variable_name === 'uid'
  )?.value;

  if (!uid) {
    throw new Error('Payment metadata missing user ID. Cannot activate subscription.');
  }

  const tier = ((metadata as any).tier || (metadata as any).custom_fields?.find(
    (f: any) => f.variable_name === 'tier'
  )?.value) as SubscriptionTier;

  const cycle = ((metadata as any).cycle || (metadata as any).custom_fields?.find(
    (f: any) => f.variable_name === 'cycle'
  )?.value) as 'monthly' | 'yearly';

  if (!tier || !cycle) {
    throw new Error('Payment metadata missing tier or cycle. Cannot activate subscription.');
  }

  const expectedAmount = PLAN_PRICES_KOBO[tier][cycle];
  if (verification.data.amount !== expectedAmount) {
    throw new Error(`Payment amount mismatch. Expected ${expectedAmount} kobo, received ${verification.data.amount} kobo.`);
  }

  const expiryDays = DURATION_DAYS[cycle];
  const subscriptionExpiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

  const db = getAdminFirestore();
  const subRef = db.doc(`users/${uid}/subscription/current`);

  await subRef.set({
    userId: uid,
    tier,
    status: 'ACTIVE',
    subscriptionExpiry,
    usageCount: {
      vision: 0,
      audit: 0,
    },
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return {
    uid,
    tier,
    status: 'ACTIVE',
    subscriptionExpiry,
  };
}

export async function cancelSubscription(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const subRef = db.doc(`users/${uid}/subscription/current`);

  await subRef.set({
    userId: uid,
    tier: SubscriptionTier.FREE,
    status: 'CANCELLED',
    subscriptionExpiry: null,
    usageCount: {
      vision: 0,
      audit: 0,
    },
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
