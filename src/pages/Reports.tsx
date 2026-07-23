import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Reports: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = async (reportType: string) => {
    if (!dateRange.from || !dateRange.to) {
      alert('الرجاء اختيار الفترة الزمنية');
      return;
    }

    try {
      if (reportType === t.expenses_report) {
        const q = query(
          collection(db, 'expenses'),
          where('date', '>=', dateRange.from),
          where('date', '<=', dateRange.to)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());
        setReportData({ type: reportType, data });
        alert(`تم جلب تقرير المصروفات: ${data.length} سجل`);
      } else {
        alert('هذا التقرير قيد التطوير');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء جلب التقرير');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-black text-yazal-navy dark:text-white">{t.reports}</h2>
      
      {/* Date Range Filter */}
      <div className="flex gap-4 p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
        <div className='flex-1'>
            <label className="block text-sm font-bold text-slate-500 mb-1">{t.from}</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="w-full p-3 border rounded-2xl outline-none" />
        </div>
        <div className='flex-1'>
            <label className="block text-sm font-bold text-slate-500 mb-1">{t.to}</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="w-full p-3 border rounded-2xl outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[t.expenses_report, t.revenue_report, t.debts_report, t.clients_report, t.employees_report, t.payment_method_report, t.currency_report].map((report) => (
            <div key={report} onClick={() => generateReport(report)} className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 hover:border-emerald-500 cursor-pointer transition-colors">
                <h3 className="font-black text-lg">{report}</h3>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
