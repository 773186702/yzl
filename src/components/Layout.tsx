/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Wallet, 
  Receipt,
  ShieldCheck, 
  Sliders,
  Bell,
  BellPlus,
  LogOut, 
  Sun, 
  Moon, 
  Languages,
  Menu,
  X,
  DollarSign,
  CreditCard,
  FileText,
  Database,
  User,
  Scale,
  BookOpen,
  BookText,
  TrendingUp,
  History,
  UserMinus,
  Columns
} from 'lucide-react';
import { requestNotificationPermission } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import YZLOriginalLogo from './YZLOriginalLogo';
import newLogoSrc from '../assets/images/yazal_logo1784807246125.png';

import DeadlineMonitor from './DeadlineMonitor';

// المكون الأساسي للتنسيق (Layout Component)
// Includes Sidebar, Header, and responsive navigation

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, hasPermission, logout } = useAuth();
  const { theme, language, toggleTheme, setLanguage, isRTL } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, path: '/', permission: null },
    { id: 'tasks', label: t.tasks, icon: ClipboardList, path: '/tasks', permission: null },
    { id: 'clients', label: t.clients, icon: Users, path: '/clients', permission: null },
    { id: 'ledger', label: t.ledger, icon: Wallet, path: '/ledger', permission: 'view_ledger' },
    { id: 'expenses', label: t.expenses, icon: Receipt, path: '/expenses', permission: 'add_expense' },
    { id: 'notifications', label: t.notifications, icon: Bell, path: '/notifications', permission: null },
    { id: 'currencies', label: t.currencies, icon: DollarSign, path: '/currencies', permission: 'admin' },
    { id: 'payment-methods', label: t.payment_methods, icon: CreditCard, path: '/payment-methods', permission: 'admin' },
    { id: 'reports', label: t.reports, icon: FileText, path: '/reports', permission: 'view_ledger' },
    { id: 'monthly-reconciliation', label: t.monthly_reconciliation || 'المطابقة المالية', icon: Scale, path: '/monthly-reconciliation', permission: 'view_financial_reports' },
    // 📋 صفحات المحاسبة الجديدة
    { id: 'account-chart', label: (t as any).account_chart || 'دليل الحسابات', icon: BookOpen, path: '/account-chart', permission: 'manage_account_chart' },
    { id: 'journal-entries', label: (t as any).journal_entries || 'دفتر اليومية', icon: BookText, path: '/journal-entries', permission: 'view_journal_entries' },
    { id: 'balance-sheet', label: (t as any).balance_sheet || 'الميزانية العمومية', icon: TrendingUp, path: '/balance-sheet', permission: 'view_balance_sheet' },
    { id: 'income-statement', label: (t as any).income_statement || 'قائمة الدخل', icon: DollarSign, path: '/income-statement', permission: 'view_income_statement' },
    { id: 'audit-trail', label: (t as any).audit_trail || 'سجل التدقيق', icon: History, path: '/audit-trail', permission: 'view_audit_trail' },
    { id: 'employee-deductions', label: (t as any).employee_deductions || 'خصومات الموظفين', icon: UserMinus, path: '/employee-deductions', permission: 'deduct_employee' },
    { id: 'task-management', label: (t as any).task_management || 'إدارة المهام', icon: Columns, path: '/task-management', permission: 'manage_task_board' },
    { id: 'admin', label: t.admin, icon: ShieldCheck, path: '/admin', permission: 'admin' },
    { id: 'system-reset', label: t.system_reset || 'تهيئة النظام', icon: Database, path: '/system-reset', permission: 'admin' },
    { id: 'settings', label: t.settings, icon: Sliders, path: '/settings', permission: null },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-yazal-bg dark:bg-yazal-navy-dark text-yazal-navy dark:text-white transition-colors duration-300">
{/* Header - شريط الرأس - مُحسّن ومتوازن للمحتوى */}
      <header className="fixed top-0 inset-x-0 z-50 bg-yazal-navy text-white shadow-lg border-b border-white/5">
        <div className="flex items-center justify-between h-14 md:h-16 px-2 md:px-4 lg:px-6 max-w-full">
          {/* الجانب الأيسر: زر القائمة + اللوجو + اسم التطبيق */}
          <div className="flex items-center gap-1.5 md:gap-3 min-w-0 flex-shrink">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 md:hidden shrink-0 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <YZLOriginalLogo src={newLogoSrc} size={145} maxHeight={38} />
            </div>
            <div className="flex sm:hidden items-center gap-1 flex-shrink-0">
              <YZLOriginalLogo src={newLogoSrc} size={115} maxHeight={32} />
            </div>
            <div className="hidden md:block min-w-0 max-w-[160px]">
              <h1 className="text-xs md:text-sm lg:text-base font-black tracking-tight leading-none text-white truncate">
                {t.app_name}
              </h1>
              <p className="text-[7px] md:text-[8px] lg:text-[9px] uppercase tracking-widest text-white/60 mt-0.5 truncate">
                {t.app_tagline}
              </p>
            </div>
          </div>

          {/* الجانب الأيمن: الأزرار - بدون التفاف */}
          <div className="flex items-center gap-0.5 md:gap-1.5 lg:gap-2 flex-shrink-0">
            {/* تبديل اللغة */}
            <div className="hidden sm:flex items-center rounded-full bg-white/10 border border-white/10 px-1.5 py-0.5 gap-0.5">
              <button 
                onClick={() => setLanguage('en')} 
                className={`rounded-full px-2 py-0.5 text-[10px] md:text-xs font-black transition-all leading-none ${language === 'en' ? 'bg-white/15 text-yazal-cyan shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                EN
              </button>
              <div className="w-px h-2.5 bg-white/20"></div>
              <button 
                onClick={() => setLanguage('ar')} 
                className={`rounded-full px-2 py-0.5 text-[10px] md:text-xs font-black transition-all leading-none ${language === 'ar' ? 'bg-white/15 text-yazal-cyan shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                عربي
              </button>
            </div>

            {/* أيقونات متناسبة مع الهيدر */}
            <div className="flex items-center gap-0.5 md:gap-1">
              <Link
                to="/profile"
                className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t.profile || 'الملف الشخصي'}
              >
                <User size={18} className="md:w-[20px] md:h-[20px]" />
              </Link>

              <Link
                to="/notifications"
                className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors relative"
                title={t.notifications}
              >
                <Bell size={18} className="md:w-[20px] md:h-[20px]" />
                <span className="absolute top-0.5 md:top-1 right-0.5 md:right-1 w-2 h-2 bg-yazal-cyan rounded-full animate-pulse" />
              </Link>

              <button 
                onClick={toggleTheme}
                className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                title={theme === 'dark' ? t.dark_mode : t.light_mode}
              >
                {theme === 'dark' ? <Moon size={18} className="md:w-[20px] md:h-[20px] text-yazal-cyan" /> : <Sun size={18} className="md:w-[20px] md:h-[20px] text-amber-400" />}
              </button>

              <button 
                onClick={() => { requestNotificationPermission(); }}
                className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                title={t.enable_notifications_header || 'تفعيل الإشعارات'}
              >
                <BellPlus size={18} className="md:w-[20px] md:h-[20px] text-yazal-cyan" />
              </button>

              <button 
                onClick={handleLogout}
                className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                title={t.logout}
              >
                <LogOut size={18} className="md:w-[20px] md:h-[20px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

{/* Sidebar - القائمة الجانبية للموبايل (AnimatePresence) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={isRTL ? { x: '100%' } : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={isRTL ? { x: '100%' } : { x: '-100%' }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* الخلفية المعتمة */}
            <div className="absolute inset-0 bg-yazal-navy/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            {/* الشريط الجانبي */}
            <aside className={`absolute top-0 bottom-0 w-64 bg-white dark:bg-yazal-navy-light shadow-xl ${isRTL ? 'left-auto right-0' : 'left-0 right-auto'} pt-14 flex flex-col`}>
              <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-yazal pb-24">
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-1">
                  {t.main_navigation}
                </div>
                {menuItems.map((item) => {
                  if (item.permission && !hasPermission(item.permission)) return null;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-yazal-cyan/10 hover:text-yazal-cyan transition-all group"
                    >
                      <item.icon size={20} className="text-yazal-cyan group-hover:scale-110 transition-transform shrink-0" />
                      <span className="font-bold text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <Link to="/profile" className="w-full p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-yazal-navy-dark/30">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-yazal-navy-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-yazal-navy dark:bg-yazal-navy-light border-2 border-yazal-cyan overflow-hidden flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-yazal-cyan/20 flex items-center justify-center text-yazal-cyan font-black text-sm">
                      {(profile?.username || auth.currentUser?.email || 'Y').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-black text-yazal-navy dark:text-white leading-tight truncate">
                      {profile?.username || auth.currentUser?.email?.split('@')[0] || t.default_staff_name}
                    </p>
                    <p className="text-[10px] font-bold text-yazal-cyan mt-1 truncate uppercase tracking-wider">
                      {profile?.role === 'admin' ? t.system_admin :
                       profile?.role === 'accountant' ? (language === 'ar' ? 'محاسب' : 'Accountant') :
                       profile?.role === 'agent' ? (language === 'ar' ? 'مندوب' : 'Agent') :
                       profile?.role ? (language === 'ar' ? 'موظف' : 'Staff') : t.active_staff_account}
                    </p>
                  </div>
                </div>
              </Link>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar دائم الظهور على الشاشات الكبيرة (بدون AnimatePresence) */}
      <aside className={`hidden md:flex flex-col fixed top-0 pt-14 md:pt-16 bottom-0 w-64 bg-white dark:bg-yazal-navy-light shadow-xl z-40 ${isRTL ? 'right-0' : 'left-0'} border-x border-slate-200 dark:border-white/5 overflow-hidden`}>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-yazal pb-24">
          <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-1">
            {t.main_navigation}
          </div>
          {menuItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-yazal-cyan/10 hover:text-yazal-cyan transition-all group"
              >
                <item.icon size={20} className="text-yazal-cyan group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-bold text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <Link to="/profile" className="w-full p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-yazal-navy-dark/30">
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-yazal-navy-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:bg-yazal-cyan/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-yazal-navy dark:bg-yazal-navy-light border-2 border-yazal-cyan overflow-hidden flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-yazal-cyan/20 flex items-center justify-center text-yazal-cyan font-black text-sm">
                {(profile?.username || auth.currentUser?.email || 'Y').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-black text-yazal-navy dark:text-white leading-tight truncate">
                {profile?.username || auth.currentUser?.email?.split('@')[0] || t.default_staff_name}
              </p>
              <p className="text-[10px] font-bold text-yazal-cyan mt-1 truncate uppercase tracking-wider">
                {profile?.role === 'admin' ? t.system_admin :
                 profile?.role === 'accountant' ? (language === 'ar' ? 'محاسب' : 'Accountant') :
                 profile?.role === 'agent' ? (language === 'ar' ? 'مندوب' : 'Agent') :
                 profile?.role ? (language === 'ar' ? 'موظف' : 'Staff') : t.active_staff_account}
              </p>
            </div>
          </div>
        </Link>
      </aside>

      {/* Main Content - المحتوى الرئيسي مع تباعد متوازن */}
      <main className={`pt-20 md:pt-24 px-3 md:px-6 pb-6 transition-all duration-300 ${isRTL ? 'md:pr-72' : 'md:pl-72'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      <DeadlineMonitor />
    </div>
  );
};

export default Layout;
