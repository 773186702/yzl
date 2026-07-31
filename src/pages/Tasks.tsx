/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  QrCode, 
  Share2, 
  MessageSquare, 
  Eye, 
  X, 
  Check, 
  Printer, 
  ArrowRight,
  DollarSign,
  Trash2,
  Play,
  UserCheck,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, showBrowserNotification } from '../lib/firebase';
import { Task, TaskWorkflowStep } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playStatusUpdateAlert, playNewOrderAlert } from '../lib/sound';
import { exportArabicInvoicePDF } from '../lib/pdfExporter';
import { logActivity } from '../lib/audit';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';

/**
 * دالة مساعدة لإنشاء خطوة سير عمل جديدة
 */
const createWorkflowStep = (task: Task, newStatus: string, profile: any): TaskWorkflowStep => ({
  from_status: task.status,
  to_status: newStatus,
  changed_by: profile?.uid || 'unknown',
  changed_by_name: profile?.username || 'غير معروف',
  changed_by_role: profile?.role || 'unknown',
  timestamp: new Date().toISOString(),
});

/**
 * دالة مساعدة لإرسال إشعار إلى Firestore (مجموعة notifications)
 */
const sendNotification = async (notification: {
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'normal';
  type: 'task_update' | 'deadline_approaching' | 'system' | 'payment';
  target_role?: string;
  task_id?: string;
}) => {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      ...notification,
      read: false,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to send notification:', err);
  }
};

/**
 * صفحة إدارة المعاملات والمهام (Task Ledger Workflow)
 * - نظام متقدم لتتبع سير عمل المهام مع تسجيل كامل للمستخدمين
 * - صلاحيات صارمة: المدير/محاسب فقط يعتمد، المندوب فقط ينفذ، المنفذ فقط يكمل
 * - منع إعادة المهام المكتملة أو تنفيذها من قبل مندوب آخر
 * - إشعارات فورية للمستخدمين المعنيين
 */
const Tasks: React.FC = () => {
  const { language } = useApp();
  const { user, profile, hasPermission } = useAuth();
  const t = translations[language as 'ar' | 'en'];

  // الحالات ومجموعات البيانات
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeInvoiceTask, setActiveInvoiceTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  // جلب كافة المهام بمزامنة فورية حية
  useEffect(() => {
    setLoading(true);
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((docSnap) => {
        taskList.push({ task_id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasks(taskList);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to tasks:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * التحقق من صلاحية المستخدم لتغيير حالة مهمة محددة
   */
  const canChangeStatus = useCallback((task: Task, newStatus: string): { allowed: boolean; reason: string } => {
    // الحالة 1: المهمة مكتملة - لا يمكن تغييرها أبداً
    if (task.status === 'completed') {
      return { allowed: false, reason: 'لا يمكن تغيير حالة مهمة مكتملة' };
    }

    // الحالة 2: المهمة ملغية - لا يمكن تغييرها
    if (task.status === 'cancelled') {
      return { allowed: false, reason: 'لا يمكن تغيير حالة مهمة ملغية' };
    }

    // الحالة 3: الموافقة (pending_approval -> approved)
    if (newStatus === 'approved') {
      if (task.status !== 'pending_approval') {
        return { allowed: false, reason: 'المهمة ليست بانتظار الاعتماد' };
      }
      if (profile?.role !== 'admin' && profile?.role !== 'accountant') {
        return { allowed: false, reason: 'فقط المدير أو المحاسب يمكنه اعتماد المهام' };
      }
      return { allowed: true, reason: '' };
    }

    // الحالة 4: بدء التنفيذ (approved -> processing)
    if (newStatus === 'processing') {
      if (task.status !== 'approved') {
        return { allowed: false, reason: 'المهمة غير معتمدة بعد' };
      }
      // التحقق: هل بدأ مندوب آخر التنفيذ بالفعل؟
      if (task.processing_by && task.processing_by !== profile?.uid) {
        return { allowed: false, reason: 'هذه المهمة قيد التنفيذ من قبل مندوب آخر' };
      }
      if (task.processing_by === profile?.uid) {
        return { allowed: false, reason: 'أنت بالفعل تنفذ هذه المهمة' };
      }
      if (profile?.role !== 'agent' && profile?.role !== 'admin') {
        return { allowed: false, reason: 'فقط المندوب يمكنه تنفيذ المهام' };
      }
      if (!hasPermission('execute_task')) {
        return { allowed: false, reason: 'لا تملك صلاحية تنفيذ المهام' };
      }
      return { allowed: true, reason: '' };
    }

    // الحالة 5: الإكمال (processing -> completed)
    if (newStatus === 'completed') {
      if (task.status !== 'processing') {
        return { allowed: false, reason: 'المهمة ليست قيد التنفيذ' };
      }
      // فقط المندوب الذي بدأ التنفيذ يمكنه الإكمال
      if (task.processing_by && task.processing_by !== profile?.uid) {
        return { allowed: false, reason: 'فقط المندوب الذي ينفذ المهمة يمكنه إكمالها' };
      }
      if (!task.processing_by) {
        return { allowed: false, reason: 'لم يتم تعيين منفذ لهذه المهمة' };
      }
      return { allowed: true, reason: '' };
    }

    // الحالة 6: الإلغاء (من أي حالة إلى cancelled)
    if (newStatus === 'cancelled') {
      if (profile?.role !== 'admin' && profile?.role !== 'accountant') {
        return { allowed: false, reason: 'فقط المدير أو المحاسب يمكنه إلغاء المهام' };
      }
      return { allowed: true, reason: '' };
    }

    // الحالة 7: إرسال للاعتماد (new -> pending_approval)
    if (newStatus === 'pending_approval') {
      if (task.status !== 'new') {
        return { allowed: false, reason: 'المهمة ليست جديدة' };
      }
      return { allowed: true, reason: '' };
    }

    return { allowed: false, reason: 'تغيير الحالة غير مسموح به' };
  }, [profile, hasPermission]);

  /**
   * معالج تحديث حالة المهمة مع سير العمل الكامل (Workflow Tracking)
   */
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setError(null);
    
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) {
      setError('المهمة غير موجودة');
      return;
    }

    // التحقق من الصلاحية
    const { allowed, reason } = canChangeStatus(task, newStatus);
    if (!allowed) {
      setError(reason);
      setTimeout(() => setError(null), 4000);
      return;
    }

    // إنشاء خطوة سير العمل
    const step = createWorkflowStep(task, newStatus, profile);
    const currentHistory = task.workflow_history || [];
    
    // حقل التحديث العام
    const updateFields: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      workflow_history: [...currentHistory, step],
    };

    // إضافة حقول خاصة حسب الحالة الجديدة
    if (newStatus === 'approved') {
      updateFields.approved_by = profile?.uid || '';
      updateFields.approved_by_name = profile?.username || '';
      updateFields.approved_at = new Date().toISOString();
    } else if (newStatus === 'processing') {
      updateFields.processing_by = profile?.uid || '';
      updateFields.processing_by_name = profile?.username || '';
      updateFields.processing_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateFields.completed_by = profile?.uid || '';
      updateFields.completed_by_name = profile?.username || '';
      updateFields.completed_at = new Date().toISOString();
    } else if (newStatus === 'cancelled') {
      updateFields.cancelled_by = profile?.uid || '';
      updateFields.cancelled_by_name = profile?.username || '';
      updateFields.cancelled_at = new Date().toISOString();
    }

    try {
      await updateDoc(doc(db, 'tasks', taskId), updateFields);

      // تشغيل التنبيه الصوتي
      playStatusUpdateAlert();
      
      // عرض إشعار متصفح
      const statusLabels: Record<string, string> = {
        approved: 'معتمد',
        processing: 'قيد التنفيذ',
        completed: 'مكتمل',
        cancelled: 'ملغي',
        pending_approval: 'بانتظار الاعتماد',
      };
      
      showBrowserNotification('تحديث حالة المهمة', {
        body: `تم تغيير حالة المهمة #${taskId} إلى ${statusLabels[newStatus] || newStatus}`
      });

      // إرسال إشعارات إلى Firestore للمستخدمين المعنيين
      if (newStatus === 'pending_approval') {
        await sendNotification({
          title: 'مهمة جديدة بانتظار الاعتماد',
          body: `المهمة #${taskId} - ${task.service_name || ''} بانتظار اعتمادك`,
          priority: 'high',
          type: 'task_update',
          task_id: taskId,
        });
      } else if (newStatus === 'approved') {
        await sendNotification({
          title: 'مهمة معتمدة وجاهزة للتنفيذ',
          body: `المهمة #${taskId} - ${task.service_name || ''} تم اعتمادها، يمكنك البدء بالتنفيذ`,
          priority: 'high',
          type: 'task_update',
          task_id: taskId,
        });
      } else if (newStatus === 'completed') {
        await sendNotification({
          title: 'تم إكمال المهمة 🎉',
          body: `المهمة #${taskId} - ${task.service_name || ''} تم إكمالها بنجاح بواسطة ${profile?.username || ''}`,
          priority: 'high',
          type: 'task_update',
          task_id: taskId,
        });
      }

      await logActivity('تحديث حالة معاملة', 
        `تم تغيير حالة المهمة (${taskId}) من ${task.status} إلى ${newStatus} بواسطة ${profile?.username || ''}`
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('حدث خطأ أثناء تحديث حالة المهمة.');
    }
  };

  /**
   * حذف مهمة
   */
  const handleDeleteTask = async (task: Task) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه المهمة نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'tasks', task.task_id));
        await updateDoc(doc(db, 'clients', task.client_id), {
          total_debt: increment(-task.remaining_amount)
        });
        await logActivity('حذف مهمة', `تم حذف المهمة رقم: ${task.task_id}`);
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('حدث خطأ أثناء الحذف.');
      }
    }
  };

  /**
   * إنشاء وتنسيق رسالة الواتساب الرسمية وتصديرها مباشرة لهاتف العميل
   * @param task - المعاملة المراد إرسال تفاصيلها عبر واتساب
   */
  const handleWhatsAppDispatch = (task: Task) => {
    // طلب أو تأكيد رقم العميل
    const rawPhone = prompt('أدخل رقم واتساب العميل (مع رمز الدولة):', '967770000000');
    if (!rawPhone) return;

    const cleanPhone = rawPhone.replace(/[^\d]/g, '');
    const message = 
      `*شركة يزل للسفريات والخدمات اللوجستية* ✈️\n` +
      `-----------------------------------\n` +
      `عزيزنا العميل: *${task.client_name || task.client_id}*\n\n` +
      `يسرنا إفادتكم بتحديث تفاصيل معاملتكم لدى شركة يزل للسفريات والخدمات اللوجستية:\n` +
      `• *رقم الطلب:* #${task.task_id}\n` +
      `• *الخدمة:* ${task.service_name || task.service_id}\n` +
      `• *حالة الطلب:* ${t[task.status] || task.status}\n` +
      `• *الإجمالي:* ${task.total_price.toLocaleString()} ${task.original_currency}\n` +
      `• *المدفوع:* ${task.paid_amount.toLocaleString()} ${task.original_currency}\n` +
      `• *المتبقي:* ${task.remaining_amount.toLocaleString()} ${task.original_currency}\n\n` +
      `📌 *رابط الفاتورة المعتمدة والتحقق:* \n` +
      `https://yzl-travel.com/invoice/${task.task_id}\n\n` +
      `نشكركم لاختياركم شركة يزل للسفريات والخدمات اللوجستية، وسعداء بخدمتكم دائماً! 🌟`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  /**
   * تصدير الفاتورة الرسمية بصيغة PDF وتصميم معتمد باللغة العربية مع رمز استجابة سريعة (QR Code) للتحقق الرقمي
   * 
   * @param task - بيانات المعاملة أو الطلب المراد إصدار الفاتورة له
   */
  const exportInvoiceToPDF = async (task: Task) => {
    await exportArabicInvoicePDF({
      invoiceId: task.task_id,
      clientName: task.client_name || task.client_id,
      clientId: task.client_id,
      serviceName: task.service_name || task.service_id,
      totalAmount: task.total_price,
      paidAmount: task.paid_amount,
      remainingAmount: task.remaining_amount,
      currency: task.original_currency,
      status: task.status,
      paymentMethod: task.payment_method || 'نقداً',
      date: new Date().toLocaleDateString('ar-EG'),
      notes: task.notes || 'فاتورة رسمية صادرة من شركة يزل للسفريات والخدمات اللوجستية.',
      passportNumber: task.passport_number
    });
  };

  // تصفية المهام
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.task_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.client_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.client_name && task.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.service_name && task.service_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* الهيدر العلوي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
            {t.tasks_title}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {t.tasks_subtitle}
          </p>
        </div>

        <a 
          href="/tasks/new"
          className="bg-yazal-cyan hover:bg-yazal-cyan-dark text-yazal-navy font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-yazal-cyan/20 transition-all active:scale-95 uppercase tracking-widest text-xs self-start md:self-auto"
        >
          <Plus size={20} />
          {t.add_task}
        </a>
      </div>

{/* أدوات البحث والتصفية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-yazal-navy-light p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.task_search_placeholder}
            className="w-full bg-transparent outline-none text-sm text-yazal-navy dark:text-white placeholder:text-slate-400"
          />
        </div>

        {/* أزرار تصفية الحالة */}
        <div className="flex bg-white dark:bg-yazal-navy-light p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'pending_approval', label: 'بانتظار الاعتماد' },
            { id: 'approved', label: 'معتمد' },
            { id: 'processing', label: 'قيد التنفيذ' },
            { id: 'completed', label: 'مكتمل' },
            { id: 'cancelled', label: 'ملغي' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase transition-all whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-yazal-navy text-white shadow-md' : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Ban size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* جدول/شبكة عرض المعاملات */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-yazal-cyan/20 border-t-yazal-cyan rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">جاري مزامنة المعاملات الحية...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">لا توجد معاملات كافية لهذه التصفية</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">قم بإنشاء معاملة جديدة أو قم بتعديل معايير البحث</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredTasks.map((task) => (
              <div 
                key={task.task_id}
                className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
              >
                {/* التفاصيل الرئيسية للمهمة */}
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-md ${
                    task.status === 'completed' ? 'bg-emerald-500' :
                    task.status === 'approved' ? 'bg-blue-500' :
                    task.status === 'processing' ? 'bg-yazal-cyan' :
                    task.status === 'pending_approval' ? 'bg-amber-500' : 'bg-yazal-navy'
                  }`}>
                    {task.status === 'completed' ? <CheckCircle2 size={24} /> :
                     task.status === 'approved' ? <Check size={24} /> :
                     task.status === 'processing' ? <Clock size={24} /> :
                     task.status === 'pending_approval' ? <AlertCircle size={24} /> : <XCircle size={24} />}
                  </div>

<div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-lg text-yazal-navy dark:text-white uppercase tracking-tight">
                        {task.service_name || task.service_id}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-yazal-navy-dark px-2.5 py-1 rounded-md text-slate-500 font-bold uppercase tracking-widest">
                        #{task.task_id}
                      </span>
                      {task.priority && (
                        <span className={`text-[10px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest ${
                          task.priority === 'high' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                          task.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                        }`}>
                          {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'عادي'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 flex-wrap">
                      <span>العميل: <strong className="text-yazal-navy dark:text-slate-200">{task.client_name || task.client_id}</strong></span>
                      <span>طريقة الدفع: <strong className="text-yazal-cyan">{task.payment_method || 'نقد كاش'}</strong></span>
                    </div>
                    
                    {/* معلومات تتبع سير العمل */}
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 flex-wrap mt-1">
                      <span>المنشئ: <strong className="text-yazal-navy dark:text-slate-200">{task.created_by_employee_name || task.created_by || '-'}</strong></span>
                      {task.approved_by_name && <span>المعتمد: <strong className="text-emerald-600">{task.approved_by_name}</strong></span>}
                      {task.processing_by_name && <span>المنفذ: <strong className="text-yazal-cyan">{task.processing_by_name}</strong></span>}
                      {task.completed_by_name && <span>المكمل: <strong className="text-emerald-600">{task.completed_by_name}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* المبالغ والإجراءات */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/5">
                  <div className="text-right">
                    <span className="text-xl font-black text-yazal-navy dark:text-white block">
                      {task.total_price.toLocaleString()} {task.original_currency}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      task.remaining_amount > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {task.remaining_amount > 0 ? `المتبقي: ${task.remaining_amount.toLocaleString()} ${task.original_currency}` : 'مدفوع بالكامل'}
                    </span>
                  </div>

                    {/* أزرار الإجراءات والشير */}
                  <div className="flex items-center gap-2">
                    {/* أزرار الاعتماد للمحاسب */}
                    {task.status === 'pending_approval' && (profile?.role === 'accountant' || profile?.role === 'admin') && (
                      <>
                        <button
                          onClick={() => handleStatusChange(task.task_id, 'approved' as Task['status'])}
                          title={t.approve_task || 'اعتماد المهمة'}
                          className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.task_id, 'cancelled' as Task['status'])}
                          title={t.reject_task || 'رفض المهمة'}
                          className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}

                    {/* زر تنفيذ المهمة للمندوب - بعد الاعتماد */}
                    {task.status === 'approved' && hasPermission('execute_task') && (
                      <button
                        onClick={() => handleStatusChange(task.task_id, 'processing' as Task['status'])}
                        title={t.execute_task_btn || 'تنفيذ المهمة'}
                        className="p-2.5 bg-yazal-cyan text-yazal-navy rounded-xl hover:brightness-110 transition-colors shadow-md shadow-yazal-cyan/20 font-black text-[10px] uppercase"
                      >
                        <Play size={18} />
                      </button>
                    )}

                    {/* خيارات الحالة - يحتاج صلاحية تعديل المهام */}
                    {hasPermission('edit_task') && profile?.role !== 'agent' && (
                      <select 
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.task_id, e.target.value as Task['status'])}
                        className="p-2.5 bg-slate-100 dark:bg-yazal-navy-dark font-black text-xs rounded-xl text-yazal-navy dark:text-white border-none outline-none focus:ring-2 ring-yazal-cyan cursor-pointer"
                      >
                        <option value="pending_approval">بانتظار الاعتماد</option>
                        <option value="approved">معتمد</option>
                        <option value="processing">قيد التنفيذ</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    )}

                    {/* زر الفاتورة كود QR */}
                    <button 
                      onClick={() => setActiveInvoiceTask(task)}
                      title="عرض الفاتورة وكود QR"
                      className="p-2.5 bg-yazal-navy text-yazal-cyan rounded-xl hover:bg-yazal-navy-light transition-colors"
                    >
                      <QrCode size={18} />
                    </button>

                    {/* زر الواتساب */}
                    <button 
                      onClick={() => handleWhatsAppDispatch(task)}
                      title="مشاركة عبر الواتساب"
                      className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                    >
                      <MessageSquare size={18} />
                    </button>

                    {/* زر الحذف - يحتاج صلاحية حذف المهام */}
                    {(profile?.role === 'admin' || hasPermission('delete_task')) && (
                      <button 
                        onClick={() => handleDeleteTask(task)}
                        title="حذف المهمة"
                        className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مودال الفاتورة الذكية المحتوية على كود QR */}
      <AnimatePresence>
        {activeInvoiceTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInvoiceTask(null)}
              className="absolute inset-0 bg-yazal-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-yazal-navy-light w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-yazal rounded-[2.5rem] shadow-2xl relative z-10 p-4 md:p-6 lg:p-8 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">فاتورة معاملة شركة يزل للسفريات والخدمات اللوجستية</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yazal Smart Digital Invoice</p>
                </div>
                <button onClick={() => setActiveInvoiceTask(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {/* تفاصيل الفاتورة */}
              <div className="space-y-3 bg-slate-50 dark:bg-yazal-navy-dark p-6 rounded-2xl border border-slate-100 dark:border-white/5 text-xs font-bold space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم المعاملة:</span>
                  <span className="text-yazal-navy dark:text-white font-black">{activeInvoiceTask.task_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الخدمة:</span>
                  <span className="text-yazal-navy dark:text-white font-black">{activeInvoiceTask.service_name || activeInvoiceTask.service_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">العميل:</span>
                  <span className="text-yazal-navy dark:text-white font-black">{activeInvoiceTask.client_name || activeInvoiceTask.client_id}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-2 text-sm font-black">
                  <span>الإجمالي:</span>
                  <span className="text-yazal-cyan">{activeInvoiceTask.total_price.toLocaleString()} {activeInvoiceTask.original_currency}</span>
                </div>
              </div>

              {/* كود QR المصدر */}
              <div className="text-center space-y-2">
                <div className="inline-block p-4 bg-white rounded-2xl shadow-md border border-slate-100">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=YAZAL-INVOICE-${activeInvoiceTask.task_id}`} 
                    alt="Invoice QR Code" 
                    className="w-40 h-40 mx-auto"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">امسح الكود للتحقق المالي المباشر</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => exportInvoiceToPDF(activeInvoiceTask)}
                  className="flex-1 py-3 bg-yazal-navy text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-yazal-navy-light transition-colors"
                >
                  <Printer size={16} />
                  تصدير PDF
                </button>
                <button 
                  onClick={() => handleWhatsAppDispatch(activeInvoiceTask)}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                >
                  <MessageSquare size={16} />
                  مشاركة واتساب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
