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
  Database
} from 'lucide-react';
import { requestNotificationPermission } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import YZLOriginalLogo from './YZLOriginalLogo';

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
    { id: 'admin', label: t.admin, icon: ShieldCheck, path: '/admin', permission: 'admin' },
    { id: 'system-reset', label: t.system_reset || 'تهيئة النظام', icon: Database, path: '/system-reset', permission: 'admin' },
    { id: 'settings', label: t.settings, icon: Sliders, path: '/settings', permission: null },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-yazal-bg dark:bg-yazal-navy-dark text-yazal-navy dark:text-white transition-colors duration-300">
      {/* Header - شريط الرأس */}
      <header className="fixed top-0 w-full z-50 bg-yazal-navy text-white shadow-lg min-h-16 py-3 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 border-b border-white/5">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 mr-1 md:hidden shrink-0"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <YZLOriginalLogo size={90} />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-black tracking-tight leading-none text-white truncate">
              {t.app_name}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-white/70 mt-1 truncate">
              {t.app_tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
          <div className="flex items-center rounded-full bg-white/10 border border-white/10 px-2 py-1 gap-1 sm:gap-2">
            <button 
              onClick={() => setLanguage('en')} 
              className={`rounded-full px-2.5 py-1 text-xs font-black transition-all ${language === 'en' ? 'bg-white/15 text-yazal-cyan shadow-sm' : 'text-white/70 hover:text-white'}`}
            >
              EN
            </button>
            <div className="w-px h-3 bg-white/20"></div>
            <button 
              onClick={() => setLanguage('ar')} 
              className={`rounded-full px-2.5 py-1 text-xs font-black transition-all ${language === 'ar' ? 'bg-white/15 text-yazal-cyan shadow-sm' : 'text-white/70 hover:text-white'}`}
            >
              عربي
            </button>
          </div>

          <Link
            to="/notifications"
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            title={t.notifications}
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yazal-cyan rounded-full animate-pulse" />
          </Link>

          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={theme === 'dark' ? t.dark_mode : t.light_mode}
          >
            {theme === 'dark' ? <Moon size={20} className="text-yazal-cyan" /> : <Sun size={20} className="text-amber-400" />}
          </button>

          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t.logout}
          >
            <LogOut size={20} />
          </button>
          
          {/* زر تفعيل الإشعارات */}
          <button
            onClick={() => { requestNotificationPermission(); }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t.enable_notifications_header || 'تفعيل الإشعارات'}
          >
            <BellPlus size={20} className="text-yazal-cyan" />
          </button>
        </div>
      </header>

      {/* Sidebar - القائمة الجانبية */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth > 768) && (
          <motion.aside
            initial={isRTL ? { x: '100%' } : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={isRTL ? { x: '100%' } : { x: '-100%' }}
            className={`fixed top-16 bottom-0 w-64 bg-white dark:bg-yazal-navy-light shadow-xl z-40 ${isRTL ? 'right-0' : 'left-0'} md:translate-x-0 border-x border-slate-200 dark:border-white/5 overflow-hidden flex flex-col`}
          >
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
            
            <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-yazal-navy-dark/30">
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
                    {profile?.role ? (profile.role === 'admin' ? t.system_admin : profile.role) : t.active_staff_account}
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content - المحتوى الرئيسي */}
      <main className={`pt-20 px-4 md:px-8 pb-8 transition-all duration-300 ${isRTL ? 'md:pr-72' : 'md:pl-72'}`}>
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
