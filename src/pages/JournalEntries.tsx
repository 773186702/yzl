/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookText, Plus, Search, Edit3, Trash2, X, Save } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';

interface JournalEntry {
  id: string;
  entry_number: string;
  date: any;
  description: string;
  debit: number;
  credit: number;
  account_code: string;
  account_name: string;
  approved: boolean;
  created_by: string;
  created_at?: any;
}

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const JournalEntries: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState({ entry_number: '', date: new Date().toISOString().split('T')[0], description: '', debit: 0, credit: 0, account_code: '', account_name: '', approved: false, created_by: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'journal_entries'), orderBy('date', 'desc')));
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.account_code) return;
    const id = editingEntry?.id || `JE-${Date.now()}`;
    try {
      await setDoc(doc(db, 'journal_entries', id), { ...form, id, created_by: 'system' }, { merge: true });
      await logActivity(editingEntry ? 'تعديل قيد' : 'إضافة قيد', `تم ${editingEntry ? 'تعديل' : 'إضافة'} القيد`);
      setShowModal(false); setEditingEntry(null);
      setForm({ entry_number: '', date: new Date().toISOString().split('T')[0], description: '', debit: 0, credit: 0, account_code: '', account_name: '', approved: false, created_by: '' });
      const snap = await getDocs(query(collection(db, 'journal_entries'), orderBy('date', 'desc')));
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
    } catch (err) { console.error(err); alert('خطأ في الحفظ'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القيد؟')) return;
    await deleteDoc(doc(db, 'journal_entries', id));
    await logActivity('حذف قيد', `تم حذف القيد ${id}`);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.entry_number.includes(searchTerm));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <BookText className="text-yazal-cyan" size={32} />
            {T(t, 'journal_entries_title', 'دفتر اليومية')}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'journal_entries_subtitle', 'تسجيل وإدارة قيود اليومية')}</p>
        </div>
        {hasPermission('view_journal_entries') && (
          <button onClick={() => { setEditingEntry(null); setForm({ entry_number: `JE-${Date.now()}`, date: new Date().toISOString().split('T')[0], description: '', debit: 0, credit: 0, account_code: '', account_name: '', approved: false, created_by: '' }); setShowModal(true); }}
            className="bg-yazal-navy text-white font-black px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-yazal-navy-light transition-all text-xs uppercase tracking-widest">
            <Plus size={18} />{T(t, 'add_entry', 'إضافة قيد')}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-yazal-navy-light p-4 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input type="text" placeholder={T(t, 'search', 'بحث...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm" />
      </div>

      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><BookText size={48} className="mx-auto mb-4 text-slate-300" /><h3 className="text-lg font-black">{T(t, 'no_data_for_period', 'لا توجد قيود')}</h3></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-yazal-navy text-white text-[10px] uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="px-4 py-4 font-black border-r border-white/10">{T(t, 'entry_number', 'رقم القيد')}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{T(t, 'entry_date', 'التاريخ')}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{T(t, 'entry_description', 'البيان')}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{T(t, 'debit_label', 'مدين')}</th>
                  <th className="px-4 py-4 font-black border-r border-white/10">{T(t, 'credit_label', 'دائن')}</th>
                  <th className="px-4 py-4 font-black">{T(t, 'actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-xs font-black">{entry.entry_number}</td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-500">{new Date(entry.date?.toDate?.() || entry.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">{entry.description}</td>
                    <td className="px-4 py-4 text-xs font-black text-emerald-600">{entry.debit.toLocaleString()}</td>
                    <td className="px-4 py-4 text-xs font-black text-rose-600">{entry.credit.toLocaleString()}</td>
                    <td className="px-4 py-4 flex gap-2">
                      <button onClick={() => { setEditingEntry(entry); setForm({ entry_number: entry.entry_number, date: entry.date?.toDate?.()?.toISOString().split('T')[0] || '', description: entry.description, debit: entry.debit, credit: entry.credit, account_code: entry.account_code, account_name: entry.account_name, approved: entry.approved, created_by: entry.created_by }); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-yazal-cyan"><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
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
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-yazal-navy-light w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
              <h3 className="text-xl font-black">{editingEntry ? T(t, 'edit_entry', 'تعديل القيد') : T(t, 'add_entry', 'إضافة قيد')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'entry_number', 'رقم القيد')}</label>
                  <input required value={form.entry_number} onChange={e => setForm({...form, entry_number: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'entry_date', 'التاريخ')}</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              </div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'entry_description', 'البيان')}</label>
                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'debit_label', 'مدين')}</label>
                  <input type="number" required value={form.debit} onChange={e => setForm({...form, debit: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'credit_label', 'دائن')}</label>
                  <input type="number" required value={form.credit} onChange={e => setForm({...form, credit: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'account_code', 'كود الحساب')}</label>
                  <input required value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'account_name', 'اسم الحساب')}</label>
                  <input required value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 font-black text-xs uppercase tracking-widest rounded-2xl text-slate-500">{T(t, 'cancel', 'إلغاء')}</button>
                <button type="submit" className="flex-1 py-4 bg-yazal-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-yazal-navy-light"><Save size={16} className="inline ml-2" />{T(t, 'save', 'حفظ')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default JournalEntries;
