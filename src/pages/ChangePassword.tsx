/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { useAuth } from '../context/AuthContext';

const ChangePassword: React.FC = () => {
  const { language } = useApp();
  const { user } = useAuth();
  const t = translations[language];
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // التحقق من البيانات
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError(language === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(language === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'New password and confirmation do not match');
      return;
    }

    setLoading(true);

    try {
      // إعادة المصادقة ثم تغيير كلمة المرور
      if (auth.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      }

      setSuccess(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
      
      setTimeout(() => {
        navigate('/settings');
      }, 2000);

    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError(language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError(language === 'ar' ? 'يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى لتغيير كلمة المرور' : 'Please log out and log in again to change password');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'An error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto pb-12 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
          <Key size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {language === 'ar' ? 'تأمين حسابك بكلمة مرور جديدة' : 'Secure your account with a new password'}
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 p-4 rounded-2xl flex items-center gap-3"
        >
          <AlertTriangle size={20} />
          <span className="font-bold text-sm">{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={20} />
          <span className="font-bold text-sm">{success}</span>
        </motion.div>
      )}

      {/* Change Password Form */}
      <form onSubmit={handleChangePassword} className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
        {/* Current Password */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
            {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 focus:ring-2 ring-amber-500/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
            {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 focus:ring-2 ring-amber-500/20"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1">
            {language === 'ar' ? 'يجب أن تكون 6 أحرف أو أكثر' : 'Must be 6 characters or more'}
          </p>
        </div>

        {/* Confirm New Password */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
            {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 focus:ring-2 ring-amber-500/20"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Key size={20} />
              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;

