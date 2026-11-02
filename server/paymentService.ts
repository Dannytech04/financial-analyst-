/**
 * Payment service — bridges Paystack verification with Supabase subscription activation.
 * Uses the Supabase service-role admin client to write tier changes that client SDK
 * cannot (blocked by RLS policies).
 */
import { getSupabaseAdmin } from './supabaseAdmin';
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

/**
 * Verifies the transaction against Paystack, checks the amount, and writes
 * an ACTIVE subscription to the database with reset usage counters.
 *
 * Idempotency: if the subscription is already ACTIVE with a matching tier and
 * a future expiry, this is a no-op (returns the existing state). This prevents
 * a duplicate webhook from double-activating.
 */
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

  const supabaseAdmin = getSupabaseAdmin();

  // Idempotency check: if the subscription is already ACTIVE with this tier
  // and a non-expired expiry, treat this as a duplicate webhook — no-op.
  const { data: existing } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (existing && existing.status === 'ACTIVE' && existing.tier === tier) {
    const existingExpiry = existing.subscription_expiry;
    if (existingExpiry && existingExpiry > Date.now()) {
      // Already activated — duplicate webhook, return existing state
      return {
        uid,
        tier: existing.tier,
        status: existing.status,
        subscriptionExpiry: existingExpiry,
      };
    }
  }

  const expiryDays = DURATION_DAYS[cycle];
  const subscriptionExpiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

  const { error: activationError } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: uid,
      tier,
      status: 'ACTIVE',
      subscription_expiry: subscriptionExpiry,
      usage_vision: 0,
      usage_audit: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (activationError) {
    throw new Error(`Subscription activation failed: ${activationError.message}`);
  }

  return {
    uid,
    tier,
    status: 'ACTIVE',
    subscriptionExpiry,
  };
}

export async function cancelSubscription(uid: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: uid,
      tier: SubscriptionTier.FREE,
      status: 'CANCELLED',
      subscription_expiry: null,
      usage_vision: 0,
      usage_audit: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Subscription cancellation failed: ${error.message}`);
  }
}
