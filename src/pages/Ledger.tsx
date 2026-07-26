/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus, 
  FileDown, 
  FileCheck,
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  BarChart as BarIcon, 
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { CurrencyConverter } from '../components/CurrencyConverter';
import { logActivity } from '../lib/audit';
import { exportFinancialReportPDF, exportCompletedTasksArabicPDF } from '../lib/pdfExporter';

import { collection, query, where, getDocs, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Account, LedgerTransaction, Task } from '../types';

// Memoized Account Card Component
const AccountCard: React.FC<{
  acc: Account;
  currency: string;
  index: number;
}> = React.memo(({ acc, currency, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-yazal-cyan/5 rounded-full blur-2xl group-hover:bg-yazal-cyan/10 transition-colors" />
      <div className="flex justify-between items-start mb-6">
        <div className={`w-12 h-12 rounded-2xl ${acc.color} text-white shadow-lg flex items-center justify-center`}>
          <Wallet size={24} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${
          acc.trend.startsWith('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
        }`}>
          {acc.trend.startsWith('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {acc.trend}
        </div>
      </div>
      <h4 className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-1">{acc.name}</h4>
      <p className="text-3xl font-black text-yazal-navy dark:text-white tracking-tight">
        {acc.balance.toLocaleString()} 
        <span className="text-sm font-bold text-yazal-cyan ml-2">{currency}</span>
      </p>
    </motion.div>
  );
});

AccountCard.displayName = 'AccountCard';

// Memoized Transaction Item Row Component
const TransactionItemRow: React.FC<{
  tx: LedgerTransaction;
  currency: string;
}> = React.memo(({ tx, currency }) => {
  const formattedDate = useMemo(() => {
    if (tx.date instanceof Object && 'toDate' in tx.date) {
      return tx.date.toDate().toLocaleDateString();
    }
    return String(tx.date);
  }, [tx.date]);

  return (
    <div className="p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
      <div className="flex items-center gap-6">
        <div className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
          tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
        }`}>
          {tx.type === 'income' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
        </div>
        <div>
          <h5 className="font-black text-yazal-navy dark:text-white uppercase tracking-tight mb-1">{tx.title}</h5>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-yazal-navy-dark rounded-md text-slate-500 font-bold uppercase tracking-widest">{tx.account}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formattedDate}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currency}</span>
      </div>
    </div>
  );
});

TransactionItemRow.displayName = 'TransactionItemRow';

const Ledger: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  // Memoized Chart Data
  const chartData = useMemo(() => [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
  ], []);

  useEffect(() => {
    // Firestore real-time listeners
    const accountsQuery = query(collection(db, 'accounts'));
    const transactionsQuery = query(collection(db, 'ledger_transactions'), orderBy('date', 'desc'), limit(10));

    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(accountsList);
      if (loading) setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerTransaction));
      setTransactions(transactionsList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ledger_transactions'));

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, []);

  // Memoized Accounts & Transactions display state
  const displayedAccounts = useMemo(() => {
    if (accounts.length > 0) return accounts;
    return [
      { id: '1', name: 'نقد (كاش)', balance: 1200000, color: 'bg-emerald-500', trend: '+12%', currency: 'YER' as const, last_updated: new Date() },
      { id: '2', name: 'ون كاش One Cash', balance: 45000, color: 'bg-yazal-cyan', trend: '+5%', currency: 'YER' as const, last_updated: new Date() },
      { id: '3', name: 'كريمي جوال', balance: 320000, color: 'bg-yazal-navy', trend: '-2%', currency: 'YER' as const, last_updated: new Date() },
    ];
  }, [accounts]);

  const displayedTransactions = useMemo(() => {
    if (transactions.length > 0) return transactions;
    return [
      { id: '1', type: 'income' as const, title: 'تأشيرة عمل - أحمد محمد', amount: 45000, date: '2023-10-20', account: 'كريمي', currency: 'YER' as const, created_by: 'system' },
      { id: '2', type: 'expense' as const, title: 'إيجار المكتب', amount: 150000, date: '2023-10-18', account: 'كاش', currency: 'YER' as const, created_by: 'system' },
      { id: '3', type: 'income' as const, title: 'تجديد جواز - فاطمة علي', amount: 12000, date: '2023-10-15', account: 'ون كاش', currency: 'YER' as const, created_by: 'system' },
    ];
  }, [transactions]);

  // PDF Export for Financial Ledger Report
  const exportToPDF = useCallback(async () => {
    const accData = displayedAccounts.map(acc => ({
      name: acc.name,
      balance: acc.balance,
      currency: acc.currency,
      trend: acc.trend
    }));
    
    const txData = displayedTransactions.map(tx => ({
      date: tx.date instanceof Object && 'toDate' in tx.date ? tx.date.toDate().toLocaleDateString() : String(tx.date),
      title: tx.title,
      account: tx.account,
      amount: tx.amount,
      type: tx.type,
      currency: tx.currency
    }));

    await exportFinancialReportPDF(accData, txData);
    logActivity('تصدير PDF المالي', 'قام المستخدم بتصدير تقرير مالي مفصل بصيغة PDF');
  }, [displayedAccounts, displayedTransactions]);

  // PDF Export for Completed Tasks Report
  const exportCompletedTasksPDF = useCallback(async () => {
    let completedTasksList: any[] = [];
    try {
      const q = query(collection(db, 'tasks'), where('status', '==', 'completed'));
      const snap = await getDocs(q);
      completedTasksList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // Fallback sample data if empty or offline
      completedTasksList = [
        { service_id: 'حجز تذكرة الطيران إلى القاهرة', client_id: 'أحمد علي العولقي', total_price: 240000, assigned_to: 'محمد خالد', updated_at: '2023-10-22' },
        { service_id: 'تجديد جواز سفر دبلوماسي', client_id: 'سارة عبد الله', total_price: 85000, assigned_to: 'ليث هطام', updated_at: '2023-10-20' },
        { service_id: 'تأشيرة عمل دولة الإمارات', client_id: 'عمر القاسمي', total_price: 450000, assigned_to: 'محمد خالد', updated_at: '2023-10-18' },
      ];
    }

    if (completedTasksList.length === 0) {
      completedTasksList = [
        { service_id: 'حجز تذكرة الطيران إلى القاهرة', client_id: 'أحمد علي العولقي', total_price: 240000, assigned_to: 'محمد خالد', updated_at: '2023-10-22' },
        { service_id: 'تجديد جواز سفر دبلوماسي', client_id: 'سارة عبد الله', total_price: 85000, assigned_to: 'ليث هطام', updated_at: '2023-10-20' },
      ];
    }

    const taskData = completedTasksList.map(t => ({
      clientName: t.client_name || t.client_id || 'غير معروف',
      serviceName: t.service_name || t.service_id || 'خدمة',
      assignedTo: t.assigned_to || 'السيستم',
      amount: t.total_price || 0,
      date: t.updated_at instanceof Object && 'toDate' in t.updated_at ? t.updated_at.toDate().toLocaleDateString() : String(t.updated_at || new Date().toLocaleDateString())
    }));

    await exportCompletedTasksArabicPDF(taskData);
    logActivity('تصدير تقرير المهام المكتملة', 'قام المستخدم بتصدير تقرير رسمي بالمهام المكتملة بصيغة PDF');
  }, []);

  // التحقق من صلاحية view_ledger
  if (!hasPermission('view_ledger')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية الوصول إلى السجل المالي</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "عرض السجل المالي" لحسابك</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" count={3} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Page Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">{t.ledger_title}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{t.ledger_subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportCompletedTasksPDF}
            className="flex items-center gap-2 bg-yazal-cyan hover:bg-yazal-cyan-dark text-yazal-navy font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-yazal-cyan/20 transition-all active:scale-95"
            title={t.download_report}
          >
            <FileCheck size={18} />
            {t.download_report}
          </button>

          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-white dark:bg-yazal-navy-light text-yazal-navy dark:text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 dark:border-white/5 shadow-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            <FileDown size={18} className="text-yazal-cyan" />
            {t.export_pdf}
          </button>

          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
            {['YER', 'SAR', 'USD'].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr as any)}
                className={`px-5 py-3 rounded-xl font-black text-xs transition-all ${
                  currency === curr 
                    ? 'bg-yazal-navy text-white shadow-lg' 
                    : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayedAccounts.map((acc, index) => (
          <AccountCard
            key={acc.id}
            acc={acc}
            currency={currency}
            index={index}
          />
        ))}
      </div>

      {/* Live Currency Converter Component */}
      <CurrencyConverter />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
              <BarIcon size={20} className="text-yazal-cyan" />
              تحليل التدفق النقدي
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yazal-cyan" /> الإيرادات
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yazal-navy" /> المصاريف
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Bar dataKey="income" fill="#00AEEF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#0F2B48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
          <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3 mb-8">
            <PieIcon size={20} className="text-yazal-cyan" />
            التوازن المالي
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="income" stroke="#00AEEF" fillOpacity={1} fill="url(#colorIncome)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Growth</span>
                <span className="text-3xl font-black text-emerald-500">+24%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">صافي الربح</span>
              <span className="text-xl font-black text-emerald-500">+85,000</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">المصاريف الكلية</span>
              <span className="text-xl font-black text-rose-500">-12,400</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-yazal-cyan rounded-full" />
            <div>
              <h2 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">آخر المعاملات المالية</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">سجل التدفقات النقدية الواردة والصادرة</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-yazal-navy-dark p-2 rounded-2xl">
            <Calendar size={16} className="text-slate-400 ml-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-yazal-navy dark:text-white">سجل العمليات المعاينة</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/5">
          {displayedTransactions.map((tx) => (
            <TransactionItemRow
              key={tx.id}
              tx={tx}
              currency={currency}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ledger;
