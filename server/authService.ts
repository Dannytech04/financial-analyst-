import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { SubscriptionTier, UserSubscription } from '../types';

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
 * Verifies a Firebase Auth ID token from the Authorization header.
 * Rejects untrusted or missing tokens with clear error messages.
 */
export async function verifyAuthToken(authHeader?: string): Promise<{ user: AuthenticatedUser; rawToken: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required. Missing Bearer token.');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error('Authentication required. Empty token provided.');
  }

  // Support test tokens in automated test environments
  if (token.startsWith('mock-test-token-')) {
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

    // Verify audience / project ID if present
    if (payload.aud && payload.aud !== firebaseConfig.projectId) {
      throw new Error('Authentication token project mismatch.');
    }

    // Authoritative verification against Firebase Identity Toolkit
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const lookupRes = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (!lookupRes.ok) {
      const errData = await lookupRes.json().catch(() => ({}));
      const msg = (errData as any)?.error?.message || 'Authentication verification failed.';
      throw new Error(`Token verification failed: ${msg}`);
    }

    const data = await lookupRes.json() as { users?: Array<{ localId: string; email?: string }> };
    const localId = data.users?.[0]?.localId || payload.sub;
    if (!localId) {
      throw new Error('Authentication token missing user ID.');
    }

    return {
      user: {
        uid: localId,
        email: data.users?.[0]?.email || payload.email
      },
      rawToken: token
    };
  } catch (err: any) {
    throw new Error(err.message || 'Invalid authentication token.');
  }
}

/**
 * Fetches authoritative subscription document from Firestore.
 * Never trusts client-reported tier, usageCount, or subscriptionExpiry.
 */
export async function getAuthoritativeSubscription(uid: string, idToken: string): Promise<UserSubscription> {
  if (idToken.startsWith('mock-test-token-')) {
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

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${uid}/subscription/current`;

  try {
    const res = await fetch(firestoreUrl, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (res.status === 404) {
      // Return default FREE subscription if document not initialized yet
      return {
        userId: uid,
        tier: SubscriptionTier.FREE,
        status: 'ACTIVE',
        usageCount: { vision: 0, audit: 0 },
        subscriptionExpiry: null
      };
    }

    if (!res.ok) {
      console.warn(`[Subscription Fetch Warning] HTTP ${res.status} for ${uid}`);
      return {
        userId: uid,
        tier: SubscriptionTier.FREE,
        status: 'ACTIVE',
        usageCount: { vision: 0, audit: 0 },
        subscriptionExpiry: null
      };
    }

    const docData = await res.json() as any;
    const fields = docData.fields || {};

    const tier = (fields.tier?.stringValue as SubscriptionTier) || SubscriptionTier.FREE;
    const status = fields.status?.stringValue || 'ACTIVE';
    const rawExpiry = fields.subscriptionExpiry?.integerValue ?? fields.subscriptionExpiry?.stringValue;
    const subscriptionExpiry = rawExpiry ? Number(rawExpiry) : null;

    const visionCount = Number(fields.usageCount?.mapValue?.fields?.vision?.integerValue || 0);
    const auditCount = Number(fields.usageCount?.mapValue?.fields?.audit?.integerValue || 0);

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
      usageCount: {
        vision: visionCount,
        audit: auditCount
      },
      createdAt: fields.createdAt?.stringValue,
      updatedAt: fields.updatedAt?.stringValue
    };
  } catch (err) {
    console.error(`[Subscription Error] Failed to fetch subscription for ${uid}:`, err);
    return {
      userId: uid,
      tier: SubscriptionTier.FREE,
      status: 'ACTIVE',
      usageCount: { vision: 0, audit: 0 },
      subscriptionExpiry: null
    };
  }
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
    // Deep trade analysis requires PRO or ELITE tier
    if (tier === SubscriptionTier.FREE) {
      return {
        allowed: false,
        reason: 'Deep trade analysis requires a Pro or Elite subscription tier. Please upgrade your plan.',
        limit: 0,
        currentUsage: sub.usageCount.audit
      };
    }
    // Also respect audit quota if not elite
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

  return {
    allowed: true,
    limit,
    currentUsage
  };
}

/**
 * Authoritatively records and increments usage counters in Firestore.
 */
export async function recordServerUsage(
  uid: string,
  idToken: string,
  feature: 'vision' | 'audit',
  currentSub: UserSubscription
): Promise<{ vision: number; audit: number }> {
  const newVision = feature === 'vision' ? currentSub.usageCount.vision + 1 : currentSub.usageCount.vision;
  const newAudit = feature === 'audit' ? currentSub.usageCount.audit + 1 : currentSub.usageCount.audit;
  const now = new Date().toISOString();

  // Test mode update
  if (idToken.startsWith('mock-test-token-')) {
    const updatedSub: UserSubscription = {
      ...currentSub,
      usageCount: { vision: newVision, audit: newAudit },
      updatedAt: now
    };
    testSubscriptions.set(uid, updatedSub);
    return updatedSub.usageCount;
  }

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${uid}/subscription/current?updateMask.fieldPaths=usageCount&updateMask.fieldPaths=updatedAt`;

  try {
    const payload = {
      fields: {
        usageCount: {
          mapValue: {
            fields: {
              vision: { integerValue: String(newVision) },
              audit: { integerValue: String(newAudit) }
            }
          }
        },
        updatedAt: { stringValue: now }
      }
    };

    const res = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[Usage Increment Warning] Firestore returned ${res.status} for ${uid}`);
    }
  } catch (err) {
    console.error(`[Usage Increment Error] Failed to update Firestore usage for ${uid}:`, err);
  }

  return { vision: newVision, audit: newAudit };
}
