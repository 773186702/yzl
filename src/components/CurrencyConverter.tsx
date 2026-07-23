/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Edit3, 
  Check, 
  X, 
  Sparkles,
  ShieldAlert,
  Coins
} from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';

export interface ExchangeRates {
  USD_TO_YER: number;
  SAR_TO_YER: number;
  USD_TO_SAR: number;
  updated_at?: any;
  updated_by?: string;
}

const DEFAULT_RATES: ExchangeRates = {
  USD_TO_YER: 1620,
  SAR_TO_YER: 425,
  USD_TO_SAR: 3.75,
};

export const CurrencyConverter: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];

  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'SAR' | 'YER'>('USD');
  const [toCurrency, setToCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  
  // Rate edit modal / mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editUsdYer, setEditUsdYer] = useState<number>(DEFAULT_RATES.USD_TO_YER);
  const [editSarYer, setEditSarYer] = useState<number>(DEFAULT_RATES.SAR_TO_YER);
  const [editUsdSar, setEditUsdSar] = useState<number>(DEFAULT_RATES.USD_TO_SAR);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real-time Firestore sync for Exchange Rates
  useEffect(() => {
    const rateDocRef = doc(db, 'settings', 'exchange_rates');
    const unsub = onSnapshot(rateDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ExchangeRates;
        setRates(data);
        setEditUsdYer(data.USD_TO_YER || DEFAULT_RATES.USD_TO_YER);
        setEditSarYer(data.SAR_TO_YER || DEFAULT_RATES.SAR_TO_YER);
        setEditUsdSar(data.USD_TO_SAR || DEFAULT_RATES.USD_TO_SAR);
      } else {
        // Initialize default document in Firestore if absent
        setDoc(rateDocRef, {
          ...DEFAULT_RATES,
          updated_at: serverTimestamp(),
          updated_by: 'System'
        }).catch(err => console.error("Error setting default rates:", err));
      }
    }, (error) => {
      console.warn("Firestore rates subscription error, fallback to defaults:", error);
    });

    return () => unsub();
  }, []);

  // Conversion Calculation Logic
  const convertedAmount = useMemo(() => {
    if (isNaN(amount) || amount <= 0) return 0;
    if (fromCurrency === toCurrency) return amount;

    // Convert everything to base YER first, then to target currency
    let amountInYer = 0;
    if (fromCurrency === 'YER') {
      amountInYer = amount;
    } else if (fromCurrency === 'USD') {
      amountInYer = amount * rates.USD_TO_YER;
    } else if (fromCurrency === 'SAR') {
      amountInYer = amount * rates.SAR_TO_YER;
    }

    if (toCurrency === 'YER') {
      return amountInYer;
    } else if (toCurrency === 'USD') {
      return amountInYer / rates.USD_TO_YER;
    } else if (toCurrency === 'SAR') {
      return amountInYer / rates.SAR_TO_YER;
    }

    return 0;
  }, [amount, fromCurrency, toCurrency, rates]);

  // Quick Currency Swap
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Save new rates to Firestore for instant all-staff broadcast
  const handleSaveRates = async () => {
    setIsSaving(true);
    try {
      const rateDocRef = doc(db, 'settings', 'exchange_rates');
      const updatedData: ExchangeRates = {
        USD_TO_YER: Number(editUsdYer),
        SAR_TO_YER: Number(editSarYer),
        USD_TO_SAR: Number(editUsdSar),
        updated_at: serverTimestamp(),
        updated_by: 'Staff Member'
      };

      await setDoc(rateDocRef, updatedData);
      logActivity('تحديث أسعار الصرف', `تم تحديث أسعار الصرف: 1$ = ${editUsdYer} YER, 1 SAR = ${editSarYer} YER`);
      
      setSuccessMsg(language === 'ar' ? 'تم تحديث أسعار الصرف ومزامنتها لحظياً لجميع الموظفين!' : 'Exchange rates updated and synced live across all staff!');
      setTimeout(() => setSuccessMsg(null), 3500);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating exchange rates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currencyLabels = {
    YER: { name: language === 'ar' ? 'ريال يمني' : 'Yemeni Rial', symbol: 'YER', color: 'text-amber-500' },
    SAR: { name: language === 'ar' ? 'ريال سعودي' : 'Saudi Rial', symbol: 'SAR', color: 'text-emerald-500' },
    USD: { name: language === 'ar' ? 'دولار أمريكي' : 'US Dollar', symbol: 'USD', color: 'text-yazal-cyan' },
  };

  return (
    <div className="bg-white dark:bg-yazal-navy-light rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yazal-cyan/10 rounded-2xl flex items-center justify-center text-yazal-cyan shadow-md">
            <Coins size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-2">
              {t.currency_converter}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.converter_subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-yazal-cyan/10 hover:text-yazal-cyan text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider transition-all self-start sm:self-auto"
        >
          <Edit3 size={16} />
          {isEditing ? t.cancel_edit : t.update_exchange_rates}
        </button>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-xs p-4 rounded-2xl flex items-center gap-3"
          >
            <Check size={18} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rate Edit Form Panel */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-50 dark:bg-yazal-navy-dark/60 p-6 rounded-2xl border border-yazal-cyan/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-yazal-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-yazal-cyan" />
                {language === 'ar' ? 'تعديل أسعار الصرف الرسمية لشركة يزل للسفريات والخدمات اللوجستية' : 'Edit Official YZL Exchange Rates'}
              </h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {language === 'ar' ? 'مزامنة فورية لكل الموظفين' : 'Live Multi-User Broadcast'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  1 USD = YER
                </label>
                <input
                  type="number"
                  value={editUsdYer}
                  onChange={(e) => setEditUsdYer(Number(e.target.value))}
                  className="w-full bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-black text-sm text-yazal-navy dark:text-white outline-none focus:ring-2 ring-yazal-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  1 SAR = YER
                </label>
                <input
                  type="number"
                  value={editSarYer}
                  onChange={(e) => setEditSarYer(Number(e.target.value))}
                  className="w-full bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-black text-sm text-yazal-navy dark:text-white outline-none focus:ring-2 ring-yazal-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  1 USD = SAR
                </label>
                <input
                  type="number"
                  value={editUsdSar}
                  onChange={(e) => setEditUsdSar(Number(e.target.value))}
                  className="w-full bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-black text-sm text-yazal-navy dark:text-white outline-none focus:ring-2 ring-yazal-cyan"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveRates}
                disabled={isSaving}
                className="px-6 py-2.5 bg-yazal-cyan hover:bg-yazal-cyan-dark text-yazal-navy font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-yazal-cyan/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.save_rates}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Converter Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* From Amount Input */}
        <div className="md:col-span-5 bg-slate-50 dark:bg-yazal-navy-dark/40 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.converted_amount}</span>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as any)}
              className="bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1 text-xs font-black text-yazal-navy dark:text-white outline-none focus:ring-2 ring-yazal-cyan cursor-pointer"
            >
              <option value="USD">USD - {language === 'ar' ? 'دولار أمريكي' : 'US Dollar'}</option>
              <option value="SAR">SAR - {language === 'ar' ? 'ريال سعودي' : 'Saudi Rial'}</option>
              <option value="YER">YER - {language === 'ar' ? 'ريال يمني' : 'Yemeni Rial'}</option>
            </select>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={t.enter_amount}
              className="w-full bg-transparent text-3xl font-black text-yazal-navy dark:text-white outline-none"
            />
            <span className={`text-sm font-black uppercase ${currencyLabels[fromCurrency].color}`}>
              {fromCurrency}
            </span>
          </div>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-2 flex justify-center">
          <button
            onClick={handleSwap}
            className="w-12 h-12 rounded-2xl bg-yazal-navy dark:bg-yazal-navy-light text-yazal-cyan hover:bg-yazal-cyan hover:text-yazal-navy transition-all shadow-lg flex items-center justify-center group active:scale-95"
            title={t.swap_currencies}
          >
            <ArrowRightLeft size={20} className="group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To Amount Result */}
        <div className="md:col-span-5 bg-yazal-cyan/5 dark:bg-yazal-cyan/10 p-5 rounded-2xl border border-yazal-cyan/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-yazal-cyan uppercase tracking-widest">{t.converted_result}</span>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as any)}
              className="bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1 text-xs font-black text-yazal-navy dark:text-white outline-none focus:ring-2 ring-yazal-cyan cursor-pointer"
            >
              <option value="YER">YER - {language === 'ar' ? 'ريال يمني' : 'Yemeni Rial'}</option>
              <option value="SAR">SAR - {language === 'ar' ? 'ريال سعودي' : 'Saudi Rial'}</option>
              <option value="USD">USD - {language === 'ar' ? 'دولار أمريكي' : 'US Dollar'}</option>
            </select>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-yazal-navy dark:text-white tracking-tight">
              {convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-black uppercase ${currencyLabels[toCurrency].color}`}>
              {toCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* Live Exchange Rates Ticker Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
        <div className="bg-slate-50 dark:bg-yazal-navy-dark/30 p-3 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">1 USD =</span>
          <span className="text-xs font-black text-yazal-navy dark:text-white">{rates.USD_TO_YER.toLocaleString()} YER</span>
        </div>

        <div className="bg-slate-50 dark:bg-yazal-navy-dark/30 p-3 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">1 SAR =</span>
          <span className="text-xs font-black text-yazal-navy dark:text-white">{rates.SAR_TO_YER.toLocaleString()} YER</span>
        </div>

        <div className="bg-slate-50 dark:bg-yazal-navy-dark/30 p-3 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">1 USD =</span>
          <span className="text-xs font-black text-yazal-navy dark:text-white">{rates.USD_TO_SAR} SAR</span>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;
