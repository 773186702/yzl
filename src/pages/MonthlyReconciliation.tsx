/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Scale,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  FileDown,
  BarChart3
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { motion } from 'motion/react';
import { logActivity } from '../lib/audit';
import { exportReportPDF } from '../lib/pdfExporter';

interface MonthlyData {
  totalIncome: number;
  totalExpenses: number;
  totalRemainingDebts: number;
  netProfitLoss: number;
  tasksCount: number;
  expensesCount: number;
  clientsCount: number;
  tasks: any[];
  expenses: any[];
}

const MonthlyReconciliation: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];

  if (!hasPermission('view_financial_reports') && !hasPermission('admin')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12 p-6">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <Scale size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية الوصول إلى المطابقة المالية</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "عرض التقارير المالية" لحسابك</p>
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthlyData | null>(null);

  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate) return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') return new Date(val);
    return null;
  };

  const isInMonth = (dateVal: any): boolean => {
    const d = parseDate(dateVal);
    if (!d || isNaN(d.getTime())) return false;
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  };

  const formatCurrency = (amount: number, currency: string = 'YER') => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const generateReconciliation = async () => {
    setLoading(true);
    try {
      // جلب المهام
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const monthTasks = allTasks.filter((t: any) => isInMonth(t.created_at || t.date));

      // جلب المصروفات
      const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      const allExpenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const monthExpenses = allExpenses.filter((e: any) => isInMonth(e.date));

      // جلب العملاء
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const allClients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // الحسابات
      const resultTotalIncome = monthTasks.reduce((sum: number, t: any) => sum + Number(t.paid_amount || 0), 0);
      const resultTotalExpenses = monthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      const resultTotalRemainingDebts = monthTasks.reduce((sum: number, t: any) => sum + Number(t.remaining_amount || 0), 0);
      const resultNetProfitLoss = resultTotalIncome - resultTotalExpenses;

      setData({
        totalIncome: resultTotalIncome,
        totalExpenses: resultTotalExpenses,
        totalRemainingDebts: resultTotalRemainingDebts,
        netProfitLoss: resultNetProfitLoss,
        tasksCount: monthTasks.length,
        expensesCount: monthExpenses.length,
        clientsCount: allClients.length,
        tasks: monthTasks,
        expenses: monthExpenses,
      });

      await logActivity('مطابقة مالية', `تم إجراء المطابقة المالية الشهرية لـ ${selectedMonth}/${selectedYear}`);
    } catch (err) {
      console.error('Error generating reconciliation:', err);
      alert('حدث خطأ أثناء إنشاء المطابقة المالية');
    } finally {
      setLoading(false);
    }
  };

  const exportReconciliationPDF = async () => {
    if (!data) return;
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const period = `${monthLabel} ${selectedYear}`;

    await exportReportPDF({
      title: `تقرير المطابقة المالية - ${period}`,
      period,
      summaryCards: [
        { label: 'إجمالي الإيرادات', value: formatCurrency(data.totalIncome), color: '#16a34a' },
        { label: 'إجمالي المصروفات', value: formatCurrency(data.totalExpenses), color: '#dc2626' },
        { label: 'صافي الربح/الخسارة', value: formatCurrency(data.netProfitLoss), color: data.netProfitLoss >= 0 ? '#16a34a' : '#dc2626' },
        { label: 'الديون المتبقية', value: formatCurrency(data.totalRemainingDebts), color: '#d97706' },
        { label: 'عدد المهام', value: String(data.tasksCount), color: '#0f2b48' },
        { label: 'عدد المصروفات', value: String(data.expensesCount), color: '#0f2b48' },
      ],
      headers: ['النوع', 'التفاصيل', 'التاريخ', 'المبلغ'],
      rows: [
        ...data.tasks.map((t: any) => [
          'مهمة',
          `${t.service_name || t.service_id || '-'} - ${t.client_name || t.client_id || '-'}`,
          parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-',
          formatCurrency(Number(t.total_price || 0))
        ]),
        ...data.expenses.map((e: any) => [
          'مصروف',
          e.title || e.description || '-',
          parseDate(e.date)?.toLocaleDateString('ar-EG') || '-',
          formatCurrency(Number(e.amount || 0))
        ])
      ]
    });
  };

  const downloadReconciliationCSV = () => {
    if (!data) return;
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const rows = [
      ['تقرير المطابقة المالية - ' + monthLabel + ' ' + selectedYear],
      [''],
      ['البيان', 'القيمة'],
      ['إجمالي الإيرادات', data.totalIncome.toString()],
      ['إجمالي المصروفات', data.totalExpenses.toString()],
      ['صافي الربح/الخسارة', data.netProfitLoss.toString()],
      ['الديون المتبقية', data.totalRemainingDebts.toString()],
      ['عدد المهام', data.tasksCount.toString()],
      ['عدد المصروفات', data.expensesCount.toString()],
      ['عدد العملاء', data.clientsCount.toString()],
      [''],
      ['النوع', 'التفاصيل', 'التاريخ', 'المبلغ'],
      ...data.tasks.map((t: any) => ['مهمة', t.service_name || t.service_id || '-', parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-', String(Number(t.total_price || 0))]),
      ...data.expenses.map((e: any) => ['مصروف', e.title || e.description || '-', parseDate(e.date)?.toLocaleDateString('ar-EG') || '-', String(Number(e.amount || 0))]),
    ];

    const csvContent = rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `المطابقة_المالية_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* الهيدر */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Scale className="text-yazal-cyan" size={32} />
            {t.monthly_reconciliation_title || 'المطابقة المالية الشهرية'}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {t.monthly_reconciliation_subtitle || 'مطابقة الإيرادات والمصروفات الشهرية مع التقارير المالية'}
          </p>
        </div>
      </div>

      {/* اختيار الشهر والسنة */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-yazal-navy dark:text-white">
          <CalendarDays size={18} className="text-yazal-cyan" />
          {t.reconciliation_period || 'فترة المطابقة'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {t.select_month || 'اختر الشهر'}
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {t.select_year || 'اختر السنة'}
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={generateReconciliation}
          disabled={loading}
          className="w-full py-4 bg-yazal-navy hover:bg-yazal-navy-light text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <BarChart3 size={18} />
              {t.reconciliation_report || 'تقرير المطابقة المالية'}
            </>
          )}
        </button>
      </div>

      {/* نتائج المطابقة */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* أزرار التصدير */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={exportReconciliationPDF}
              className="bg-yazal-navy text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-yazal-navy-light transition-all"
            >
              <FileDown size={18} />
              {t.export_pdf_reconciliation || 'تصدير PDF'}
            </button>
            <button
              onClick={downloadReconciliationCSV}
              className="bg-white dark:bg-yazal-navy-light border border-slate-200 dark:border-white/5 text-yazal-navy dark:text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              <Download size={18} />
              {t.export_csv_reconciliation || 'تصدير CSV'}
            </button>
          </div>

          {/* بطاقات الملخص */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={28} />
                <DollarSign size={32} className="opacity-50" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {t.total_income || 'إجمالي الإيرادات'}
              </p>
              <p className="text-2xl font-black mt-1">{data.totalIncome.toLocaleString()} YER</p>
              <p className="text-[10px] font-bold text-white/50 mt-2">
                {t.task_count || 'عدد المهام'}: {data.tasksCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <TrendingDown size={28} />
                <Receipt size={32} className="opacity-50" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {t.total_expenses || 'إجمالي المصروفات'}
              </p>
              <p className="text-2xl font-black mt-1">{data.totalExpenses.toLocaleString()} YER</p>
              <p className="text-[10px] font-bold text-white/50 mt-2">
                {t.expense_count || 'عدد المصروفات'}: {data.expensesCount}
              </p>
            </div>

            <div className={`bg-gradient-to-br ${data.netProfitLoss >= 0 ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'} text-white p-6 rounded-3xl shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                {data.netProfitLoss >= 0 ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                <BarChart3 size={32} className="opacity-50" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {t.net_profit_loss || 'صافي الربح / الخسارة'}
              </p>
              <p className="text-2xl font-black mt-1">{data.netProfitLoss.toLocaleString()} YER</p>
              <p className="text-[10px] font-bold text-white/50 mt-2">
                {data.totalRemainingDebts > 0 ? `${(t.total_remaining_debts || 'الديون المتبقية')}: ${data.totalRemainingDebts.toLocaleString()} YER` : 'لا توجد ديون متبقية'}
              </p>
            </div>
          </div>

          {/* جدول التفاصيل */}
          <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-yazal-cyan rounded-full" />
                <div>
                  <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                    {t.reconciliation_details || 'تفاصيل المطابقة'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {t.reconciliation_period || 'فترة المطابقة'}: {months.find(m => m.value === selectedMonth)?.label || selectedMonth} {selectedYear}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">
                  {t.reconciled_by || 'الجهة المطابقة'}: {language === 'ar' ? 'النظام' : 'System'}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.reconciliation_date || 'تاريخ المطابقة'}: {new Date().toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-yazal-navy text-white text-[10px] uppercase tracking-widest sticky top-0">
                  <tr>
                    <th className="px-4 py-4 font-black border-r border-white/10">النوع</th>
                    <th className="px-4 py-4 font-black border-r border-white/10">التفاصيل</th>
                    <th className="px-4 py-4 font-black border-r border-white/10">التاريخ</th>
                    <th className="px-4 py-4 font-black">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {data.tasks.length === 0 && data.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-bold text-sm">
                        {t.no_data_for_period || 'لا توجد بيانات للفترة المحددة'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {data.tasks.map((t: any, i: number) => (
                        <tr key={`task-${i}`} className="bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md">مهمة</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                            {t.service_name || t.service_id || '-'} - {t.client_name || t.client_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-500">
                            {parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-emerald-600">
                            +{Number(t.total_price || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {data.expenses.map((e: any, i: number) => (
                        <tr key={`exp-${i}`} className="bg-rose-50/30 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-[9px] font-black bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-md">مصروف</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                            {e.title || e.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-500">
                            {parseDate(e.date)?.toLocaleDateString('ar-EG') || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-rose-600">
                            -{Number(e.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400">
                {t.transactions_count || 'عدد المعاملات'}: {data.tasks.length + data.expenses.length}
              </p>
              <p className={`text-sm font-black ${data.netProfitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.total_summary || 'ملخص'}: {data.netProfitLoss >= 0 ? '+' : ''}{data.netProfitLoss.toLocaleString()} YER
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MonthlyReconciliation;

