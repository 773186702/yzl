/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { initMessaging } from '../lib/firebase-messaging';
import { requestNotificationPermission } from '../lib/firebase';

// سياق المصادقة (Auth Context)
// Manages Firebase Auth state and user profile from Firestore

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  hasPermission: () => false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // جلب الجلسة المحفوظة مؤقتاً في حال استثناء المصادقة
  useEffect(() => {
    const checkSavedSession = async () => {
      if (typeof window === 'undefined') return;

      const savedUserJson = localStorage.getItem('yazal_fallback_user');
      if (savedUserJson) {
        try {
          const parsed = JSON.parse(savedUserJson);
          setUser({ uid: parsed.uid, email: parsed.email } as any);
          setProfile(parsed);
        } catch (e) {
          console.error('Error parsing fallback user:', e);
        }
      }
      setLoading(false);
    };

    // الاستماع لتغييرات حالة المصادقة مع Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // تهيئة الإشعارات
        initMessaging();
        
        // طلب الإذن للإشعارات تلقائياً بعد تسجيل الدخول
        setTimeout(async () => {
          try {
            await requestNotificationPermission();
          } catch (e) {
            console.warn('Auto notification permission request skipped:', e);
          }
        }, 3000);
        
        // جلب ملف تعريف المستخدم من Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            console.warn('ملف تعريف المستخدم غير موجود، سيتم استخدام الملف الافتراضي');
          }
        } catch (error) {
          console.error('خطأ في جلب ملف التعريف:', error);
        }
      } else {
        const savedUserJson = localStorage.getItem('yazal_fallback_user');
        if (savedUserJson) {
          try {
            const parsed = JSON.parse(savedUserJson);
            setUser({ uid: parsed.uid, email: parsed.email } as any);
            setProfile(parsed);
          } catch (e) {
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      
      setLoading(false);
    });

    checkSavedSession();
    return () => unsubscribe();
  }, []);

  // وظيفة تسجيل الخروج الشاملة
  const logout = async () => {
    localStorage.removeItem('yazal_fallback_user');
    setUser(null);
    setProfile(null);
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Signout error:', e);
    }
  };

  // وظيفة التحقق من الصلاحيات
  const hasPermission = (permission: string) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, hasPermission, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
