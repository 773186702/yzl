/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent?: string;
  balance: number;
  is_active: boolean;
  created_at?: any;
}

const AccountChart: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as Account['type'], parent: '', balance: 0, is_active: true });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, 'accounts_chart'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setAccounts(list);
      } catch (err) {
        console.warn('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;
    const id = editingAccount?.id || `ACC-${Date.now()}`;
    try {
      await setDoc(doc(db, 'accounts_chart', id), { ...form, id }, { merge: true });
      await logActivity(editingAccount ? 'تعديل حساب' : 'إضافة حساب', `تم ${editingAccount ? 'تعديل' : 'إضافة'} الحساب ${form.name}`);
      setShowModal(false);
      setEditingAccount(null);
      setForm({ code: '', name: '', type: 'asset', parent: '', balance: 0, is_active: true });
      const snap = await getDocs(collection(db, 'accounts_chart'));
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الحساب');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      await deleteDoc(doc(db, 'accounts_chart', id));
      await logActivity('حذف حساب', `تم حذف الحساب ${id}`);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setForm({ code: account.code, name: account.name, type: account.type, parent: account.parent || '', balance: account.balance, is_active: account.is_active });
    setShowModal(true);
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'asset': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
      case 'liability': return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10';
      case 'equity': return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10';
      case 'revenue': return 'text-green-600 bg-green-50 dark:bg-green-500/10';
      case 'expense': return 'text-orange-600 bg-orange-50 dark:bg-orange-500/10';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <BookOpen className="text-yazal-cyan" size={32} />
            {t.account_chart_title || 'دليل الحسابات'}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {t.account_chart_subtitle || 'إدارة دليل الحسابات المحاسبي الكامل'}
          </p>
        </div>
        {hasPermission('manage_account_chart') && (
          <button onClick={() => { setEditingAccount(null); setForm({ code: '', name: '', type: 'asset', parent: '', balance: 0, is_active: true }); setShowModal(true); }}
            className="bg-yazal-navy text-white font-black px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-yazal-navy-light transition-all text-xs uppercase tracking-widest">
            <Plus size={18} /> {t.add_account || 'إضافة حساب'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-yazal-navy-light p-4 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input type="text" placeholder={t.search || 'بحث...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none font-bold text-sm text-yazal-navy dark:text-white" />
      </div>

      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-16 text-center"><BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-black text-yazal-navy dark:text-white">{t.no_data_for_period || 'لا توجد حسابات'}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-yazal-navy text-white text-[10px] uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="px-4 py-4 font-black border-r border-white/10">{t.account_code || 'الكود'}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{t.account_name || 'اسم الحساب'}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{t.account_type || 'النوع'}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{t.account_balance || 'الرصيد'}</th>
                  <th className="px-4 py-4 font-black">{t.actions || 'الإجراءات'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filteredAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-xs font-black text-yazal-navy dark:text-white">{acc.code}</td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">{acc.name}</td>
                    <td className="px-4 py-4"><span className={`text-[9px] font-black px-2 py-1 rounded-md ${getTypeColor(acc.type)}`}>{acc.type}</span></td>
                    <td className="px-4 py-4 text-xs font-black text-yazal-navy dark:text-white">{acc.balance.toLocaleString()}</td>
                    <td className="px-4 py-4 flex gap-2">
                      <button onClick={() => openEdit(acc)} className="p-1.5 text-slate-400 hover:text-yazal-cyan transition-colors"><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-yazal-navy-light w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
              <h3 className="text-xl font-black text-yazal-navy dark:text-white">{editingAccount ? (t.edit_account || 'تعديل حساب') : (t.add_account || 'إضافة حساب')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-500 px-1">{t.account_code || 'كود الحساب'}</label>
                <input required value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{t.account_name || 'اسم الحساب'}</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{t.account_type || 'نوع الحساب'}</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as Account['type']})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan">
                  <option value="asset">{t.asset_label || 'أصل'}</option>
                  <option value="liability">{t.liability_label || 'خصم'}</option>
                  <option value="equity">{t.equity_label || 'حقوق ملكية'}</option>
                  <option value="revenue">{t.revenue_account_label || 'إيراد'}</option>
                  <option value="expense">{t.expense_account_label || 'مصروف'}</option>
                </select></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 font-black text-xs uppercase tracking-widest rounded-2xl text-slate-500">{t.cancel || 'إلغاء'}</button>
                <button type="submit" className="flex-1 py-4 bg-yazal-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-yazal-navy-light transition-colors"><Save size={16} className="inline ml-2" />{t.save || 'حفظ'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AccountChart;
