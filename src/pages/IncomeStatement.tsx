/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const IncomeStatement: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalRevenue: 0, totalExpenses: 0, netIncome: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasks = tasksSnap.docs.map(d => d.data() as any);
        const totalRevenue = tasks.filter((t: any) => t.status === 'completed').reduce((s: number, t: any) => s + Number(t.paid_amount || 0), 0);

        const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
        const expensesList = expensesSnap.docs.map(d => d.data() as any);
        const totalExpenses = expensesList.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

        setData({ totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses });
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const chartData = [
    { name: T(t, 'total_revenue', 'الإيرادات'), value: data.totalRevenue },
    { name: T(t, 'total_expenses', 'المصروفات'), value: data.totalExpenses },
    { name: T(t, 'net_income', 'صافي الدخل'), value: data.netIncome >= 0 ? data.netIncome : 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
          <TrendingUp className="text-yazal-cyan" size={32} />{T(t, 'income_statement_title', 'قائمة الدخل')}
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'income_statement_subtitle', 'عرض قائمة الأرباح والخسائر')}</p>
      </div>

      {loading ? (
        <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-3xl shadow-lg">
              <TrendingUp size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'total_revenue', 'إجمالي الإيرادات')}</p>
              <p className="text-2xl font-black mt-1">{data.totalRevenue.toLocaleString()} YER</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 rounded-3xl shadow-lg">
              <TrendingDown size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'total_expenses', 'إجمالي المصروفات')}</p>
              <p className="text-2xl font-black mt-1">{data.totalExpenses.toLocaleString()} YER</p>
            </div>
            <div className={`bg-gradient-to-br ${data.netIncome >= 0 ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'} text-white p-6 rounded-3xl shadow-lg`}>
              <DollarSign size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'net_income', 'صافي الدخل')}</p>
              <p className="text-2xl font-black mt-1">{data.netIncome.toLocaleString()} YER</p>
            </div>
          </div>

          <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
            <h3 className="text-lg font-black text-yazal-navy dark:text-white mb-4">{T(t, 'for_period', 'تحليل الفترة')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="value" fill="#00AEEF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-black text-yazal-navy dark:text-white">{T(t, 'income_statement', 'قائمة الدخل')}</h2>
            </div>
            <div className="divide-y divide-slate-50 p-6 space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-slate-600">{T(t, 'total_revenue', 'إجمالي الإيرادات')}</span>
                <span className="text-lg font-black text-emerald-600">{data.totalRevenue.toLocaleString()} YER</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-slate-600">{T(t, 'total_expenses', 'إجمالي المصروفات')}</span>
                <span className="text-lg font-black text-rose-600">{data.totalExpenses.toLocaleString()} YER</span>
              </div>
              <div className="border-t-2 border-yazal-cyan pt-4 flex justify-between items-center">
                <span className="text-lg font-black text-yazal-navy dark:text-white">{T(t, 'net_income', 'صافي الدخل')}</span>
                <span className={`text-2xl font-black ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {data.netIncome >= 0 ? '+' : ''}{data.netIncome.toLocaleString()} YER
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeStatement;
