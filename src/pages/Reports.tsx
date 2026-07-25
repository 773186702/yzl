import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReportData {
  title: string;
  headers: string[];
  rows: string[][];
  summary: string;
}

const Reports: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const parseDateValue = (value: any) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    return null;
  };

  const isBetweenDates = (dateValue: any) => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    const current = parseDateValue(dateValue);
    if (!current || Number.isNaN(current.getTime())) return false;
    return current >= from && current <= to;
  };

  const downloadReportCSV = (report: ReportData) => {
    const csvRows = [report.headers.join(',')];
    report.rows.forEach((row) => {
      const escaped = row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`);
      csvRows.push(escaped.join(','));
    });

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const sendReportViaWhatsApp = (report: ReportData) => {
    const summary = `تقرير ${report.title}\n${report.summary}`;
    const message = encodeURIComponent(summary);
    const phone = prompt('أدخل رقم واتساب المستلم مع رمز الدولة:', '967770000000');
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const generateReport = async (reportType: string) => {
    if (!dateRange.from || !dateRange.to) {
      alert('الرجاء اختيار الفترة الزمنية');
      return;
    }

    setLoading(true);
    try {
      const rows: string[][] = [];
      let headers: string[] = [];
      let summary = '';

      if (reportType === t.expenses_report) {
        const expensesSnap = await getDocs(collection(db, 'expenses'));
        const expenses = expensesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const filtered = expenses.filter((expense) => isBetweenDates(expense.date));
        headers = ['التاريخ', 'البند', 'المبلغ', 'العملة', 'الحساب'];
        filtered.forEach((expense) => {
          rows.push([
            expense.date ? new Date(expense.date).toLocaleDateString() : 'غير محدد',
            expense.title || expense.description || '-',
            expense.amount?.toLocaleString() || '0',
            expense.currency || 'YER',
            expense.account || '-',
          ]);
        });
        const total = filtered.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
        summary = `عدد السجلات: ${filtered.length}، إجمالي المصروفات: ${total.toLocaleString()} YER`;
      } else if (reportType === t.revenue_report) {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const filtered = tasks.filter((task) => isBetweenDates(task.created_at || task.date) && task.status === 'completed');
        headers = ['التاريخ', 'الطلب', 'العميل', 'الإجمالي', 'المدفوع', 'المتبقي'];
        filtered.forEach((task) => {
          rows.push([
            task.created_at ? new Date(task.created_at).toLocaleDateString() : new Date(task.date || '').toLocaleDateString(),
            task.service_name || task.service_id || '-',
            task.client_name || task.client_id || '-',
            Number(task.total_price || 0).toLocaleString(),
            Number(task.paid_amount || 0).toLocaleString(),
            Number(task.remaining_amount || 0).toLocaleString(),
          ]);
        });
        const totalRevenue = filtered.reduce((acc, task) => acc + Number(task.paid_amount || 0), 0);
        summary = `عدد الطلبات المكتملة: ${filtered.length}، إجمالي الإيرادات: ${totalRevenue.toLocaleString()} YER`;
      } else if (reportType === t.debts_report) {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const filtered = tasks.filter((task) => Number(task.remaining_amount || 0) > 0);
        headers = ['رقم الطلب', 'العميل', 'الخدمة', 'المتبقي', 'حالة الطلب'];
        filtered.forEach((task) => {
          rows.push([
            task.task_id || task.id || '-',
            task.client_name || task.client_id || '-',
            task.service_name || task.service_id || '-',
            Number(task.remaining_amount || 0).toLocaleString(),
            task.status || '-',
          ]);
        });
        const totalDebt = filtered.reduce((acc, task) => acc + Number(task.remaining_amount || 0), 0);
        summary = `عدد الديون المدينة: ${filtered.length}، إجمالي المتبقي: ${totalDebt.toLocaleString()} YER`;
      } else if (reportType === t.clients_report) {
        const clientsSnap = await getDocs(collection(db, 'clients'));
        const clients = clientsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        headers = ['العميل', 'رقم العميل', 'الهاتف', 'إجمالي الديون'];
        clients.forEach((client) => {
          rows.push([
            client.name || '-',
            client.client_id || client.id || '-',
            client.phone || '-',
            Number(client.total_debt || 0).toLocaleString(),
          ]);
        });
        const totalDebt = clients.reduce((acc, client) => acc + Number(client.total_debt || 0), 0);
        summary = `عدد العملاء: ${clients.length}، إجمالي الديون المعلنة: ${totalDebt.toLocaleString()} YER`;
      } else if (reportType === t.employees_report) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        headers = ['اسم الموظف', 'البريد الإلكتروني', 'الدور', 'كود المستخدم'];
        users.forEach((user) => {
          rows.push([
            user.username || '-',
            user.email || '-',
            user.role || '-',
            user.uid || user.id || '-',
          ]);
        });
        const rolesCount = users.reduce((acc: Record<string, number>, user) => {
          const key = user.role || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        summary = `عدد الموظفين: ${users.length}، أدوار الموظفين: ${Object.entries(rolesCount).map(([role, count]) => `${role}: ${count}`).join(', ')}`;
      } else if (reportType === t.payment_method_report) {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const grouped = tasks.reduce((acc: Record<string, number>, task) => {
          const method = task.payment_method || 'غير محدد';
          acc[method] = (acc[method] || 0) + Number(task.total_price || 0);
          return acc;
        }, {});
        headers = ['طريقة الدفع', 'إجمالي المبيعات'];
        Object.entries(grouped).forEach(([method, total]) => {
          rows.push([method, total.toLocaleString()]);
        });
        summary = `عدد طرق الدفع: ${Object.keys(grouped).length}`;
      } else if (reportType === t.currency_report) {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const grouped = tasks.reduce((acc: Record<string, number>, task) => {
          const currency = task.original_currency || 'غير محدد';
          acc[currency] = (acc[currency] || 0) + Number(task.total_price || 0);
          return acc;
        }, {});
        headers = ['العملة', 'إجمالي المبيعات'];
        Object.entries(grouped).forEach(([currency, total]) => {
          rows.push([currency, total.toLocaleString()]);
        });
        summary = `عدد العملات: ${Object.keys(grouped).length}`;
      }

      setReportData({ title: reportType, headers, rows, summary });
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-yazal-navy dark:text-white">{t.reports}</h2>
          <p className="text-slate-500 text-sm mt-2">{t.reports_description}</p>
        </div>
        {reportData && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadReportCSV(reportData)}
              className="bg-yazal-cyan text-yazal-navy font-black px-5 py-3 rounded-2xl uppercase text-xs tracking-widest shadow-sm hover:bg-cyan-500 transition-colors"
            >
              {t.export_report}
            </button>
            <button
              onClick={() => sendReportViaWhatsApp(reportData)}
              className="bg-emerald-500 text-white font-black px-5 py-3 rounded-2xl uppercase text-xs tracking-widest shadow-sm hover:bg-emerald-600 transition-colors"
            >
              {t.send_whatsapp}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
          <label className="block text-sm font-bold text-slate-500 mb-1">{t.from}</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-full p-3 border rounded-2xl outline-none"
          />
        </div>
        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
          <label className="block text-sm font-bold text-slate-500 mb-1">{t.to}</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-full p-3 border rounded-2xl outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          t.expenses_report,
          t.revenue_report,
          t.debts_report,
          t.clients_report,
          t.employees_report,
          t.payment_method_report,
          t.currency_report,
        ].map((report) => (
          <button
            key={report}
            onClick={() => generateReport(report)}
            className="p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 hover:border-emerald-500 cursor-pointer transition-colors text-left"
          >
            <h3 className="font-black text-lg">{report}</h3>
            <p className="text-slate-400 text-xs mt-3">{t.click_to_view_details}</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 text-center">
          <div className="inline-block w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin" />
          <p className="mt-4 text-slate-500 font-bold">{t.generating_report}</p>
        </div>
      )}

      {reportData && !loading && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-50 dark:bg-yazal-navy-dark rounded-3xl border border-slate-100 dark:border-white/5">
            <h3 className="text-lg font-black text-yazal-navy dark:text-white">{reportData.title}</h3>
            <p className="text-slate-500 text-sm mt-2">{reportData.summary}</p>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-yazal-navy text-white text-xs uppercase tracking-widest">
                  {reportData.headers.map((header) => (
                    <th key={header} className="px-4 py-4 font-black border-r border-white/10 last:border-r-0">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-slate-50 dark:bg-yazal-navy-dark/40' : ''}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-white/5">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
