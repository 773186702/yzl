/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserMinus, Plus, Search, Edit3, Trash2, X, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';
import { SearchableSelect } from '../components/SearchableSelect';

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const EmployeeDeductions: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [deductions, setDeductions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ employee_id: '', employee_name: '', type: 'penalty', amount: 0, reason: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dedSnap, empSnap] = await Promise.all([
          getDocs(query(collection(db, 'employee_deductions'), orderBy('date', 'desc'))),
          getDocs(collection(db, 'users'))
        ]);
        setDeductions(dedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.amount) return;
    const id = editing?.id || `DED-${Date.now()}`;
    try {
      await setDoc(doc(db, 'employee_deductions', id), { ...form, id }, { merge: true });
      await logActivity(editing ? 'تعديل خصم' : 'إضافة خصم', `تم ${editing ? 'تعديل' : 'إضافة'} خصم للموظف ${form.employee_name}`);
      setShowModal(false); setEditing(null);
      setForm({ employee_id: '', employee_name: '', type: 'penalty', amount: 0, reason: '', date: new Date().toISOString().split('T')[0] });
      const snap = await getDocs(query(collection(db, 'employee_deductions'), orderBy('date', 'desc')));
      setDeductions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); alert('خطأ في الحفظ'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await deleteDoc(doc(db, 'employee_deductions', id));
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const getTotalByType = (type: string) => deductions.filter(d => d.type === type).reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

  const filtered = deductions.filter(d => d.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <UserMinus className="text-yazal-cyan" size={32} />{T(t, 'employee_deductions_title', 'خصومات الموظفين')}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'employee_deductions_subtitle', 'إدارة خصومات ومكافآت الموظفين')}</p>
        </div>
        {hasPermission('deduct_employee') && (
          <button onClick={() => { setEditing(null); setForm({ employee_id: '', employee_name: '', type: 'penalty', amount: 0, reason: '', date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}
            className="bg-yazal-navy text-white font-black px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-yazal-navy-light transition-all text-xs uppercase tracking-widest"><Plus size={18} />{T(t, 'add_deduction', 'إضافة خصم')}</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">{T(t, 'total_deductions', 'إجمالي الخصومات')}</p><p className="text-2xl font-black text-rose-600 mt-1">{getTotalByType('penalty').toLocaleString()}</p></div>
        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">{T(t, 'total_bonuses', 'إجمالي المكافآت')}</p><p className="text-2xl font-black text-emerald-600 mt-1">{getTotalByType('bonus').toLocaleString()}</p></div>
        <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400">{T(t, 'net_salary', 'صافي')}</p><p className="text-2xl font-black text-yazal-navy mt-1">{getTotalByType('bonus').toLocaleString()}</p></div>
      </div>

      <div className="bg-white dark:bg-yazal-navy-light p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input type="text" placeholder={T(t, 'search', 'بحث...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm" />
      </div>

      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
        : filtered.length === 0 ? <div className="p-16 text-center"><UserMinus size={48} className="mx-auto mb-4 text-slate-300" /><h3 className="text-lg font-black">{T(t, 'no_data_for_period', 'لا توجد خصومات')}</h3></div>
        : <div className="overflow-x-auto"><table className="w-full text-right border-collapse">
            <thead className="bg-yazal-navy text-white text-[10px] uppercase tracking-widest sticky top-0">
              <tr><th className="px-4 py-4 font-black border-r">{T(t, 'employee_name', 'الموظف')}</th><th className="px-4 py-4 font-black border-r">{T(t, 'deduction_type', 'النوع')}</th><th className="px-4 py-4 font-black border-r">{T(t, 'deduction_amount', 'المبلغ')}</th><th className="px-4 py-4 font-black border-r">{T(t, 'deduction_reason', 'السبب')}</th><th className="px-4 py-4 font-black">{T(t, 'actions', 'إجراءات')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-xs font-bold">{d.employee_name}</td>
                  <td className="px-4 py-4"><span className={`text-[9px] font-black px-2 py-1 rounded-md ${d.type === 'bonus' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{d.type === 'bonus' ? 'مكافأة' : 'خصم'}</span></td>
                  <td className="px-4 py-4 text-xs font-black">{Number(d.amount).toLocaleString()}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{d.reason}</td>
                  <td className="px-4 py-4 flex gap-2">
                    <button onClick={() => { setEditing(d); setForm({ employee_id: d.employee_id, employee_name: d.employee_name, type: d.type, amount: d.amount, reason: d.reason, date: d.date?.toDate?.()?.toISOString().split('T')[0] || '' }); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-yazal-cyan"><Edit3 size={15} /></button>
                    <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-yazal-navy-light w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black">{editing ? T(t, 'edit_deduction', 'تعديل الخصم') : T(t, 'add_deduction', 'إضافة خصم')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'employee_name', 'الموظف')}</label>
                <SearchableSelect options={employees.map((e: any) => ({ value: e.uid, label: e.username }))} value={form.employee_id}
                  onChange={(val) => { const emp = employees.find((e: any) => e.uid === val); setForm({...form, employee_id: val, employee_name: emp?.username || ''}); }}
                  placeholder="اختر الموظف..." title="اختر الموظف" /></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'deduction_type', 'النوع')}</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan">
                  <option value="bonus">{T(t, 'bonus_label', 'مكافأة')}</option>
                  <option value="penalty">{T(t, 'penalty_label', 'غرامة')}</option>
                  <option value="advance">{T(t, 'advance_label', 'سلفة')}</option>
                </select></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'deduction_amount', 'المبلغ')}</label>
                <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'deduction_reason', 'السبب')}</label>
                <input required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 font-black text-xs uppercase rounded-2xl text-slate-500">{T(t, 'cancel', 'إلغاء')}</button>
                <button type="submit" className="flex-1 py-4 bg-yazal-navy text-white font-black text-xs uppercase rounded-2xl shadow-xl hover:bg-yazal-navy-light"><Save size={16} className="inline ml-2" />{T(t, 'save', 'حفظ')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDeductions;
