import { SubscriptionTier, UserSubscription } from '../types';
import { getSupabaseAdmin } from './supabaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  isAnonymous?: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, { vision: number; audit: number }> = {
  [SubscriptionTier.FREE]: { vision: 3, audit: 2 },
  [SubscriptionTier.PRO]: { vision: 50, audit: 20 },
  [SubscriptionTier.ELITE]: { vision: Infinity, audit: Infinity },
};

// In-memory test store for test suites (mock-test-token-*)
const testSubscriptions = new Map<string, UserSubscription>();

export function setTestSubscription(uid: string, sub: UserSubscription) {
  testSubscriptions.set(uid, sub);
}

export function clearTestSubscriptions() {
  testSubscriptions.clear();
}

/**
 * Verifies a Supabase Auth JWT from the Authorization header.
 * Rejects untrusted or missing tokens with clear error messages.
 *
 * Replaces the former Firebase Identity Toolkit verification. We decode the
 * JWT locally to inspect structure/expiration, then verify it against the
 * Supabase auth endpoint to confirm the user exists and the session is valid.
 */
export async function verifyAuthToken(authHeader?: string): Promise<{ user: AuthenticatedUser; rawToken: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required. Missing Bearer token.');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error('Authentication required. Empty token provided.');
  }

  // Support test tokens ONLY in automated test environments
  if (token.startsWith('mock-test-token-')) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Authentication required. Invalid token.');
    }
    const parts = token.split('-');
    // Format: mock-test-token-<tier>-<uid>
    const tier = (parts[3]?.toUpperCase() as SubscriptionTier) || SubscriptionTier.FREE;
    const uid = parts.slice(4).join('-') || `test-user-${tier.toLowerCase()}`;
    return {
      user: { uid, email: `${uid}@test.local` },
      rawToken: token
    };
  }

  // Parse JWT parts to inspect structure and expiration
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid authentication token structure.');
    }
    let payload: any;
    try {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      payload = JSON.parse(payloadJson);
    } catch {
      throw new Error('Invalid authentication token payload.');
    }

    // Verify expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Authentication token expired.');
    }

    // Verify the token is a Supabase JWT (check iss contains supabase)
    const supabaseUrl = process.env.SUPABASE_URL || '';
    if (payload.iss && !payload.iss.includes(supabaseUrl) && !supabaseUrl.includes(payload.iss)) {
      // Token doesn't match our project; reject
      throw new Error('Authentication token project mismatch.');
    }

    // Authoritative verification: query the Supabase auth user endpoint
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      throw new Error('Token verification failed: Invalid or revoked session.');
    }

    return {
      user: {
        uid: userData.user.id,
        email: userData.user.email || payload.email,
      },
      rawToken: token
    };
  } catch (err: any) {
    throw new Error(err.message || 'Invalid authentication token.');
  }
}

/**
 * Fetches authoritative subscription from the user_subscriptions table.
 * Uses the service-role admin client (bypasses RLS).
 * Never trusts client-reported tier, usageCount, or subscriptionExpiry.
 *
 * Preserves FREE fallback behavior:
 *   - 404 (no row) → FREE/ACTIVE with 0 usage
 *   - read error → FREE/ACTIVE with 0 usage
 *   - expired → effective tier downgraded to FREE
 */
export async function getAuthoritativeSubscription(uid: string, idToken: string): Promise<UserSubscription> {
  if (idToken.startsWith('mock-test-token-') && process.env.NODE_ENV === 'test') {
    let sub = testSubscriptions.get(uid);
    if (!sub) {
      const parts = idToken.split('-');
      const tierRaw = parts[3]?.toUpperCase();
      const tier = (tierRaw === 'PRO' ? SubscriptionTier.PRO : tierRaw === 'ELITE' ? SubscriptionTier.ELITE : SubscriptionTier.FREE);

      const vMatch = idToken.match(/-v(\d+)/);
      const vision = vMatch ? parseInt(vMatch[1], 10) : 0;

      const aMatch = idToken.match(/-a(\d+)/);
      const audit = aMatch ? parseInt(aMatch[1], 10) : 0;

      const isExpired = idToken.includes('-expired');
      const subscriptionExpiry = isExpired ? Date.now() - 100000 : null;

      sub = {
        userId: uid,
        tier,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        usageCount: { vision, audit },
        subscriptionExpiry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      testSubscriptions.set(uid, sub);
    }

    // Verify expiry on test store
    if (sub.subscriptionExpiry && sub.subscriptionExpiry < Date.now()) {
      return {
        ...sub,
        tier: SubscriptionTier.FREE,
        status: 'EXPIRED'
      };
    }
    return sub;
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.warn(`[Subscription Fetch Warning] DB error for ${uid}:`, error.message);
      return defaultFreeSubscription(uid);
    }

    if (!data) {
      // Return default FREE subscription if document not initialized yet
      return defaultFreeSubscription(uid);
    }

    const tier = (data.tier as SubscriptionTier) || SubscriptionTier.FREE;
    const status = data.status || 'ACTIVE';
    const subscriptionExpiry = data.subscription_expiry ?? null;
    const visionCount = data.usage_vision ?? 0;
    const auditCount = data.usage_audit ?? 0;

    // Verify expiry: If expired, downgrade effective tier to FREE
    let effectiveTier = tier;
    if (subscriptionExpiry && subscriptionExpiry < Date.now()) {
      effectiveTier = SubscriptionTier.FREE;
    }

    return {
      userId: uid,
      tier: effectiveTier,
      status: (subscriptionExpiry && subscriptionExpiry < Date.now()) ? 'EXPIRED' : status,
      subscriptionExpiry,
      usageCount: { vision: visionCount, audit: auditCount },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error(`[Subscription Error] Failed to fetch subscription for ${uid}:`, err);
    return defaultFreeSubscription(uid);
  }
}

function defaultFreeSubscription(uid: string): UserSubscription {
  return {
    userId: uid,
    tier: SubscriptionTier.FREE,
    status: 'ACTIVE',
    usageCount: { vision: 0, audit: 0 },
    subscriptionExpiry: null
  };
}

/**
 * Validates feature entitlement and verifies usage counts server-side.
 */
export function verifyFeatureEntitlement(
  sub: UserSubscription,
  feature: 'vision' | 'audit' | 'deep-audit'
): { allowed: boolean; reason?: string; limit: number; currentUsage: number } {
  const tier = sub.tier || SubscriptionTier.FREE;
  const limits = TIER_LIMITS[tier] || TIER_LIMITS[SubscriptionTier.FREE];

  if (feature === 'deep-audit') {
    if (tier === SubscriptionTier.FREE) {
      return {
        allowed: false,
        reason: 'Deep trade analysis requires a Pro or Elite subscription tier. Please upgrade your plan.',
        limit: 0,
        currentUsage: sub.usageCount.audit
      };
    }
    if (tier === SubscriptionTier.PRO && sub.usageCount.audit >= limits.audit) {
      return {
        allowed: false,
        reason: `Audit usage limit (${limits.audit}) reached for your Pro plan. Please upgrade to Elite for unlimited deep analysis.`,
        limit: limits.audit,
        currentUsage: sub.usageCount.audit
      };
    }
    return {
      allowed: true,
      limit: limits.audit,
      currentUsage: sub.usageCount.audit
    };
  }

  const currentUsage = sub.usageCount[feature] ?? 0;
  const limit = limits[feature];

  if (currentUsage >= limit) {
    const featureName = feature === 'vision' ? 'Chart vision' : 'Trade audit';
    return {
      allowed: false,
      reason: `${featureName} limit of ${limit} reached for your ${tier} plan. Upgrade to access higher intelligence quotas.`,
      limit,
      currentUsage
    };
  }

  return { allowed: true, limit, currentUsage };
}

/**
 * Authoritatively records and increments usage counters in user_subscriptions.
 * Uses the service-role admin client to bypass RLS.
 */
export async function recordServerUsage(
  uid: string,
  idToken: string,
  feature: 'vision' | 'audit',
  currentSub: UserSubscription
): Promise<{ vision: number; audit: number }> {
  const newVision = feature === 'vision' ? currentSub.usageCount.vision + 1 : currentSub.usageCount.vision;
  const newAudit = feature === 'audit' ? currentSub.usageCount.audit + 1 : currentSub.usageCount.audit;

  // Test mode update
  if (idToken.startsWith('mock-test-token-') && process.env.NODE_ENV === 'test') {
    const updatedSub: UserSubscription = {
      ...currentSub,
      usageCount: { vision: newVision, audit: newAudit },
      updatedAt: new Date().toISOString()
    };
    testSubscriptions.set(uid, updatedSub);
    return updatedSub.usageCount;
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        usage_vision: newVision,
        usage_audit: newAudit,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', uid)
      .select('usage_vision, usage_audit')
      .maybeSingle();

    if (error) {
      console.warn(`[Usage Increment Warning] DB returned error for ${uid}:`, error.message);
    }

    if (data) {
      return { vision: data.usage_vision, audit: data.usage_audit };
    }
  } catch (err) {
    console.error(`[Usage Increment Error] Failed to update usage for ${uid}:`, err);
  }

  return { vision: newVision, audit: newAudit };
}
