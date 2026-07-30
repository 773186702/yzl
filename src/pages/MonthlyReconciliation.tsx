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
  BarChart3,
  Filter
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { motion } from 'motion/react';
import { logActivity } from '../lib/audit';
import { exportReportPDF } from '../lib/pdfExporter';
import { SearchableSelect } from '../components/SearchableSelect';

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

/**
 * صفحة المطابقة المالية الشهرية
 * تدعم التصفية الديناميكية حسب العملة والخدمة وطريقة الدفع
 * جميع البيانات تُسحب ديناميكياً من Firestore حسب ما يدخله المدير
 */
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
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthlyData | null>(null);

  // فلاتر ديناميكية
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  // بيانات ديناميكية من Firestore
  const [dynamicCurrencies, setDynamicCurrencies] = useState<{ code: string; name: string }[]>([]);
  const [dynamicServices, setDynamicServices] = useState<{ id: string; name: string }[]>([]);
  const [dynamicPaymentMethods, setDynamicPaymentMethods] = useState<{ id: string; name: string }[]>([]);

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

  // جلب البيانات الديناميكية من Firestore
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const currenciesSnap = await getDocs(collection(db, 'currencies'));
        const currenciesList = currenciesSnap.docs.map(d => ({ code: d.data().code, name: d.data().name }));
        if (currenciesList.length > 0) setDynamicCurrencies(currenciesList);

        const servicesSnap = await getDocs(collection(db, 'services'));
        const servicesList = servicesSnap.docs.map(d => ({ id: d.id, name: d.data().service_name_ar || d.data().service_code || d.id }));
        if (servicesList.length > 0) setDynamicServices(servicesList);

        const paymentMethodsSnap = await getDocs(collection(db, 'payment_methods'));
        const methodsList = paymentMethodsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        if (methodsList.length > 0) setDynamicPaymentMethods(methodsList);
      } catch (err) {
        console.warn('Error fetching dynamic data:', err);
      }
    };
    fetchDynamicData();
  }, []);

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
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      let monthTasks = allTasks.filter((t: any) => isInMonth(t.created_at || t.date));

      const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      const allExpenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      let monthExpenses = allExpenses.filter((e: any) => isInMonth(e.date));

      // تطبيق الفلاتر الديناميكية
      if (selectedCurrency !== 'all') {
        monthTasks = monthTasks.filter((t: any) => (t.original_currency || 'YER') === selectedCurrency);
        monthExpenses = monthExpenses.filter((e: any) => (e.currency || 'YER') === selectedCurrency);
      }

      if (selectedService !== 'all') {
        monthTasks = monthTasks.filter((t: any) => t.service_id === selectedService || t.service_name === selectedService);
      }

      if (selectedPaymentMethod !== 'all') {
        monthTasks = monthTasks.filter((t: any) => t.payment_method === selectedPaymentMethod);
        monthExpenses = monthExpenses.filter((e: any) => e.source_account === selectedPaymentMethod);
      }

      const clientsSnap = await getDocs(collection(db, 'clients'));
      const allClients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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

      {/* اختيار الشهر والسنة والفلاتر الديناميكية */}
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

        {/* فلاتر ديناميكية */}
        <div className="border-t border-slate-100 dark:border-white/5 pt-4">
          <div className="flex items-center gap-2 text-sm font-bold text-yazal-navy dark:text-white mb-3">
            <Filter size={16} className="text-yazal-cyan" />
            فلاتر التصفية الديناميكية
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* فلتر العملة */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">عملة المطابقة</label>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'جميع العملات' },
                  ...dynamicCurrencies.map(c => ({ value: c.code, label: `${c.name} (${c.code})`, sublabel: c.code }))
                ]}
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                placeholder="اختر العملة..."
                title="اختر العملة لتصفية بيانات المطابقة"
              />
            </div>

            {/* فلتر الخدمة */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الخدمة</label>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'جميع الخدمات' },
                  ...dynamicServices.map(s => ({ value: s.id, label: s.name }))
                ]}
                value={selectedService}
                onChange={setSelectedService}
                placeholder="اختر الخدمة..."
                title="اختر الخدمة لتصفية المهام"
              />
            </div>

            {/* فلتر طريقة الدفع */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">طريقة الدفع</label>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'جميع طرق الدفع' },
                  ...dynamicPaymentMethods.map(pm => ({ value: pm.name, label: pm.name }))
                ]}
                value={selectedPaymentMethod}
                onChange={setSelectedPaymentMethod}
                placeholder="اختر طريقة الدفع..."
                title="اختر طريقة الدفع لتصفية المهام"
              />
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
              <p className="text-2xl font-black mt-1">
                {data.totalIncome.toLocaleString()} {selectedCurrency !== 'all' ? selectedCurrency : 'YER'}
              </p>
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
              <p className="text-2xl font-black mt-1">
                {data.totalExpenses.toLocaleString()} {selectedCurrency !== 'all' ? selectedCurrency : 'YER'}
              </p>
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
              <p className="text-2xl font-black mt-1">
                {data.netProfitLoss.toLocaleString()} {selectedCurrency !== 'all' ? selectedCurrency : 'YER'}
              </p>
              <p className="text-[10px] font-bold text-white/50 mt-2">
                {data.totalRemainingDebts > 0
                  ? `${(t.total_remaining_debts || 'الديون المتبقية')}: ${data.totalRemainingDebts.toLocaleString()} ${selectedCurrency !== 'all' ? selectedCurrency : 'YER'}`
                  : 'لا توجد ديون متبقية'}
              </p>
            </div>

          {/* جدول التفاصيل */}
          <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-yazal-cyan rounded-full" />
                <div>
