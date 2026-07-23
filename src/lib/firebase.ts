/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const firebaseJsonConfig = firebaseConfig as {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
};

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseJsonConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseJsonConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseJsonConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseJsonConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseJsonConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseJsonConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseJsonConfig.measurementId,
};

// تهيئة تطبيق Firebase
const app = initializeApp(resolvedFirebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseJsonConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// تهيئة خدمة الرسائل (Cloud Messaging)
export const messaging = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

/**
 * طلب الإذن وتوليد رمز الإشعارات (FCM Token)
 */
export const requestNotificationPermission = async () => {
  try {
    const msg = await messaging();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(msg, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'YOUR_PUBLIC_VAPID_KEY_HERE'
      });
      return token;
    }
  } catch (error) {
    console.error('Notification Permission Error:', error);
  }
  return null;
};

/**
 * دالة مساعدة لعرض إشعار متصفح محلي
 */
export const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
};

// التحقق من الاتصال بقاعدة البيانات عند البدء
// Validate connection to Firestore on boot as per skill requirements

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    const { getDoc } = await import('firebase/firestore');
    await getDoc(doc(db, 'test', 'connection'));
    console.log('Firebase Connection: OK');
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('could not be reached')) {
      console.warn("Firestore operating in offline or fallback mode.");
    } else {
      console.warn("Firestore initialization notice:", error?.message || error);
    }
  }
}

// Helper functions for Tasks and User synchronization
export const subscribeToTasks = (userId: string, callback: (tasks: any[]) => void) => {
  const q = query(collection(db, 'tasks'), where('assigned_to', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));
};

export const subscribeToAllTasks = (callback: (tasks: any[]) => void) => {
  const q = query(collection(db, 'tasks'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));
};

export const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'busy') => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      status,
      last_active: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
};

testConnection();

export default app;
