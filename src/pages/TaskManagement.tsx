/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Columns, Plus, Search, Edit3, Trash2, X, Save, Clock, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';
import { SearchableSelect } from '../components/SearchableSelect';

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const ITEMS_PER_PAGE = 12;

const TaskManagement: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', assignee_name: '', priority: 'medium',
    deadline: '', status: 'todo', client_name: '', service_name: ''
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tasksSnap, empSnap] = await Promise.all([
          getDocs(query(collection(db, 'tasks'), orderBy('created_at', 'desc'))),
          getDocs(collection(db, 'users'))
        ]);
        setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    const id = editing?.id || `TASK-${Date.now()}`;
    try {
      await setDoc(doc(db, 'tasks', id), { ...form, id }, { merge: true });
      await logActivity(editing ? 'تحديث مهمة' : 'إضافة مهمة', `تم ${editing ? 'تحديث' : 'إضافة'} المهمة ${form.title}`);
      setShowModal(false); setEditing(null);
      setForm({ title: '', description: '', assigned_to: '', assignee_name: '', priority: 'medium', deadline: '', status: 'todo', client_name: '', service_name: '' });
      const snap = await getDocs(query(collection(db, 'tasks'), orderBy('created_at', 'desc')));
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); alert('خطأ في الحفظ'); }
  };

  const moveTask = async (id: string, newStatus: string) => {
    await setDoc(doc(db, 'tasks', id), { status: newStatus }, { merge: true });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filtered = tasks.filter((t: any) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (searchTerm && !t.title?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.id?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return 'text-rose-600 bg-rose-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getStatusIcon = (s: string) => {
    switch(s) {
      case 'todo': return <AlertCircle size={14} />;
      case 'in_progress': return <Clock size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Columns className="text-yazal-cyan" size={32} />{T(t, 'task_management_title', 'لوحة إدارة المهام')}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'task_management_subtitle', 'إدارة متقدمة للمهام')}</p>
        </div>
        {hasPermission('manage_task_board') && (
          <button onClick={() => { setEditing(null); setForm({ title: '', description: '', assigned_to: '', assignee_name: '', priority: 'medium', deadline: '', status: 'todo', client_name: '', service_name: '' }); setShowModal(true); }}
            className="bg-yazal-navy text-white font-black px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-yazal-navy-light transition-all text-xs uppercase tracking-widest"><Plus size={18} />{T(t, 'add_task_board', 'إضافة مهمة')}</button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white dark:bg-yazal-navy-light p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input type="text" placeholder={T(t, 'search', 'بحث...')} value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="w-full bg-transparent outline-none font-bold text-sm" />
        </div>
        <div className="flex gap-2 bg-white dark:bg-yazal-navy-light p-2 rounded-2xl border border-slate-100 shadow-sm">
          {['all', 'todo', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-yazal-navy text-white shadow-lg' : 'text-slate-400 hover:text-yazal-navy'}`}>
              {s === 'all' ? T(t, 'all', 'الكل') : s === 'todo' ? T(t, 'todo_label', 'مهام') : s === 'in_progress' ? T(t, 'in_progress_label', 'قيد التنفيذ') : T(t, 'done_label', 'منجزة')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
        ) : paged.length === 0 ? (
          <div className="col-span-full p-16 text-center"><Columns size={48} className="mx-auto mb-4 text-slate-300" /><h3 className="text-lg font-black">{T(t, 'no_tasks_board', 'لا توجد مهام')}</h3></div>
        ) : paged.map((task: any) => (
          <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[9px] font-black px-2 py-1 rounded-md flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                {getStatusIcon(task.status)}{task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
              </span>
              <span className="text-[9px] font-bold text-slate-400">#{task.id?.toString().slice(0, 8)}</span>
            </div>
            <h3 className="font-black text-sm text-yazal-navy dark:text-white mb-1">{task.title || task.service_name || '-'}</h3>
            {task.description && <p className="text-[11px] font-bold text-slate-500 mb-3 line-clamp-2">{task.description}</p>}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>{task.assignee_name || task.assigned_to || '-'}</span>
              {task.deadline && <span>{new Date(task.deadline).toLocaleDateString('ar-EG')}</span>}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
              {task.status === 'todo' && <button onClick={() => moveTask(task.id, 'in_progress')} className="flex-1 py-2 bg-yazal-cyan/10 text-yazal-cyan rounded-xl text-[9px] font-black hover:bg-yazal-cyan/20 transition-colors"><ChevronLeft size={14} className="inline ml-1" />{T(t, 'move_task', 'نقل')}</button>}
              {task.status === 'in_progress' && <button onClick={() => moveTask(task.id, 'completed')} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black hover:bg-emerald-100 transition-colors"><CheckCircle size={14} className="inline ml-1" />{T(t, 'done_label', 'إنجاز')}</button>}
              {task.status === 'completed' && <button onClick={() => moveTask(task.id, 'todo')} className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black hover:bg-amber-100 transition-colors">إعادة</button>}
              <button onClick={() => { setEditing(task); setForm({ title: task.title || '', description: task.description || '', assigned_to: task.assigned_to || '', assignee_name: task.assignee_name || '', priority: task.priority || 'medium', deadline: task.deadline?.toDate?.()?.toISOString().split('T')[0] || '', status: task.status || 'todo', client_name: task.client_name || '', service_name: task.service_name || '' }); setShowModal(true); }} className="p-2 text-slate-400 hover:text-yazal-cyan"><Edit3 size={14} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === p ? 'bg-yazal-navy text-white shadow-lg' : 'bg-white dark:bg-yazal-navy-light text-slate-400 border border-slate-100'}`}>{p}</button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-yazal-navy-light w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black">{editing ? 'تعديل مهمة' : 'إضافة مهمة'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'task_description', 'العنوان')}</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'task_description', 'الوصف')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'task_assignee', 'الموظف')}</label>
                  <SearchableSelect options={employees.map((e: any) => ({ value: e.uid, label: e.username }))} value={form.assigned_to}
                    onChange={(val) => { const emp = employees.find((e: any) => e.uid === val); setForm({...form, assigned_to: val, assignee_name: emp?.username || ''}); }}
                    placeholder="اختر الموظف" title="الموظف المسؤول" /></div>
                <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'task_priority', 'الأولوية')}</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan">
                    <option value="low">{T(t, 'low', 'منخفضة')}</option>
                    <option value="medium">{T(t, 'medium_priority', 'متوسطة')}</option>
                    <option value="high">{T(t, 'high_priority', 'عالية')}</option>
                  </select></div>
              </div>
              <div><label className="text-[10px] font-black text-slate-500 px-1">{T(t, 'task_deadline', 'الموعد النهائي')}</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan" /></div>
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

export default TaskManagement;
