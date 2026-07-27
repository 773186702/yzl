/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, FileText, Download, BarChart3, Users,
  UserCheck, DollarSign, TrendingUp, TrendingDown,
  CalendarDays, Search, X, Printer, Wallet, Receipt,
  CreditCard, ArrowUpRight, ArrowDownRight, Filter,
  PieChart, CheckCircle, Clock, AlertCircle, ChevronDown,
  ChevronUp, Eye, FileDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Task, Client } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/audit';
import { 
  exportEmployeeStatementPDF, 
  exportClientStatementPDF, 
  exportReportPDF 
} from '../lib/pdfExporter';

interface ReportResult {
  title: string;
  icon: React.ReactNode;
  summaryCards: { label: string; value: string; color: string; icon: React.ReactNode }[];
  headers: string[];
  rows: string[][];
  rawData?: any[];
}

const Reports: React.FC = () => {
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];

  if (!hasPermission('view_ledger')) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
        <div className="bg-yazal-navy p-12 rounded-[2.5rem] text-center space-y-6">
          <ShieldAlert size={64} className="mx-auto text-yazal-cyan" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">لا تملك صلاحية الوصول إلى التقارير</h2>
          <p className="text-white/60 font-bold text-sm">قم بمراجعة مدير النظام لتفعيل صلاحية "عرض السجل المالي" لحسابك</p>
        </div>
      </div>
    );
  }

  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Employee report state
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Client report state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Fetch employees & clients
  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setEmployees(usersSnap.docs.map(d => d.data() as UserProfile));
        const clientsSnap = await getDocs(collection(db, 'clients'));
        setClients(clientsSnap.docs.map(d => d.data() as Client));
      } catch (err) {
        console.warn('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate) return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') return new Date(val);
    return null;
  };

  const isInRange = (dateVal: any): boolean => {
    if (!dateRange.from || !dateRange.to) return true;
    const d = parseDate(dateVal);
    if (!d || isNaN(d.getTime())) return false;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const formatCurrency = (amount: number, currency: string = 'YER') => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const downloadCSV = (report: ReportResult) => {
    const csvRows = [report.headers.join(',')];
    report.rows.forEach(row => {
      const escaped = row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`);
      csvRows.push(escaped.join(','));
    });
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * تقرير الإيرادات
   */
  const generateRevenueReport = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tasks'));
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = tasks.filter(t => {
        const status = t.status === 'completed';
        const dateOk = isInRange(t.created_at || t.date);
        return status && dateOk;
      });

      const totalRevenue = filtered.reduce((sum, t) => sum + Number(t.paid_amount || 0), 0);
      const totalExpected = filtered.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
      const remaining = filtered.reduce((sum, t) => sum + Number(t.remaining_amount || 0), 0);

      setReportResult({
        title: '📊 تقرير الإيرادات',
        icon: <TrendingUp size={24} className="text-emerald-500" />,
        summaryCards: [
          { label: 'إجمالي الإيرادات', value: formatCurrency(totalRevenue), color: 'text-emerald-600', icon: <TrendingUp size={20} /> },
          { label: 'القيمة المتوقعة', value: formatCurrency(totalExpected), color: 'text-yazal-cyan', icon: <DollarSign size={20} /> },
          { label: 'المتبقي', value: formatCurrency(remaining), color: 'text-amber-600', icon: <AlertCircle size={20} /> },
          { label: 'عدد المهام المكتملة', value: String(filtered.length), color: 'text-yazal-navy', icon: <CheckCircle size={20} /> },
        ],
        headers: ['التاريخ', 'رقم المهمة', 'العميل', 'الخدمة', 'الإجمالي', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الموظف'],
        rows: filtered.map(t => [
          parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-',
          t.task_id || t.id || '-',
          t.client_name || t.client_id || '-',
          t.service_name || t.service_id || '-',
          formatCurrency(Number(t.total_price || 0)),
          formatCurrency(Number(t.paid_amount || 0)),
          formatCurrency(Number(t.remaining_amount || 0)),
          t.payment_method || '-',
          t.created_by_employee_name || t.assigned_to || t.created_by || '-'
        ]),
        rawData: filtered,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير المصروفات
   */
  const generateExpensesReport = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      const expensesList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = expensesList.filter(e => isInRange(e.date));

      const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const groupedByCategory = filtered.reduce((acc: Record<string, number>, e) => {
        acc[e.category || 'أخرى'] = (acc[e.category || 'أخرى'] || 0) + Number(e.amount || 0);
        return acc;
      }, {});

      setReportResult({
        title: '💰 تقرير المصروفات',
        icon: <Receipt size={24} className="text-rose-500" />,
        summaryCards: [
          { label: 'إجمالي المصروفات', value: formatCurrency(total), color: 'text-rose-600', icon: <TrendingDown size={20} /> },
          { label: 'عدد المعاملات', value: String(filtered.length), color: 'text-slate-600', icon: <FileText size={20} /> },
          { label: 'الفئات المختلفة', value: String(Object.keys(groupedByCategory).length), color: 'text-yazal-cyan', icon: <Filter size={20} /> },
          { label: 'أعلى فئة', value: Object.entries(groupedByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || '-', color: 'text-amber-600', icon: <BarChart3 size={20} /> },
        ],
        headers: ['التاريخ', 'البيان', 'الفئة', 'المبلغ', 'العملة', 'الحساب', 'الموظف المسجل', 'الموظف المرتبط', 'المستلم'],
        rows: filtered.map(e => [
          parseDate(e.date)?.toLocaleDateString('ar-EG') || '-',
          e.title || e.description || '-',
          e.category || '-',
          Number(e.amount || 0).toLocaleString(),
          e.currency || 'YER',
          e.source_account || '-',
          e.logged_by || '-',
          e.employee_name || '-',
          e.recipient || '-'
        ]),
        rawData: filtered,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير الديون
   */
  const generateDebtsReport = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tasks'));
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = tasks.filter(t => Number(t.remaining_amount || 0) > 0 && isInRange(t.created_at || t.date));

      const totalDebt = filtered.reduce((sum, t) => sum + Number(t.remaining_amount || 0), 0);
      const totalValue = filtered.reduce((sum, t) => sum + Number(t.total_price || 0), 0);

      setReportResult({
        title: '📋 تقرير الديون',
        icon: <AlertCircle size={24} className="text-amber-500" />,
        summaryCards: [
          { label: 'إجمالي الديون', value: formatCurrency(totalDebt), color: 'text-rose-600', icon: <DollarSign size={20} /> },
          { label: 'القيمة الإجمالية', value: formatCurrency(totalValue), color: 'text-slate-600', icon: <Wallet size={20} /> },
          { label: 'عدد المهام المدينة', value: String(filtered.length), color: 'text-amber-600', icon: <AlertCircle size={20} /> },
          { label: 'نسبة الدين', value: totalValue > 0 ? `${((totalDebt / totalValue) * 100).toFixed(1)}%` : '0%', color: 'text-yazal-cyan', icon: <PieChart size={20} /> },
        ],
        headers: ['رقم المهمة', 'العميل', 'الخدمة', 'الإجمالي', 'المدفوع', 'المتبقي', 'تاريخ الإنشاء', 'الحالة', 'الموظف'],
        rows: filtered.map(t => [
          t.task_id || t.id || '-',
          t.client_name || t.client_id || '-',
          t.service_name || t.service_id || '-',
          formatCurrency(Number(t.total_price || 0)),
          formatCurrency(Number(t.paid_amount || 0)),
          formatCurrency(Number(t.remaining_amount || 0)),
          parseDate(t.created_at)?.toLocaleDateString('ar-EG') || '-',
          t.status === 'new' ? 'جديد' : t.status === 'processing' ? 'قيد التنفيذ' : t.status === 'completed' ? 'مكتمل' : 'ملغي',
          t.created_by_employee_name || t.assigned_to || t.created_by || '-'
        ]),
        rawData: filtered,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير العملاء التفصيلي
   */
  const generateClientDetailedReport = async () => {
    if (!selectedClientId) {
      alert('الرجاء اختيار عميل من القائمة');
      return;
    }
    setLoading(true);
    try {
      const client = clients.find(c => c.client_id === selectedClientId);
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const clientTasks = tasks.filter(t => t.client_id === selectedClientId && isInRange(t.created_at || t.date));

      const totalValue = clientTasks.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
      const totalPaid = clientTasks.reduce((sum, t) => sum + Number(t.paid_amount || 0), 0);
      const totalRemaining = clientTasks.reduce((sum, t) => sum + Number(t.remaining_amount || 0), 0);
      const totalExpenses = clientTasks.reduce((sum, t) => sum + Number(t.expense_amount || 0), 0);

      setReportResult({
        title: `👤 كشف حساب العميل: ${client?.name || selectedClientId}`,
        icon: <Users size={24} className="text-yazal-cyan" />,
        summaryCards: [
          { label: 'إجمالي قيمة الخدمات', value: formatCurrency(totalValue), color: 'text-yazal-navy', icon: <DollarSign size={20} /> },
          { label: 'المدفوع', value: formatCurrency(totalPaid), color: 'text-emerald-600', icon: <CheckCircle size={20} /> },
          { label: 'المتبقي', value: formatCurrency(totalRemaining), color: totalRemaining > 0 ? 'text-rose-600' : 'text-emerald-600', icon: <AlertCircle size={20} /> },
          { label: 'عدد المعاملات', value: String(clientTasks.length), color: 'text-slate-600', icon: <FileText size={20} /> },
        ],
        headers: ['رقم المعاملة', 'الخدمة', 'التاريخ', 'الحالة', 'الإجمالي', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الموظف'],
        rows: clientTasks.map(t => [
          t.task_id || t.id || '-',
          t.service_name || t.service_id || '-',
          parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-',
          t.status === 'new' ? 'جديد' : t.status === 'processing' ? 'قيد التنفيذ' : t.status === 'completed' ? 'مكتمل' : 'ملغي',
          formatCurrency(Number(t.total_price || 0)),
          formatCurrency(Number(t.paid_amount || 0)),
          formatCurrency(Number(t.remaining_amount || 0)),
          t.payment_method || '-',
          t.created_by_employee_name || t.assigned_to || t.created_by || '-'
        ]),
        rawData: clientTasks,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير الموظف (كشف حساب موظف)
   */
  const generateEmployeeReport = async () => {
    if (!selectedEmployeeId) {
      alert('الرجاء اختيار موظف من القائمة');
      return;
    }
    setLoading(true);
    try {
      const employee = employees.find(e => e.uid === selectedEmployeeId);
      const empName = employee?.username || selectedEmployeeId;

      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const employeeTasks = tasks.filter(t => {
        const assigned = t.assigned_to === empName || t.created_by === empName || t.created_by_employee_name === empName;
        return assigned && isInRange(t.created_at || t.date);
      });

      const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
      const expensesList = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const employeeExpenses = expensesList.filter(e => {
        const linked = e.employee_name === empName || e.logged_by === empName;
        return linked && isInRange(e.date);
      });

      const totalTasksValue = employeeTasks.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
      const totalRevenue = employeeTasks.reduce((sum, t) => sum + Number(t.paid_amount || 0), 0);
      const totalDebtCollected = employeeTasks.reduce((sum, t) => sum + Number(t.remaining_amount || 0), 0);
      const totalExpenses = employeeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const completedTasks = employeeTasks.filter(t => t.status === 'completed').length;
      const pendingTasks = employeeTasks.filter(t => t.status === 'new' || t.status === 'processing').length;

      const clientIds = [...new Set(employeeTasks.map((t: any) => t.client_id))];
      const employeeClients = clients.filter(c => clientIds.includes(c.client_id));
      const totalClientDebt = employeeClients.reduce((sum, c) => sum + Number(c.total_debt || 0), 0);

      setReportResult({
        title: `👨‍💼 كشف حساب الموظف: ${empName}`,
        icon: <UserCheck size={24} className="text-yazal-cyan" />,
        summaryCards: [
          { label: 'إجمالي قيمة المهام', value: formatCurrency(totalTasksValue), color: 'text-yazal-navy', icon: <Wallet size={20} /> },
          { label: 'الإيرادات المحققة', value: formatCurrency(totalRevenue), color: 'text-emerald-600', icon: <TrendingUp size={20} /> },
          { label: 'المهام المنجزة', value: `${completedTasks} / ${employeeTasks.length}`, color: 'text-emerald-600', icon: <CheckCircle size={20} /> },
          { label: 'المهام المعلقة', value: String(pendingTasks), color: pendingTasks > 0 ? 'text-amber-600' : 'text-emerald-600', icon: <Clock size={20} /> },
          { label: 'المصروفات المسجلة', value: formatCurrency(totalExpenses), color: totalExpenses > 0 ? 'text-rose-600' : 'text-emerald-600', icon: <Receipt size={20} /> },
          { label: 'ديون العملاء المرتبطين', value: formatCurrency(totalClientDebt), color: totalClientDebt > 0 ? 'text-amber-600' : 'text-emerald-600', icon: <AlertCircle size={20} /> },
        ],
        headers: ['النوع', 'التفاصيل', 'التاريخ', 'القيمة', 'الحالة'],
        rows: [
          ...employeeTasks.map((t: any) => [
            'مهمة',
            `${t.service_name || t.service_id} - ${t.client_name || t.client_id}`,
            parseDate(t.created_at || t.date)?.toLocaleDateString('ar-EG') || '-',
            formatCurrency(Number(t.total_price || 0)),
            t.status === 'new' ? 'جديد' : t.status === 'processing' ? 'قيد التنفيذ' : t.status === 'completed' ? 'مكتمل' : 'ملغي'
          ]),
          ...employeeExpenses.map((e: any) => [
            'مصروف',
            e.title || e.description || '-',
            parseDate(e.date)?.toLocaleDateString('ar-EG') || '-',
            formatCurrency(Number(e.amount || 0)),
            'مسجل'
          ])
        ],
        rawData: [...employeeTasks, ...employeeExpenses],
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير العملاء (عام)
   */
  const generateClientsReport = async () => {
    setLoading(true);
    try {
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const clientsList = clientsSnap.docs.map(d => d.data() as Client);
      const totalDebt = clientsList.reduce((sum, c) => sum + Number(c.total_debt || 0), 0);
      const withDebt = clientsList.filter(c => Number(c.total_debt || 0) > 0).length;

      setReportResult({
        title: '👥 تقرير العملاء',
        icon: <Users size={24} className="text-yazal-cyan" />,
        summaryCards: [
          { label: 'إجمالي العملاء', value: String(clientsList.length), color: 'text-yazal-navy', icon: <Users size={20} /> },
          { label: 'إجمالي الديون', value: formatCurrency(totalDebt), color: totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600', icon: <DollarSign size={20} /> },
          { label: 'عملاء مدينون', value: String(withDebt), color: withDebt > 0 ? 'text-amber-600' : 'text-emerald-600', icon: <AlertCircle size={20} /> },
          { label: 'نسبة المديونية', value: clientsList.length > 0 ? `${((withDebt / clientsList.length) * 100).toFixed(1)}%` : '0%', color: 'text-yazal-cyan', icon: <PieChart size={20} /> },
        ],
        headers: ['كود العميل', 'اسم العميل', 'الهاتف', 'رقم الجواز', 'إجمالي الديون', 'تاريخ التسجيل'],
        rows: clientsList.map(c => [
          c.client_id || '-',
          c.name || '-',
          c.phone || '-',
          c.passport_no || '-',
          formatCurrency(Number(c.total_debt || 0)),
          parseDate(c.created_at)?.toLocaleDateString('ar-EG') || '-'
        ]),
        rawData: clientsList,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير الموظفين (عام)
   */
  const generateEmployeesReport = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => d.data() as UserProfile);
      const activeCount = users.filter(u => u.is_active !== false).length;
      const rolesCount = users.reduce((acc: Record<string, number>, u) => {
        acc[u.role || 'staff'] = (acc[u.role || 'staff'] || 0) + 1;
        return acc;
      }, {});

      setReportResult({
        title: '👔 تقرير الموظفين',
        icon: <Users size={24} className="text-yazal-navy" />,
        summaryCards: [
          { label: 'إجمالي الموظفين', value: String(users.length), color: 'text-yazal-navy', icon: <Users size={20} /> },
          { label: 'الموظفين النشطين', value: String(activeCount), color: 'text-emerald-600', icon: <CheckCircle size={20} /> },
          { label: 'الأدوار المختلفة', value: String(Object.keys(rolesCount).length), color: 'text-yazal-cyan', icon: <Filter size={20} /> },
          { label: 'غير نشطين', value: String(users.length - activeCount), color: (users.length - activeCount) > 0 ? 'text-rose-600' : 'text-emerald-600', icon: <X size={20} /> },
        ],
        headers: ['اسم الموظف', 'البريد الإلكتروني', 'الدور', 'الصلاحيات', 'الحالة', 'تاريخ التسجيل'],
        rows: users.map(u => [
          u.username || '-',
          u.email || '-',
          u.role || 'staff',
          `${u.permissions?.length || 0} صلاحية`,
          u.is_active !== false ? 'نشط' : 'معطل',
          parseDate(u.created_at)?.toLocaleDateString('ar-EG') || '-'
        ]),
        rawData: users,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تقرير طرق الدفع
   */
  const generatePaymentMethodReport = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tasks'));
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const grouped = tasks.reduce((acc: Record<string, { count: number; total: number; paid: number }>, t) => {
        const method = t.payment_method || 'غير محدد';
        if (!acc[method]) acc[method] = { count: 0, total: 0, paid: 0 };
        acc[method].count++;
        acc[method].total += Number(t.total_price || 0);
        acc[method].paid += Number(t.paid_amount || 0);
        return acc;
      }, {});

      const grandTotal = Object.values(grouped).reduce((s, g) => s + g.total, 0);

      setReportResult({
        title: '💳 تقرير طرق الدفع',
        icon: <CreditCard size={24} className="text-yazal-cyan" />,
        summaryCards: [
          { label: 'عدد طرق الدفع', value: String(Object.keys(grouped).length), color: 'text-yazal-navy', icon: <CreditCard size={20} /> },
          { label: 'إجمالي المبيعات', value: formatCurrency(grandTotal), color: 'text-emerald-600', icon: <DollarSign size={20} /> },
        ],
        headers: ['طريقة الدفع', 'عدد المعاملات', 'إجمالي المبيعات', 'إجمالي المدفوع'],
        rows: Object.entries(grouped).map(([method, data]) => [
          method,
          String(data.count),
          formatCurrency(data.total),
          formatCurrency(data.paid)
        ]),
        rawData: Object.entries(grouped),
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب التقرير');
    } finally {
      setLoading(false);
    }
  };

  const reportButtons = [
    { id: 'revenue', label: '📊 تقرير الإيرادات', desc: 'تحليل الإيرادات والمبيعات المكتملة مع التفاصيل', color: 'from-emerald-500 to-emerald-600', icon: TrendingUp, action: generateRevenueReport, permission: null },
    { id: 'expenses', label: '💰 تقرير المصروفات', desc: 'تحليل المصروفات التشغيلية حسب الفئات والتواريخ', color: 'from-rose-500 to-rose-600', icon: Receipt, action: generateExpensesReport, permission: null },
    { id: 'debts', label: '📋 تقرير الديون', desc: 'قائمة الديون المستحقة والمبالغ المتبقية على العملاء', color: 'from-amber-500 to-amber-600', icon: AlertCircle, action: generateDebtsReport, permission: null },
    { id: 'clients', label: '👥 تقرير العملاء العام', desc: 'إحصائيات وإجماليات العملاء والديون', color: 'from-yazal-cyan to-cyan-600', icon: Users, action: generateClientsReport, permission: null },
    { id: 'employees', label: '👔 تقرير الموظفين', desc: 'إحصائيات الموظفين والأدوار والصلاحيات', color: 'from-yazal-navy to-blue-900', icon: UserCheck, action: generateEmployeesReport, permission: 'admin' },
    { id: 'payment-methods', label: '💳 تقرير طرق الدفع', desc: 'تحليل طرق الدفع المستخدمة في المعاملات', color: 'from-purple-500 to-purple-600', icon: CreditCard, action: generatePaymentMethodReport, permission: null },
  ];

  const specialReports = [
    { id: 'client-detailed', label: '👤 كشف حساب عميل تفصيلي', desc: 'جميع معاملات عميل محدد مع الديون والمدفوعات', color: 'from-sky-500 to-sky-600', icon: Users },
    { id: 'employee-detailed', label: '👨‍💼 كشف حساب موظف تفصيلي', desc: 'المهام والإيرادات والمصروفات والديون المرتبطة بموظف', color: 'from-teal-500 to-teal-600', icon: UserCheck },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* الهيدر */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-3">
            <BarChart3 className="text-yazal-cyan" size={32} />
            التقارير والتحليلات
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Yazal Reports Dashboard • Financial & Operational Analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {reportResult && (
            <button
              onClick={() => downloadCSV(reportResult)}
              className="bg-yazal-navy text-white font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-yazal-navy-light transition-all"
            >
              <Download size={18} />
              تصدير CSV
            </button>
          )}
        </div>
      </div>

      {/* فلترة التاريخ */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-yazal-navy dark:text-white">
          <CalendarDays size={18} className="text-yazal-cyan" />
          الفترة الزمنية للتقارير
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">من تاريخ</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full p-4 bg-slate-50 dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-yazal-cyan"
            />
          </div>
        </div>
      </div>

      {/* تقارير سريعة */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-2">
          <BarChart3 size={20} className="text-yazal-cyan" />
          التقارير السريعة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportButtons.map(report => {
            if (report.permission && !hasPermission(report.permission)) return null;
            return (
              <motion.button
                key={report.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={report.action}
                className={`bg-gradient-to-br ${report.color} text-white p-6 rounded-3xl shadow-lg text-right transition-all h-32 flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <report.icon size={24} />
                  <ArrowUpRight size={18} className="opacity-60" />
                </div>
                <div>
                  <h3 className="font-black text-sm">{report.label}</h3>
                  <p className="text-[10px] text-white/70 font-bold mt-1">{report.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* التقارير التفصيلية */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Search size={20} className="text-yazal-cyan" />
          التقارير التفصيلية
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* كشف حساب موظف */}
          <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-600">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-yazal-navy dark:text-white text-sm">كشف حساب موظف</h3>
                <p className="text-[10px] font-bold text-slate-400">المهام + الإيرادات + المصروفات + الديون</p>
              </div>
            </div>
            <div className="space-y-3">
              <SearchableSelect
                options={employees.map(e => ({
                  value: e.uid,
                  label: e.username,
                  sublabel: `${e.role} • ${e.permissions?.length || 0} صلاحيات`
                }))}
                value={selectedEmployeeId}
                onChange={setSelectedEmployeeId}
                placeholder="ابحث عن موظف..."
                title="اختر الموظف لعرض كشف حسابه"
              />
              <div className="flex gap-3">
                {hasPermission('view_financial_reports') && (
                  <button
                    onClick={generateEmployeeReport}
                    disabled={!selectedEmployeeId}
                    className="flex-1 p-4 bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 hover:brightness-110 transition-all"
                  >
                    عرض كشف الحساب
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!selectedEmployeeId) return;
                    const employee = employees.find(e => e.uid === selectedEmployeeId);
                    if (!employee) return;
                    const empName = employee?.username || selectedEmployeeId;
                    const tasksSnap = await getDocs(collection(db, 'tasks'));
                    const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                    const employeeTasks = tasks.filter(t => t.assigned_to === empName || t.created_by === empName);
                    const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
                    const expensesList = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                    const employeeExpenses = expensesList.filter(e => e.employee_name === empName);
                    const totalRevenue = employeeTasks.reduce((sum, t) => sum + Number(t.paid_amount || 0), 0);
                    const totalExpenses = employeeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    const totalTasks = employeeTasks.reduce((sum, t) => sum + Number(t.total_price || 0), 0);
                    const totalDebt = employeeTasks.reduce((sum, t) => sum + Number(t.remaining_amount || 0), 0);
                    
                    const transactions = [
                      ...employeeTasks.map((t: any) => ({ type: 'task' as const, description: `${t.service_name || t.service_id} - ${t.client_name || t.client_id}`, date: t.created_at?.toDate?.()?.toLocaleDateString('ar-EG') || '-', amount: Number(t.total_price || 0) })),
                      ...employeeExpenses.map((e: any) => ({ type: 'expense' as const, description: e.title || e.description || '-', date: e.date?.toDate?.()?.toLocaleDateString('ar-EG') || '-', amount: Number(e.amount || 0) }))
                    ];
                    
                    await exportEmployeeStatementPDF({
                      employeeName: empName,
                      employeeRole: employee?.role || 'Staff',
                      period: `${dateRange.from || 'الكل'} → ${dateRange.to || 'الكل'}`,
                      totalTasks: employeeTasks.length,
                      totalRevenue,
                      totalExpenses,
                      totalWithdrawals: 0,
                      totalClientDebts: totalDebt,
                      netBalance: totalRevenue - totalExpenses,
                      transactions
                    });
                  }}
                  disabled={!selectedEmployeeId}
                  className="p-4 bg-white dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 text-yazal-navy dark:text-white rounded-2xl font-black hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                  title="تصدير PDF"
                >
                  <FileDown size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* كشف حساب عميل */}
          <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-black text-yazal-navy dark:text-white text-sm">كشف حساب عميل تفصيلي</h3>
                <p className="text-[10px] font-bold text-slate-400">الخدمات + الديون + المدفوعات + المتبقي</p>
              </div>
            </div>
            <div className="space-y-3">
              <SearchableSelect
                options={clients.map(c => ({
                  value: c.client_id,
                  label: c.name,
                  sublabel: `${c.phone} • دين: ${Number(c.total_debt || 0).toLocaleString()}`
                }))}
                value={selectedClientId}
                onChange={setSelectedClientId}
                placeholder="ابحث عن عميل..."
                title="اختر العميل لعرض كشف حسابه"
              />
              <div className="flex gap-3">
                <button
                  onClick={generateClientDetailedReport}
                  disabled={!selectedClientId}
                  className="flex-1 p-4 bg-gradient-to-l from-sky-500 to-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  عرض كشف الحساب
                </button>
                <button
                  onClick={async () => {
                    if (!selectedClientId) return;
                    const client = clients.find(c => c.client_id === selectedClientId);
                    if (!client) return;
                    const tasksSnap = await getDocs(collection(db, 'tasks'));
                    const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                    const clientTasks = tasks.filter((t: any) => t.client_id === selectedClientId);
                    const totalServices = clientTasks.reduce((sum: number, t: any) => sum + Number(t.total_price || 0), 0);
                    const totalPaid = clientTasks.reduce((sum: number, t: any) => sum + Number(t.paid_amount || 0), 0);
                    const totalRemaining = clientTasks.reduce((sum: number, t: any) => sum + Number(t.remaining_amount || 0), 0);
                    
                    await exportClientStatementPDF({
                      clientName: client.name,
                      clientId: client.client_id,
                      clientPhone: client.phone || '',
                      clientPassport: client.passport_no,
                      period: `${dateRange.from || 'الكل'} → ${dateRange.to || 'الكل'}`,
                      totalServices,
                      totalPaid,
                      totalRemaining,
                      transactions: clientTasks.map((t: any) => ({
                        taskId: t.task_id || t.id,
                        serviceName: t.service_name || t.service_id,
                        date: t.created_at?.toDate?.()?.toLocaleDateString('ar-EG') || '-',
                        status: t.status,
                        totalPrice: Number(t.total_price || 0),
                        paidAmount: Number(t.paid_amount || 0),
                        remainingAmount: Number(t.remaining_amount || 0)
                      }))
                    });
                  }}
                  disabled={!selectedClientId}
                  className="p-4 bg-white dark:bg-yazal-navy-dark border border-slate-200 dark:border-white/5 text-yazal-navy dark:text-white rounded-2xl font-black hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                  title="تصدير PDF"
                >
                  <FileDown size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* عرض التقرير */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 text-center space-y-4"
          >
            <div className="w-16 h-16 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 font-black text-sm uppercase tracking-widest">جاري تحضير التقرير...</p>
          </motion.div>
        )}

        {reportResult && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* عنوان التقرير */}
            <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {reportResult.icon}
                <div>
                  <h2 className="text-xl font-black text-yazal-navy dark:text-white">{reportResult.title}</h2>
                  <p className="text-xs font-bold text-slate-400">الفترة: {dateRange.from || 'الكل'} → {dateRange.to || 'الكل'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (reportResult) {
                      exportReportPDF({
                        title: reportResult.title,
                        period: `${dateRange.from || 'الكل'} → ${dateRange.to || 'الكل'}`,
                        summaryCards: reportResult.summaryCards.map(c => ({
                          label: c.label,
                          value: c.value,
                          color: c.color.replace('text-', '#')
                        })),
                        headers: reportResult.headers,
                        rows: reportResult.rows
                      });
                    }
                  }}
                  className="p-3 bg-yazal-navy text-white rounded-2xl hover:bg-yazal-navy-light transition-all"
                  title="تصدير PDF"
                >
                  <FileDown size={20} />
                </button>
                <button
                  onClick={() => downloadCSV(reportResult)}
                  className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-500 hover:text-yazal-cyan transition-all"
                  title="تصدير CSV"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>

            {/* بطاقات الملخص */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reportResult.summaryCards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-yazal-navy-light p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* جدول البيانات */}
            <div className="bg-white dark:bg-yazal-navy-light rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-yazal-navy text-white text-[10px] uppercase tracking-widest sticky top-0">
                    <tr>
                      {reportResult.headers.map((h, i) => (
                        <th key={i} className="px-4 py-4 font-black border-r border-white/10 last:border-r-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {reportResult.rows.length === 0 ? (
                      <tr>
                        <td colSpan={reportResult.headers.length} className="px-8 py-16 text-center text-slate-400 font-bold text-sm">
                          لا توجد بيانات للعرض
                        </td>
                      </tr>
                    ) : (
                      reportResult.rows.map((row, ri) => (
                        <tr key={ri} className={`${ri % 2 === 0 ? 'bg-slate-50/50 dark:bg-yazal-navy-dark/30' : ''} hover:bg-slate-100 dark:hover:bg-white/5 transition-colors`}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 border-t border-slate-50 dark:border-white/5 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-yazal-navy-dark border-t border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400">
                  إجمالي السجلات: {reportResult.rows.length}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;

