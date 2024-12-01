// /api/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
};

const app = !getApps().length ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };