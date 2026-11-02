/**
 * Supabase client-side service — replaces the former Firebase/Firestore layer.
 *
 * Exports the same function names the rest of the app imports:
 *   auth (Supabase client), loginWithGoogle, loginWithEmail, registerWithEmail,
 *   logoutUser, getOrCreateUserProfile, getOrCreateAuthoritativeUser,
 *   getUserProfile, createInitialUserProfile, syncUserProfile,
 *   getUserSubscription, createInitialSubscription, subscribeToUserSubscription,
 *   saveTradeToFirestore, deleteTradeFromFirestore, subscribeToUserTrades,
 *   getUserGoals, saveGoalsToFirestore, subscribeToUserGoals,
 *   testConnection
 */
import { supabase } from './supabaseClient';
import { Trade, UserGoals, User, UserSubscription, SubscriptionTier } from '../types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Re-export supabase so existing `import { auth } from '@/services/firebase'` callers
// can switch to `import { auth } from '@/services/supabase'` with minimal churn.
export const auth = supabase.auth;

export { supabase };

// ==========================================
// Operation types preserved for error reporting compatibility
// ==========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function getCurrentUser(): { uid: string | null; email: string | null } {
  const session = supabase.auth.getSession();
  // getSession() is async, but for error-reporting context we read the cached user
  const user = (supabase.auth as any).currentUser as SupabaseUser | null;
  return { uid: user?.id ?? null, email: user?.email ?? null };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const { uid, email } = getCurrentUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: uid, email },
    operationType,
    path,
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    const { error } = await supabase.from('user_profiles').select('user_id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('No rows')) {
      // Non-fatal on startup; just log
      console.warn('Supabase connection test returned:', error.message);
    }
  } catch {
    // Non-fatal
  }
}

// ==========================================
// Authentication Helpers
// ==========================================

export async function loginWithGoogle(): Promise<SupabaseUser> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    console.error('Google login failed:', error);
    throw new Error(error.message);
  }
  // signInWithOAuth redirects; return the user if already available
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) return userData.user;
  // If we reach here the redirect hasn't happened yet; throw a benign error
  throw new Error('popup-redirect');
}

export async function loginWithEmail(email: string, password: string): Promise<SupabaseUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    console.error('Email login failed:', error);
    throw new Error(error.message);
  }
  return data.user!;
}

export async function registerWithEmail(email: string, password: string): Promise<SupabaseUser> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) {
    console.error('Email registration failed:', error);
    throw new Error(error.message);
  }
  return data.user!;
}

export async function logoutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign-out failed:', error);
    throw new Error(error.message);
  }
}

// ==========================================
// User Profile Operations (user_profiles table)
// ==========================================

export interface UserProfileDoc {
  userId: string;
  username: string;
  displayName?: string;
  email?: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export async function getUserProfile(userId: string): Promise<UserProfileDoc | null> {
  const path = `user_profiles/${userId}`;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: data.user_id,
      username: data.username || data.display_name || data.email?.split('@')[0] || 'TRADER',
      displayName: data.display_name || data.username || data.email?.split('@')[0] || 'TRADER',
      email: data.email || '',
      balance: typeof data.balance === 'number' ? data.balance : Number(data.balance) || 100000,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createInitialUserProfile(sbUser: SupabaseUser): Promise<UserProfileDoc> {
  const path = `user_profiles/${sbUser.id}`;
  const now = new Date().toISOString();
  const rawName = (sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'TRADER').trim();
  const defaultName = rawName.slice(0, 100) || 'TRADER';
  const email = (sbUser.email || '').trim().slice(0, 200);

  try {
    // Check if already exists
    const { data: existing, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', sbUser.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (existing) {
      return {
        userId: sbUser.id,
        username: existing.username || defaultName,
        displayName: existing.display_name || defaultName,
        email: existing.email || email,
        balance: typeof existing.balance === 'number' ? existing.balance : 100000,
        createdAt: existing.created_at || now,
        updatedAt: existing.updated_at || now,
      };
    }

    const profileData = {
      user_id: sbUser.id,
      username: defaultName,
      display_name: defaultName,
      email,
      balance: 100000,
    };

    const { error: insertErr } = await supabase.from('user_profiles').insert(profileData);
    if (insertErr) throw insertErr;

    return {
      userId: sbUser.id,
      username: defaultName,
      displayName: defaultName,
      email,
      balance: 100000,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncUserProfile(userId: string, updates: Partial<UserProfileDoc>): Promise<void> {
  const path = `user_profiles/${userId}`;
  try {
    const allowedUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) allowedUpdates.username = updates.username;
    if (updates.displayName !== undefined) allowedUpdates.display_name = updates.displayName;
    if (updates.email !== undefined) allowedUpdates.email = updates.email;

    const { error } = await supabase.from('user_profiles').update(allowedUpdates).eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// User Subscription Operations (user_subscriptions table)
// ==========================================

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const path = `user_subscriptions/${userId}`;
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: data.user_id,
      tier: (data.tier as SubscriptionTier) || SubscriptionTier.FREE,
      status: data.status || 'ACTIVE',
      subscriptionExpiry: data.subscription_expiry ?? null,
      usageCount: { vision: data.usage_vision ?? 0, audit: data.usage_audit ?? 0 },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createInitialSubscription(userId: string): Promise<UserSubscription> {
  const path = `user_subscriptions/${userId}`;
  const now = new Date().toISOString();

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (existing) {
      return {
        userId,
        tier: (existing.tier as SubscriptionTier) || SubscriptionTier.FREE,
        status: existing.status || 'ACTIVE',
        subscriptionExpiry: existing.subscription_expiry ?? null,
        usageCount: { vision: existing.usage_vision ?? 0, audit: existing.usage_audit ?? 0 },
        createdAt: existing.created_at || now,
        updatedAt: existing.updated_at || now,
      };
    }

    const subData = {
      user_id: userId,
      tier: 'FREE',
      status: 'ACTIVE',
      usage_vision: 0,
      usage_audit: 0,
    };

    const { error: insertErr } = await supabase.from('user_subscriptions').insert(subData);
    if (insertErr) throw insertErr;

    return {
      userId,
      tier: SubscriptionTier.FREE,
      status: 'ACTIVE',
      subscriptionExpiry: null,
      usageCount: { vision: 0, audit: 0 },
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserSubscription(userId: string, callback: (sub: UserSubscription) => void): () => void {
  try {
    const channel = supabase
      .channel(`subscription:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` },
        (payload) => {
          const data = payload.new as Record<string, unknown>;
          callback({
            userId,
            tier: (data.tier as SubscriptionTier) || SubscriptionTier.FREE,
            status: (data.status as string) || 'ACTIVE',
            subscriptionExpiry: (data.subscription_expiry as number) ?? null,
            usageCount: { vision: (data.usage_vision as number) ?? 0, audit: (data.usage_audit as number) ?? 0 },
            createdAt: data.created_at as string,
            updatedAt: data.updated_at as string,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_subscriptions/${userId}`);
  }
}

// ==========================================
// Composite User Helper (combines Profile + Subscription)
// ==========================================

export async function getOrCreateAuthoritativeUser(sbUser: SupabaseUser): Promise<User> {
  let profile = await getUserProfile(sbUser.id);
  if (!profile) {
    profile = await createInitialUserProfile(sbUser);
  }

  let sub = await getUserSubscription(sbUser.id);
  if (!sub) {
    sub = await createInitialSubscription(sbUser.id);
  }

  return {
    id: sbUser.id,
    userId: sbUser.id,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email,
    balance: profile.balance,
    tier: sub.tier,
    subscriptionExpiry: sub.subscriptionExpiry || undefined,
    usageCount: sub.usageCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const getOrCreateUserProfile = getOrCreateAuthoritativeUser;

// ==========================================
// Trade Operations (trades table)
// ==========================================

export async function saveTradeToFirestore(userId: string, trade: Trade): Promise<void> {
  const path = `trades/${trade.id}`;
  try {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      user_id: userId,
      trade_id: trade.id,
      pair: trade.pair,
      type: trade.type,
      entry_price: trade.entryPrice,
      lot_size: trade.lotSize,
      pnl: trade.pnl,
      status: trade.status,
      session: trade.session,
      timestamp: trade.timestamp,
      created_at: now,
      updated_at: now,
    };

    if (trade.exitPrice !== undefined && trade.exitPrice !== null) payload.exit_price = trade.exitPrice;
    if (trade.notes !== undefined && trade.notes !== null) payload.notes = trade.notes;
    if (trade.riskPercent !== undefined && trade.riskPercent !== null) payload.risk_percent = trade.riskPercent;
    if (trade.aiFeedback !== undefined && trade.aiFeedback !== null) payload.ai_feedback = trade.aiFeedback;
    if (trade.isAnalyzing !== undefined && trade.isAnalyzing !== null) payload.is_analyzing = trade.isAnalyzing;

    const { error } = await supabase.from('trades').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTradeFromFirestore(userId: string, tradeId: string): Promise<void> {
  const path = `trades/${tradeId}`;
  try {
    const { error } = await supabase.from('trades').delete().eq('user_id', userId).eq('trade_id', tradeId);
    if (error) throw error;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserTrades(userId: string, callback: (trades: Trade[]) => void): () => void {
  try {
    // Initial fetch
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) callback(data.map(rowToTrade));
      });

    const channel = supabase
      .channel(`trades:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` },
        () => {
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .then(({ data, error }) => {
              if (!error && data) callback(data.map(rowToTrade));
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `trades/${userId}`);
  }
}

function rowToTrade(row: Record<string, unknown>): Trade {
  return {
    id: (row.trade_id as string) || (row.id as string),
    userId: row.user_id as string,
    pair: row.pair as string,
    type: row.type as Trade['type'],
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price !== null && row.exit_price !== undefined ? Number(row.exit_price) : undefined,
    lotSize: Number(row.lot_size),
    pnl: Number(row.pnl),
    status: row.status as Trade['status'],
    session: row.session as Trade['session'],
    timestamp: Number(row.timestamp),
    notes: (row.notes as string) || undefined,
    riskPercent: row.risk_percent !== null && row.risk_percent !== undefined ? Number(row.risk_percent) : undefined,
    aiFeedback: (row.ai_feedback as string) || undefined,
    isAnalyzing: (row.is_analyzing as boolean) || false,
  } as Trade;
}

// ==========================================
// User Goals Operations (user_goals table)
// ==========================================

export async function getUserGoals(userId: string): Promise<UserGoals | null> {
  const path = `user_goals/${userId}`;
  try {
    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      monthlyProfitTarget: Number(data.monthly_profit_target),
      winRateTarget: Number(data.win_rate_target),
      tradesPerMonthTarget: Number(data.trades_per_month_target),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveGoalsToFirestore(userId: string, goals: UserGoals): Promise<void> {
  const path = `user_goals/${userId}`;
  try {
    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      monthly_profit_target: goals.monthlyProfitTarget,
      win_rate_target: goals.winRateTarget,
      trades_per_month_target: goals.tradesPerMonthTarget,
      updated_at: now,
    };

    const { error } = await supabase.from('user_goals').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserGoals(userId: string, callback: (goals: UserGoals) => void): () => void {
  try {
    // Initial fetch
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          callback({
            monthlyProfitTarget: Number(data.monthly_profit_target),
            winRateTarget: Number(data.win_rate_target),
            tradesPerMonthTarget: Number(data.trades_per_month_target),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      });

    const channel = supabase
      .channel(`goals:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_goals', filter: `user_id=eq.${userId}` },
        (payload) => {
          const data = payload.new as Record<string, unknown>;
          callback({
            monthlyProfitTarget: Number(data.monthly_profit_target),
            winRateTarget: Number(data.win_rate_target),
            tradesPerMonthTarget: Number(data.trades_per_month_target),
            createdAt: data.created_at as string,
            updatedAt: data.updated_at as string,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_goals/${userId}`);
  }
}
