/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Search, FileDown, Trash2, History } from 'lucide-react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';

const T = (t: any, key: string, fallback: string) => (t[key] as string) || fallback;

const AuditTrail: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleClear = async () => {
    if (!confirm(T(t, 'clear_audit', 'مسح سجل التدقيق؟'))) return;
    for (const log of logs) {
      await deleteDoc(doc(db, 'audit_logs', log.id));
    }
    setLogs([]);
  };

  const filtered = logs.filter(l =>
    (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Shield className="text-yazal-cyan" size={32} />{T(t, 'audit_trail_title', 'سجل التدقيق')}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{T(t, 'audit_trail_subtitle', 'عرض جميع أنشطة النظام')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleClear} className="bg-rose-500 text-white font-black px-4 py-3 rounded-2xl flex items-center gap-2 text-xs uppercase tracking-widest hover:bg-rose-600 transition-all"><Trash2 size={16} />{T(t, 'clear_audit', 'مسح')}</button>
        </div>
      </div>

      <div className="bg-white dark:bg-yazal-navy-light p-4 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input type="text" placeholder={T(t, 'search', 'بحث...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm" />
      </div>

      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center"><div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><Shield size={48} className="mx-auto mb-4 text-slate-300" /><h3 className="text-lg font-black">{T(t, 'no_audit_records', 'لا توجد سجلات تدقيق')}</h3></div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((log: any) => (
              <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-yazal-cyan/10 text-yazal-cyan flex items-center justify-center shrink-0"><History size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-yazal-navy dark:text-white">{log.username || T(t, 'audit_user', 'المستخدم')}</span>
                    <span className="text-[9px] font-black bg-yazal-cyan/10 text-yazal-cyan px-2 py-0.5 rounded-md">{log.action || '-'}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-1">{log.details || ''}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{log.timestamp?.toDate?.()?.toLocaleString('ar-EG') || ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
