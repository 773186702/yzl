/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardCheck, 
  AlertCircle, 
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../lib/translations';
import StatCard from '../components/StatCard';
import { Task } from '../types';
import YZLOriginalLogo from '../components/YZLOriginalLogo';
import { Skeleton, CardSkeleton, TableRowSkeleton } from '../components/Skeleton';
import { logActivity } from '../lib/audit';
import FinancialAnalytics from '../components/FinancialAnalytics';
import TaskDistributionChart from '../components/TaskDistributionChart';

// Memoized Task Row Item
const TaskRowItem: React.FC<{
  task: Task;
  t: Record<string, string>;
}> = React.memo(({ task, t }) => {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
      <td className="px-8 py-6">
        <span className="font-black text-yazal-navy dark:text-white uppercase tracking-tight text-sm block">{task.service_id}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{task.task_id.substring(0, 8)}</span>
      </td>
      <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-wider">{task.client_id}</td>
      <td className="px-8 py-6 text-center">
        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border ${
          task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
          task.status === 'processing' ? 'bg-yazal-cyan/5 text-yazal-cyan border-yazal-cyan/10' : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {t[task.status] || task.status}
        </span>
      </td>
      <td className="px-8 py-6 font-black text-sm text-left text-yazal-navy dark:text-white">
        {task.total_price.toLocaleString()} 
        <span className="text-[10px] font-bold text-yazal-cyan ml-2 uppercase">{task.original_currency}</span>
      </td>
    </tr>
  );
});

TaskRowItem.displayName = 'TaskRowItem';

// لوحة التحكم (Interactive Dynamic Dashboard)
// Shows stats, recent tasks, and quick actions

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useApp();
  const { hasPermission } = useAuth();
  const t = translations[language];
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeClients: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalRevenue: '0'
  });

  useEffect(() => {
    const fetchData = async () => {
      const path = 'tasks';
      try {
        // جلب المهام الأخيرة
        const tasksQuery = query(collection(db, path), orderBy('created_at', 'desc'), limit(5));
        const tasksSnap = await getDocs(tasksQuery);
        const tasksList = tasksSnap.docs.map(doc => ({ task_id: doc.id, ...doc.data() } as Task));
        setRecentTasks(tasksList);

        // جلب إحصائيات سريعة (تجريبية للمعاينة)
        setStats({
          activeClients: 124,
          completedTasks: 45,
          pendingTasks: 12,
          totalRevenue: '450,000 YER'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuickTask = () => {
    logActivity('إضافة سريعة', 'قام المستخدم بفتح نافذة الإضافة السريعة من لوحة التحكم');
    navigate('/tasks/new');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* قسم الترحيب (Hero Section) */}
      <div className="bg-yazal-navy dark:bg-yazal-navy-light p-6 sm:p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-yazal-navy/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yazal-cyan/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="text-center md:text-right space-y-3 sm:space-y-4">
            <div className="flex justify-center md:justify-start">
              <YZLOriginalLogo size={80} className="sm:hidden" />
              <YZLOriginalLogo size={100} className="hidden sm:block md:hidden" />
              <YZLOriginalLogo size={120} className="hidden md:block" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight uppercase leading-snug sm:leading-tight">
              مرحباً بك في نظام شركة يزل للسفريات والخدمات اللوجستية
            </h1>
            <p className="text-white/60 font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.3em] max-w-md leading-relaxed mx-auto md:mx-0">
              إدارة السفريات والخدمات اللوجستية المتكاملة • تحكم كامل في المهام والميزانيات
            </p>
            <div className="pt-2 sm:pt-4 flex justify-center md:justify-start">
              {hasPermission('edit_task') && (
                <button 
                  onClick={handleQuickTask}
                  className="bg-yazal-cyan hover:bg-yazal-cyan-light text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-yazal-cyan/20 transition-all flex items-center gap-3 group"
                >
                  إنشاء مهمة جديدة
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                </button>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                <span className="text-3xl font-black text-yazal-cyan">85%</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-white/40 mt-1">كفاءة الأداء</span>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                <span className="text-3xl font-black text-yazal-cyan">24</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-white/40 mt-1">عملية اليوم</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* قسم الإحصائيات (Stats Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <Skeleton count={4} className="h-40 rounded-3xl" />
        ) : (
          <>
            <StatCard 
              label={t.clients} 
              value={stats.activeClients} 
              icon={Users} 
              color="#00AEEF" 
            />
            <StatCard 
              label="مهام مكتملة" 
              value={stats.completedTasks} 
              icon={ClipboardCheck} 
              color="#0F2B48" 
            />
            <StatCard 
              label="مهام معلقة" 
              value={stats.pendingTasks} 
              icon={AlertCircle} 
              color="#00AEEF" 
            />
            <StatCard 
              label="إجمالي الإيرادات" 
              value={stats.totalRevenue} 
              icon={TrendingUp} 
              color="#0F2B48" 
            />
          </>
        )}
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* لوحة التحليلات المالية التفاعلية (Recharts) */}
          <FinancialAnalytics />
        </div>
        <div>
          {/* توزيع حالة المهام (Recharts) */}
          <TaskDistributionChart completed={stats.completedTasks} pending={stats.pendingTasks} />
        </div>
      </div>

      {/* المهام الأخيرة (Recent Tasks Table) */}
      <div className="bg-white dark:bg-yazal-navy-light rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-yazal-cyan rounded-full" />
            <div>
              <h2 className="text-xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">المهام الحالية</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">متابعة سير العمل في الوقت الحقيقي</p>
            </div>
          </div>
          {hasPermission('edit_task') && (
            <button 
              onClick={handleQuickTask}
              className="bg-yazal-cyan text-white p-4 rounded-2xl hover:shadow-xl transition-all active:scale-95 shadow-lg shadow-yazal-cyan/20"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" count={3} />
            </div>
          ) : (
            <table className="w-full text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-yazal-navy-dark/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">المهمة</th>
                  <th className="px-8 py-6">العميل</th>
                  <th className="px-8 py-6 text-center">الحالة</th>
                  <th className="px-8 py-6 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {recentTasks.length > 0 ? recentTasks.map((task) => (
                  <TaskRowItem key={task.task_id} task={task} t={t} />
                )) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <AlertCircle size={40} className="mx-auto mb-4 text-slate-200" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">لا توجد مهام نشطة حالياً</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      {hasPermission('edit_task') && (
        <button 
          onClick={handleQuickTask}
          className="fixed bottom-10 right-10 w-20 h-20 bg-yazal-cyan rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-yazal-cyan/40 hover:scale-110 active:scale-90 transition-all z-50 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
          <Plus size={36} />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
