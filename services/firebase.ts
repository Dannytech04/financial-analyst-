import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc, 
  updateDoc,
  getDoc, 
  collection, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Trade, UserGoals, User, UserSubscription, SubscriptionTier } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// ==========================================
// Authentication Helpers
// ==========================================

export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google login failed:", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  } catch (error) {
    console.error("Email login failed:", error);
    throw error;
  }
}

export async function registerWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const defaultDisplayName = email.trim().split('@')[0];
    try {
      await updateProfile(result.user, { displayName: defaultDisplayName });
    } catch {
      // Non-blocking if profile update fails
    }
    return result.user;
  } catch (error) {
    console.error("Email registration failed:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out failed:", error);
    throw error;
  }
}

// ==========================================
// User Profile Operations (/users/{uid})
// Authoritative Document: /users/{userId}
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
  const path = `users/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId,
        username: data.username || data.displayName || data.email?.split('@')[0] || 'TRADER',
        displayName: data.displayName || data.username || data.email?.split('@')[0] || 'TRADER',
        email: data.email || '',
        balance: typeof data.balance === 'number' ? data.balance : 100000,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createInitialUserProfile(fbUser: FirebaseUser): Promise<UserProfileDoc> {
  const path = `users/${fbUser.uid}`;
  const now = new Date().toISOString();
  const rawName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'TRADER').trim();
  const defaultName = rawName.slice(0, 100) || 'TRADER';
  const email = (fbUser.email || '').trim().slice(0, 200);

  try {
    const docRef = doc(db, 'users', fbUser.uid);
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        userId: fbUser.uid,
        username: data.username || defaultName,
        displayName: data.displayName || defaultName,
        email: data.email || email,
        balance: typeof data.balance === 'number' ? data.balance : 100000,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      };
    }

    const profileData: UserProfileDoc = {
      userId: fbUser.uid,
      username: defaultName,
      displayName: defaultName,
      email: email,
      balance: 100000,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, profileData);
    return profileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncUserProfile(userId: string, updates: Partial<UserProfileDoc>): Promise<void> {
  const path = `users/${userId}`;
  try {
    const allowedUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (updates.username !== undefined) allowedUpdates.username = updates.username;
    if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName;
    if (updates.email !== undefined) allowedUpdates.email = updates.email;

    await updateDoc(doc(db, 'users', userId), allowedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// User Subscription Operations (/users/{uid}/subscription/current)
// Authoritative Document: /users/{userId}/subscription/current
// ==========================================

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const path = `users/${userId}/subscription/current`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'subscription', 'current'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId,
        tier: (data.tier as SubscriptionTier) || SubscriptionTier.FREE,
        status: data.status || 'ACTIVE',
        subscriptionExpiry: data.subscriptionExpiry || null,
        usageCount: data.usageCount || { vision: 0, audit: 0 },
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createInitialSubscription(userId: string): Promise<UserSubscription> {
  const path = `users/${userId}/subscription/current`;
  const now = new Date().toISOString();

  try {
    const subDocRef = doc(db, 'users', userId, 'subscription', 'current');
    const existingSnap = await getDoc(subDocRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        userId,
        tier: (data.tier as SubscriptionTier) || SubscriptionTier.FREE,
        status: data.status || 'ACTIVE',
        subscriptionExpiry: data.subscriptionExpiry || null,
        usageCount: data.usageCount || { vision: 0, audit: 0 },
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      };
    }

    const subData: UserSubscription = {
      userId,
      tier: SubscriptionTier.FREE, // All new users default to FREE
      status: 'ACTIVE',
      subscriptionExpiry: null,
      usageCount: { vision: 0, audit: 0 },
      createdAt: now,
      updatedAt: now
    };

    await setDoc(subDocRef, subData);
    return subData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserSubscription(userId: string, callback: (sub: UserSubscription) => void): () => void {
  const path = `users/${userId}/subscription/current`;
  try {
    const subDocRef = doc(db, 'users', userId, 'subscription', 'current');
    return onSnapshot(subDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          userId,
          tier: (data.tier as SubscriptionTier) || SubscriptionTier.FREE,
          status: data.status || 'ACTIVE',
          subscriptionExpiry: data.subscriptionExpiry || null,
          usageCount: data.usageCount || { vision: 0, audit: 0 },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ==========================================
// Composite User Helper (combines Profile + Subscription)
// ==========================================

export async function getOrCreateAuthoritativeUser(fbUser: FirebaseUser): Promise<User> {
  let profile = await getUserProfile(fbUser.uid);
  if (!profile) {
    profile = await createInitialUserProfile(fbUser);
  }

  let sub = await getUserSubscription(fbUser.uid);
  if (!sub) {
    sub = await createInitialSubscription(fbUser.uid);
  }

  return {
    id: fbUser.uid,
    userId: fbUser.uid,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email,
    balance: profile.balance,
    tier: sub.tier,
    subscriptionExpiry: sub.subscriptionExpiry || undefined,
    usageCount: sub.usageCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

export const getOrCreateUserProfile = getOrCreateAuthoritativeUser;

// ==========================================
// Firestore Trade Operations (/users/{uid}/trades/{tradeId})
// Authoritative Document: /users/{userId}/trades/{tradeId}
// ==========================================

export async function saveTradeToFirestore(userId: string, trade: Trade): Promise<void> {
  const path = `users/${userId}/trades/${trade.id}`;
  try {
    const now = new Date().toISOString();
    const tradePayload: Record<string, any> = {
      userId,
      tradeId: trade.id,
      pair: trade.pair,
      type: trade.type,
      entryPrice: trade.entryPrice,
      lotSize: trade.lotSize,
      pnl: trade.pnl,
      status: trade.status,
      session: trade.session,
      timestamp: trade.timestamp,
      createdAt: now,
      updatedAt: now
    };

    if (trade.exitPrice !== undefined && trade.exitPrice !== null) {
      tradePayload.exitPrice = trade.exitPrice;
    }
    if (trade.notes !== undefined && trade.notes !== null) {
      tradePayload.notes = trade.notes;
    }
    if (trade.riskPercent !== undefined && trade.riskPercent !== null) {
      tradePayload.riskPercent = trade.riskPercent;
    }
    if (trade.aiFeedback !== undefined && trade.aiFeedback !== null) {
      tradePayload.aiFeedback = trade.aiFeedback;
    }
    if (trade.isAnalyzing !== undefined && trade.isAnalyzing !== null) {
      tradePayload.isAnalyzing = trade.isAnalyzing;
    }

    await setDoc(doc(db, 'users', userId, 'trades', trade.id), tradePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTradeFromFirestore(userId: string, tradeId: string): Promise<void> {
  const path = `users/${userId}/trades/${tradeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'trades', tradeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserTrades(userId: string, callback: (trades: Trade[]) => void): () => void {
  const path = `users/${userId}/trades`;
  try {
    const tradesRef = collection(db, 'users', userId, 'trades');
    const q = query(tradesRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tradesList: Trade[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          pair: data.pair,
          type: data.type,
          entryPrice: data.entryPrice,
          exitPrice: data.exitPrice,
          lotSize: data.lotSize,
          pnl: data.pnl,
          status: data.status,
          session: data.session,
          timestamp: data.timestamp,
          notes: data.notes,
          riskPercent: data.riskPercent,
          aiFeedback: data.aiFeedback,
          isAnalyzing: data.isAnalyzing
        } as Trade;
      });
      callback(tradesList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ==========================================
// Firestore User Goals Operations (/users/{uid}/goals/settings)
// Authoritative Document: /users/{userId}/goals/settings
// ==========================================

export async function getUserGoals(userId: string): Promise<UserGoals | null> {
  const path = `users/${userId}/goals/settings`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'goals', 'settings'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        monthlyProfitTarget: data.monthlyProfitTarget,
        winRateTarget: data.winRateTarget,
        tradesPerMonthTarget: data.tradesPerMonthTarget,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveGoalsToFirestore(userId: string, goals: UserGoals): Promise<void> {
  const path = `users/${userId}/goals/settings`;
  try {
    const now = new Date().toISOString();
    await setDoc(doc(db, 'users', userId, 'goals', 'settings'), {
      userId,
      monthlyProfitTarget: goals.monthlyProfitTarget,
      winRateTarget: goals.winRateTarget,
      tradesPerMonthTarget: goals.tradesPerMonthTarget,
      createdAt: goals.createdAt || now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserGoals(userId: string, callback: (goals: UserGoals) => void): () => void {
  const path = `users/${userId}/goals/settings`;
  try {
    const docRef = doc(db, 'users', userId, 'goals', 'settings');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          monthlyProfitTarget: data.monthlyProfitTarget,
          winRateTarget: data.winRateTarget,
          tradesPerMonthTarget: data.tradesPerMonthTarget,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
