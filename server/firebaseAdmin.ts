/**
 * Firebase Admin SDK — server-side privileged access to Firestore.
 * Used for writing subscription tier changes after verified payments.
 * The client SDK cannot modify tier/subscriptionExpiry (blocked by Firestore rules).
 */
import { initializeApp, getApp, getApps, cert, type App } from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  const projectId = firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = initializeApp({ projectId });
  }

  return app;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}
