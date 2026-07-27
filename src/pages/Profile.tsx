/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Save,
  Key,
  Loader
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateEmail } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { language } = useApp();
  const { user, profile } = useAuth();
  const t = translations[language];
  const navigate = useNavigate();

  // Email state
  const [newEmail, setNewEmail] = useState(profile?.email || user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  
  const [error, setError] = useState('');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailSuccess('');

    if (!newEmail || !emailPassword) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoadingEmail(true);

    try {
      if (auth.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, emailPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, newEmail);
        
        // Update Firestore profile
        if (profile?.uid) {
          await updateDoc(doc(db, 'users', profile.uid), {
            email: newEmail
          });
        }

        setEmailSuccess(language === 'ar' ? 'تم تحديث البريد الإلكتروني بنجاح!' : 'Email updated successfully!');
        setEmailPassword('');
        
        setTimeout(() => setEmailSuccess(''), 3000);
      }
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError(language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError(language === 'ar' ? 'يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى' : 'Please log out and log in again');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(language === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email already in use');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تحديث البريد الإلكتروني' : 'Error updating email'));
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPassSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError(language === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(language === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'Passwords do not match');
      return;
    }

    setLoadingPass(true);

    try {
      if (auth.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      }

      setPassSuccess(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setPassSuccess(''), 3000);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError(language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError(language === 'ar' ? 'يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى' : 'Please log out and log in again');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div className="w-14 h-14 bg-yazal-navy/10 dark:bg-white/10 rounded-2xl flex items-center justify-center text-yazal-navy dark:text-white">
          <User size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
            {language === 'ar' ? 'ملفي الشخصي' : 'My Profile'}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {language === 'ar' ? 'بيانات الحساب وتعديل الإعدادات الشخصية' : 'Account details and personal settings'}
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

      {emailSuccess && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={20} />
          <span className="font-bold text-sm">{emailSuccess}</span>
        </motion.div>
      )}

      {passSuccess && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={20} />
          <span className="font-bold text-sm">{passSuccess}</span>
        </motion.div>
      )}

      {/* User Info Card - Read Only Name */}
      <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-yazal-cyan/10 rounded-2xl flex items-center justify-center text-yazal-cyan">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
              {language === 'ar' ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {language === 'ar' ? 'الاسم ثابت ولا يمكن تغييره لتتبع المهام والحسابات' : 'Name is fixed for task and account tracking'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
              {language === 'ar' ? 'اسم الموظف (ثابت)' : 'Employee Name (Fixed)'}
            </label>
            <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yazal-navy text-yazal-cyan flex items-center justify-center font-black text-sm shrink-0">
                {(profile?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="font-black text-yazal-navy dark:text-white text-base">
                {profile?.username || '---'}
              </span>
              <div className="mr-auto px-3 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                {language === 'ar' ? 'قراءة فقط' : 'Read Only'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
              {language === 'ar' ? 'الدور الوظيفي' : 'Role'}
            </label>
            <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yazal-cyan/10 text-yazal-cyan flex items-center justify-center font-black text-sm shrink-0">
                <ShieldCheck size={18} />
              </div>
              <span className="font-black text-yazal-navy dark:text-white text-base">
                {profile?.role === 'admin' ? (language === 'ar' ? 'مدير النظام' : 'System Admin') :
                 profile?.role === 'accountant' ? (language === 'ar' ? 'محاسب' : 'Accountant') :
                 profile?.role === 'agent' ? (language === 'ar' ? 'مندوب' : 'Agent') :
                 (language === 'ar' ? 'موظف' : 'Staff')}
              </span>
            </div>
          </div>
        </div>

        {profile?.permissions && profile.permissions.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-yazal-navy-dark/50 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              {language === 'ar' ? 'الصلاحيات الممنوحة' : 'Granted Permissions'}
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.permissions.map(perm => (
                <span key={perm} className="px-2.5 py-1 bg-yazal-cyan/10 text-yazal-cyan rounded-lg text-[9px] font-bold">
                  {perm === 'admin' ? (language === 'ar' ? 'مدير كامل' : 'Full Admin') :
                   perm === 'view_tasks' ? (language === 'ar' ? 'عرض المهام' : 'View Tasks') :
                   perm === 'create_task' ? (language === 'ar' ? 'إنشاء مهام' : 'Create Tasks') :
                   perm === 'edit_task' ? (language === 'ar' ? 'تعديل المهام' : 'Edit Tasks') :
                   perm === 'delete_task' ? (language === 'ar' ? 'حذف المهام' : 'Delete Tasks') :
                   perm === 'view_ledger' ? (language === 'ar' ? 'عرض السجل المالي' : 'View Ledger') :
                   perm === 'add_expense' ? (language === 'ar' ? 'إضافة مصروفات' : 'Add Expenses') :
                   perm === 'manage_users' ? (language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users') :
                   perm === 'view_dashboard' ? (language === 'ar' ? 'لوحة التحكم' : 'Dashboard') :
                   perm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Email Section */}
      <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
            <Mail size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
              {language === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change Email'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {language === 'ar' ? 'تحديث البريد الإلكتروني المستخدم لتسجيل الدخول' : 'Update login email address'}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'ar' ? 'البريد الإلكتروني الجديد' : 'New Email'}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'ar' ? 'كلمة المرور الحالية (للتأكيد)' : 'Current Password (for verification)'}
            </label>
            <div className="relative">
              <input
                type={showEmailPassword ? 'text' : 'password'}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowEmailPassword(!showEmailPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                {showEmailPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loadingEmail || !newEmail || !emailPassword}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
          >
            {loadingEmail ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                {language === 'ar' ? 'تحديث البريد الإلكتروني' : 'Update Email'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
            <Key size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {language === 'ar' ? 'تأمين حسابك بكلمة مرور جديدة قوية' : 'Secure your account with a new strong password'}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yazal-navy dark:hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loadingPass || !currentPassword || !newPassword || !confirmPassword}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3"
          >
            {loadingPass ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} />
                {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;

