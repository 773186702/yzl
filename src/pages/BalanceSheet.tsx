/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Scale, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const BalanceSheet: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [data, setData] = useState<{ assets: any[]; liabilities: any[]; equity: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountsSnap = await getDocs(collection(db, 'accounts_chart'));
        const accounts = accountsSnap.docs.map(d => d.data() as any);
        setData({
          assets: accounts.filter((a: any) => a.type === 'asset').map((a: any) => ({ name: a.name, amount: a.balance || 0 })),
          liabilities: accounts.filter((a: any) => a.type === 'liability').map((a: any) => ({ name: a.name, amount: a.balance || 0 })),
          equity: accounts.filter((a: any) => a.type === 'equity').map((a: any) => ({ name: a.name, amount: a.balance || 0 })),
        });
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalAssets = data?.assets.reduce((s: number, a: any) => s + a.amount, 0) || 0;
  const totalLiabilities = data?.liabilities.reduce((s: number, l: any) => s + l.amount, 0) || 0;
  const totalEquity = data?.equity.reduce((s: number, e: any) => s + e.amount, 0) || 0;

  const chartData = [
    { name: T(t, 'total_assets', 'الأصول'), value: totalAssets },
    { name: T(t, 'total_liabilities', 'الخصوم'), value: totalLiabilities },
    { name: T(t, 'total_equity', 'حقوق الملكية'), value: totalEquity },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
          <Scale className="text-yazal-cyan" size={32} />{T(t, 'balance_sheet_title', 'الميزانية العمومية')}
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'balance_sheet_subtitle', 'عرض تقرير الميزانية العمومية')}</p>
      </div>

      {loading ? (
        <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-3xl shadow-lg">
              <TrendingUp size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'total_assets', 'إجمالي الأصول')}</p>
              <p className="text-2xl font-black mt-1">{totalAssets.toLocaleString()} YER</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 rounded-3xl shadow-lg">
              <TrendingDown size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'total_liabilities', 'إجمالي الخصوم')}</p>
              <p className="text-2xl font-black mt-1">{totalLiabilities.toLocaleString()} YER</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg">
              <DollarSign size={28} /><p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-4">{T(t, 'total_equity', 'حقوق الملكية')}</p>
              <p className="text-2xl font-black mt-1">{totalEquity.toLocaleString()} YER</p>
            </div>
          </div>

          <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
            <h3 className="text-lg font-black text-yazal-navy dark:text-white mb-4">تحليل الميزانية</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-b"><h3 className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{T(t, 'total_assets', 'الأصول')}</h3></div>
              <div className="divide-y divide-slate-50">
                {data?.assets.map((a: any, i: number) => <div key={i} className="p-4 flex justify-between"><span className="text-xs font-bold text-slate-600">{a.name}</span><span className="text-xs font-black text-emerald-600">{a.amount.toLocaleString()}</span></div>)}
                {(!data?.assets || data.assets.length === 0) && <div className="p-8 text-center text-xs text-slate-400">لا توجد أصول</div>}
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border-b"><h3 className="font-black text-rose-700 dark:text-rose-400 text-sm">{T(t, 'total_liabilities', 'الخصوم')}</h3></div>
                <div className="divide-y divide-slate-50">
                  {data?.liabilities.map((l: any, i: number) => <div key={i} className="p-4 flex justify-between"><span className="text-xs font-bold text-slate-600">{l.name}</span><span className="text-xs font-black text-rose-600">{l.amount.toLocaleString()}</span></div>)}
                  {(!data?.liabilities || data.liabilities.length === 0) && <div className="p-8 text-center text-xs text-slate-400">لا توجد خصوم</div>}
                </div>
              </div>
              <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-b"><h3 className="font-black text-blue-700 dark:text-blue-400 text-sm">{T(t, 'total_equity', 'حقوق الملكية')}</h3></div>
                <div className="divide-y divide-slate-50">
                  {data?.equity.map((e: any, i: number) => <div key={i} className="p-4 flex justify-between"><span className="text-xs font-bold text-slate-600">{e.name}</span><span className="text-xs font-black text-blue-600">{e.amount.toLocaleString()}</span></div>)}
                  {(!data?.equity || data.equity.length === 0) && <div className="p-8 text-center text-xs text-slate-400">لا توجد حقوق ملكية</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheet;
