/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Database,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';

const SystemReset: React.FC = () => {
  const { hasPermission } = useAuth();
  const { language } = useApp();
  const t = translations[language];

  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // التحقق من صلاحية مدير النظام
  if (!hasPermission('admin')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12 p-6">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية الوصول إلى هذه الصفحة</h2>
          <p className="text-white/60 font-bold text-sm">هذه الصفحة مخصصة لمدير النظام فقط</p>
        </div>
      </div>
    );
  }

  const expectedConfirmText = language === 'ar' ? 'تهيئة' : 'RESET';

  const handleReset = async () => {
    if (confirmText !== expectedConfirmText) {
      setResult({ success: false, message: language === 'ar' 
        ? `يرجى كتابة "${expectedConfirmText}" لتأكيد العملية` 
        : `Please type "${expectedConfirmText}" to confirm` 
      });
      return;
    }

    setIsResetting(true);
    setResult(null);

    try {
      // Collections to clear (safe list - preserves users, services, payment methods, currencies)
      const collectionsToClear = ['tasks', 'clients', 'expenses', 'notifications', 'ledger_transactions'];
      let totalDeleted = 0;

      for (const collectionName of collectionsToClear) {
        const snapshot = await getDocs(collection(db, collectionName));
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
        await Promise.all(deletePromises);
        totalDeleted += snapshot.docs.length;
      }

      await logActivity('تهيئة النظام', `تمت تهيئة النظام ومسح ${totalDeleted} سجل تجريبي`);
      
      setResult({ 
        success: true, 
        message: language === 'ar'
          ? `تم تهيئة النظام بنجاح! تم حذف ${totalDeleted} سجل تجريبي.`
          : `System reset successfully! Deleted ${totalDeleted} test records.`
      });
    } catch (err: any) {
      console.error('Reset error:', err);
      setResult({ 
        success: false, 
        message: language === 'ar'
          ? `حدث خطأ أثناء تهيئة النظام: ${err.message}`
          : `An error occurred while resetting: ${err.message}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
          <Database size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
            {t.system_reset_title}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {t.system_reset_subtitle}
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-8 rounded-[2.5rem] space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={32} className="text-rose-500 shrink-0" />
          <h2 className="text-xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">
            {t.system_reset_warning}
          </h2>
        </div>
        <p className="text-sm font-bold text-rose-600/80 dark:text-rose-400/80">
          {t.system_reset_desc}
        </p>
      </div>

      {/* What will be deleted */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
          <h3 className="text-sm font-black text-rose-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trash2 size={16} />
            {t.system_reset_what_will_be_deleted}
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              {t.system_reset_tasks}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              {t.system_reset_clients}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              {t.system_reset_expenses}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              {t.system_reset_notifications}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              {t.system_reset_ledger}
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
          <h3 className="text-sm font-black text-emerald-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck size={16} />
            {t.system_reset_safe}
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.system_reset_users}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.system_reset_services}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.system_reset_payment_methods}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.system_reset_currencies}
            </li>
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.system_reset_exchange_rates}
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Input */}
      <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
            {t.system_reset_confirm_hint}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t.type_confirm}
            className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border-2 border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-rose-500 focus:ring-2 ring-rose-500/20 text-center text-lg"
            dir="ltr"
          />
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting || confirmText !== expectedConfirmText}
          className="w-full py-5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-3"
        >
          {isResetting ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Trash2 size={20} />
              {t.reset_system}
            </>
          )}
        </button>
      </div>

      {/* Result Message */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-3xl border flex items-center gap-4 ${
            result.success
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          {result.success ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          <span className="font-bold text-sm">{result.message}</span>
        </motion.div>
      )}
    </div>
  );
};

export default SystemReset;

