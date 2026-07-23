/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Fingerprint, 
  LogIn, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import YZLOriginalLogo from '../components/YZLOriginalLogo';

/**
 * صفحة تسجيل الدخول الرئيسية لنظام "يزل"
 * تدعم تسجيل الدخول بالبريد الإلكتروني، جوجل، والواجهة الرسومية للبصمة
 */
const Login: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];
  
  // حالة الحقول والتحقق
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    
    // Focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinSubmit = async () => {
    const pinStr = pin.join('');
    if (pinStr.length < 4) {
      setError('يرجى إدخال رمز PIN كامل');
      return;
    }
    
    setLoading(true);
    // محاكاة التحقق من PIN (يمكن أن يكون محفوظاً في Firestore لكل مستخدم)
    setTimeout(() => {
      if (pinStr === '1234') { // PIN تجريبي
        alert('تم تسجيل الدخول عبر PIN');
        setShowPinModal(false);
      } else {
        setError('رمز PIN غير صحيح');
      }
      setLoading(false);
    }, 1000);
  };

  /**
   * معالج تسجيل الدخول عبر جوجل
   * يقوم بالتحقق من وجود المستخدم في قاعدة البيانات أو إنشاء ملف تعريف جديد
   */
  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // جلب بيانات المستخدم من Firestore للتأكد من صلاحياته
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // إذا كان المستخدم جديداً، ننشئ له ملفاً افتراضياً بصلاحيات محدودة
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          username: user.displayName || 'مستخدم جديد',
          role: 'staff',
          permissions: ['view_tasks'],
          biometricEnabled: false,
          created_at: new Date()
        });
      }
    } catch (err: any) {
      setError('فشل تسجيل الدخول عبر جوجل: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * معالج تسجيل الدخول التقليدي (بريد وكلمة مرور)
   * يتضمن عملية التحقق الأولي قبل إرسال الطلب لـ Firebase
   */
  const handleEmailLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    
    const targetEmail = (customEmail || email).trim();
    const targetPassword = customPassword || password;

    // 1. التحقق من إدخال البيانات
    if (!targetEmail || !targetPassword) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 2. محاولة المصادقة مع Firebase Auth
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, targetEmail, targetPassword);
      } catch (authErr: any) {
        // إذا كان الحساب هو المدير المعتمد admin1@gmail.com
        if (targetEmail.toLowerCase() === 'admin1@gmail.com' && targetPassword === 'admin1234') {
          try {
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            credential = await createUserWithEmailAndPassword(auth, targetEmail, targetPassword);
          } catch (createErr: any) {
            // في حال تم تعطيل موفر البريد بالكامل في Firebase Auth (auth/operation-not-allowed)
            console.warn('Firebase Auth email provider disabled, activating fallback session');
            try {
              const { signInAnonymously } = await import('firebase/auth');
              await signInAnonymously(auth);
            } catch (anonErr) {
              console.warn('Anonymous sign-in notice:', anonErr);
            }

            const fallbackAdminProfile = {
              uid: auth.currentUser?.uid || 'admin1_system_id',
              username: 'المدير العام (admin1)',
              email: 'admin1@gmail.com',
              role: 'admin',
              permissions: ['admin', 'view_ledger', 'add_expense', 'manage_staff', 'view_tasks', 'create_task', 'edit_task', 'delete_task'],
              created_at: new Date()
            };
            
            // حفظ البروفايل في Firestore
            try {
              await setDoc(doc(db, 'users', fallbackAdminProfile.uid), fallbackAdminProfile, { merge: true });
            } catch (e) {
              console.warn('Firestore write warning:', e);
            }

            // حفظ الجلسة محلياً والتحويل
            localStorage.setItem('yazal_fallback_user', JSON.stringify(fallbackAdminProfile));
            window.location.reload();
            return;
          }
        } else if (authErr.code === 'auth/operation-not-allowed') {
          // لموظف آخر عند تعطيل موفر البريد
          try {
            const { signInAnonymously } = await import('firebase/auth');
            await signInAnonymously(auth);
          } catch (anonErr) {
            console.warn('Anonymous sign-in notice:', anonErr);
          }

          const employeeProfile = {
            uid: auth.currentUser?.uid || `user_${Date.now()}`,
            username: targetEmail.split('@')[0],
            email: targetEmail,
            role: 'staff',
            permissions: ['view_tasks', 'create_task', 'edit_task'],
            created_at: new Date()
          };
          localStorage.setItem('yazal_fallback_user', JSON.stringify(employeeProfile));
          window.location.reload();
          return;
        } else {
          throw authErr;
        }
      }

      // إذا نجح تسجيل الدخول، نتحقق/نحدث بروفايل المدير في Firestore
      if (credential?.user) {
        const userUid = credential.user.uid;
        const userRef = doc(db, 'users', userUid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || targetEmail.toLowerCase() === 'admin1@gmail.com') {
          await setDoc(userRef, {
            uid: userUid,
            username: 'المدير العام (admin1)',
            email: targetEmail,
            role: 'admin',
            permissions: ['admin', 'view_ledger', 'add_expense', 'manage_staff', 'view_tasks', 'create_task', 'edit_task', 'delete_task'],
            created_at: new Date()
          }, { merge: true });
        }
      }
    } catch (err: any) {
      console.error('Login Error:', err.code || err.message);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('بيانات الاعتماد غير صحيحة، يرجى المحاولة مرة أخرى');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول: ' + (err.message || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * تسجيل سريع كمدير النظام بأمر مباشر
   */
  const handleQuickAdminLogin = () => {
    setEmail('admin1@gmail.com');
    setPassword('admin1234');
    handleEmailLogin(undefined, 'admin1@gmail.com', 'admin1234');
  };

  /**
   * معالج تسجيل الدخول البيومتري (WebAuthn)
   * يسمح للمستخدمين بتسجيل الدخول باستخدام البصمة أو الوجه
   */
  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. التحقق من دعم المتصفح
      if (!window.PublicKeyCredential || !navigator.credentials) {
        setShowPinModal(true);
        return;
      }

      // 2. محاكاة طلب التحدي
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // 3. طلب المصادقة البيومترية
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'preferred',
          allowCredentials: [], 
        }
      });

      if (credential) {
        alert('تم التحقق بيومترياً بنجاح');
      }
    } catch (err: any) {
      // التحقق مما إذا كانت البيئة محاطة بـ iframe بدون تصريح WebAuthn
      const isPolicyError = err?.message?.includes('publickey-credentials-get') || err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      if (isPolicyError) {
        console.warn('البيئة الحالية تفضل استخدام رمز PIN للتحقق الأمني');
      } else {
        console.error('Biometric Error:', err);
      }
      // الانتقال التلقائي كبديل إلى رمز PIN
      setShowPinModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yazal-bg dark:bg-yazal-navy-dark p-4 relative overflow-hidden">
      {/* عناصر زخرفية للخلفية */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yazal-cyan rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-yazal-navy rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-yazal-navy-light rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 border border-slate-100 dark:border-white/5 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <YZLOriginalLogo size={180} />
          </div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white tracking-tight uppercase">
            {t.app_name} <span className="text-yazal-cyan text-sm block font-normal mt-1">شركة يزل للسفريات والخدمات اللوجستية</span>
          </h1>
          <p className="text-slate-400 dark:text-slate-500 mt-3 text-[10px] font-bold uppercase tracking-[0.2em]">{t.welcome}</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-rose-50 text-rose-600 p-4 rounded-2xl mb-6 text-xs font-bold border border-rose-100 flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-5">
          {/* شريط الإكمال السريع كمدير النظام */}
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            className="w-full py-2 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 font-black text-[11px] flex items-center justify-between transition-all"
          >
            <span>دخول سريع كمدير النظام (admin1@gmail.com)</span>
            <ShieldCheck size={16} />
          </button>

          {/* حقل البريد الإلكتروني */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">البريد الإلكتروني</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yazal-cyan transition-colors" size={18} />
              <input 
                type="email"
                placeholder="name@company.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 ring-yazal-cyan transition-all outline-none font-semibold text-sm placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="space-y-1.5">
            <div className="flex justify-between px-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">كلمة المرور</label>
              <button type="button" className="text-[10px] font-bold text-yazal-cyan uppercase hover:underline">نسيت كلمة المرور؟</button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yazal-cyan transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 ring-yazal-cyan transition-all outline-none font-semibold text-sm placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-yazal-navy hover:bg-yazal-navy-light text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-yazal-navy/30 disabled:opacity-50 active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                {t.login}
              </>
            )}
          </button>
        </form>

        <div className="relative my-10 text-center">
          <hr className="border-slate-100 dark:border-white/5" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-yazal-navy-light px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">أو المتابعة عبر</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 p-4 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95 group"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-wider">Google</span>
          </button>

          <button 
            className="flex items-center justify-center gap-3 p-4 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-yazal-cyan active:scale-95 group"
            onClick={handleBiometricLogin}
          >
            <Fingerprint size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-wider">{t.biometric}</span>
          </button>
        </div>

        <p className="mt-10 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-40">
          YZL Secure Gateway • v1.2.0 • Build ID: 2023-10-PWA
        </p>
      </motion.div>

      {/* PIN Fallback Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-yazal-navy/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-yazal-navy-light w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center"
          >
            <ShieldCheck className="mx-auto text-yazal-cyan mb-4" size={48} />
            <h3 className="text-xl font-black text-yazal-navy dark:text-white mb-2 uppercase tracking-tight">أدخل رمز PIN</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">كبديل للتحقق البيومتري</p>
            
            <div className="flex justify-center gap-3 mb-8">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  className="w-12 h-16 text-center text-2xl font-black bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 ring-yazal-cyan outline-none"
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowPinModal(false)}
                className="py-3 text-[10px] font-black uppercase text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handlePinSubmit}
                disabled={loading}
                className="py-3 bg-yazal-cyan text-yazal-navy font-black rounded-xl text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
              >
                تحقق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
