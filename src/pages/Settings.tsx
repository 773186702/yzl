/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Moon, 
  Sun, 
  Bell, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Check, 
  Smartphone,
  Sparkles,
  Key,
  Fingerprint
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';
import { requestNotificationPermission } from '../lib/firebase';
import { playNewOrderAlert } from '../lib/sound';

const Settings: React.FC = () => {
  const { theme, language, toggleTheme, setLanguage, isRTL } = useApp();
  const t = translations[language];
  const navigate = useNavigate();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('yazal-sound-enabled') !== 'false';
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return Notification.permission === 'granted';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem('yazal-biometric-enabled') === 'true';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    logActivity('تغيير اللغة', `تم تغيير لغة التطبيق إلى: ${lang === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}`);
    showToast(lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  };

  const handleThemeToggle = () => {
    toggleTheme();
    const newTheme = theme === 'light' ? 'الداكن' : 'الفاتح';
    logActivity('تغيير المظهر', `تم تغيير مظهر التطبيق إلى المظهر ${newTheme}`);
    showToast(`تم التبديل إلى المظهر ${newTheme}`);
  };

  const handleSoundToggle = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('yazal-sound-enabled', String(nextState));
    logActivity('تغيير إعدادات الصوت', `تم ${nextState ? 'تفعيل' : 'تعطيل'} الأصوات المخصصة للإشعارات`);
    showToast(nextState ? 'تم تفعيل الصوت المخصص' : 'تم تعطيل الصوت المخصص');
  };

  const handleBiometricToggle = () => {
    const nextState = !biometricEnabled;
    setBiometricEnabled(nextState);
    localStorage.setItem('yazal-biometric-enabled', String(nextState));
    logActivity('تغيير إعدادات البصمة', `تم ${nextState ? 'تفعيل' : 'تعطيل'} الدخول بالبصمة للدخول السريع`);
    showToast(nextState ? 'تم تفعيل الدخول بالبصمة' : 'تم تعطيل الدخول بالبصمة');
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationsEnabled(true);
        logActivity('تفعيل الإشعارات', 'تم تفعيل إشعارات FCM وتنبيهات المهام');
        showToast('تم تفعيل إشعارات FCM بنجاح');
      } else {
        showToast('لم يتم منح تصريح الإشعارات');
      }
    } catch (err) {
      console.error('Notification setup failed:', err);
      showToast('حدث خطأ أثناء طلب تصريح الإشعارات');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-yazal-cyan text-yazal-navy font-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce text-xs uppercase tracking-wider">
          <Check size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
          {t.settings}
        </h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
          تخصيص تفضيلات اللغة، المظهر، الإشعارات والحماية
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. قسم اللغة والاتجاه (Language & RTL/LTR) */}
        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yazal-cyan/10 rounded-2xl flex items-center justify-center text-yazal-cyan">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                اللغة واتجاه العرض
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Language & Direction (RTL / LTR)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                language === 'ar'
                  ? 'border-yazal-cyan bg-yazal-cyan/5 text-yazal-navy dark:text-white shadow-lg shadow-yazal-cyan/10'
                  : 'border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl font-black">العربية</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">اليمين إلى اليسار (RTL)</span>
              {language === 'ar' && <Check size={18} className="text-yazal-cyan" />}
            </button>

            <button
              onClick={() => handleLanguageChange('en')}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                language === 'en'
                  ? 'border-yazal-cyan bg-yazal-cyan/5 text-yazal-navy dark:text-white shadow-lg shadow-yazal-cyan/10'
                  : 'border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl font-black">English</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Left to Right (LTR)</span>
              {language === 'en' && <Check size={18} className="text-yazal-cyan" />}
            </button>
          </div>
        </div>

        {/* 2. قسم مظهر التطبيق (Theme Mode) */}
        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yazal-navy/10 dark:bg-white/10 rounded-2xl flex items-center justify-center text-yazal-navy dark:text-white">
              {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                نمط الألوان والمظهر
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Dark & Light Mode
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => theme !== 'light' && handleThemeToggle()}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                theme === 'light'
                  ? 'border-yazal-cyan bg-yazal-cyan/5 text-yazal-navy shadow-lg shadow-yazal-cyan/10'
                  : 'border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'
              }`}
            >
              <Sun size={32} className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider">المظهر الفاتح</span>
              {theme === 'light' && <Check size={18} className="text-yazal-cyan" />}
            </button>

            <button
              onClick={() => theme !== 'dark' && handleThemeToggle()}
              className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                theme === 'dark'
                  ? 'border-yazal-cyan bg-yazal-cyan/5 text-white shadow-lg shadow-yazal-cyan/10'
                  : 'border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'
              }`}
            >
              <Moon size={32} className="text-yazal-cyan" />
              <span className="text-xs font-black uppercase tracking-wider">المظهر الداكن</span>
              {theme === 'dark' && <Check size={18} className="text-yazal-cyan" />}
            </button>
          </div>
        </div>

        {/* 3. قسم الإشعارات والأصوات (Notifications & Custom Sound Alert) */}
        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <Bell size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                الإشعارات والتنبيهات
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                FCM Push Notifications & Sound
              </p>
            </div>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 dark:divide-white/5">
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-black text-yazal-navy dark:text-white block">إشعارات المتصفح (FCM)</span>
                <span className="text-[10px] font-bold text-slate-400 block">تلقي تنبيهات المواعيد وتحديثات المهام</span>
              </div>
              <button
                onClick={handleEnableNotifications}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  notificationsEnabled
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-yazal-cyan text-yazal-navy hover:brightness-110'
                }`}
              >
                {notificationsEnabled ? 'مفعل' : 'تفعيل الإشعارات'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 size={20} className="text-yazal-cyan" /> : <VolumeX size={20} className="text-slate-400" />}
                <div>
                  <span className="text-sm font-black text-yazal-navy dark:text-white block">الصوت المخصص للتنبيه</span>
                  <span className="text-[10px] font-bold text-slate-400 block">تشغيل نغمة صوتية مخصصة فور استلام أو تحديث الطلبات</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playNewOrderAlert();
                    showToast('تم تشغيل تجربة الصوت المخصص 🔔');
                  }}
                  className="px-3 py-1.5 bg-yazal-cyan/10 hover:bg-yazal-cyan/20 text-yazal-cyan text-[10px] font-black uppercase rounded-xl transition-colors"
                >
                  تجربة الصوت 🔔
                </button>
                <button
                  onClick={handleSoundToggle}
                  className={`w-14 h-8 rounded-full p-1 transition-colors ${
                    soundEnabled ? 'bg-yazal-cyan' : 'bg-slate-200 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                      soundEnabled ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. قسم الأمان والتأكيد البيومتري (Security & Biometric) */}
        <div className="bg-white dark:bg-yazal-navy-light p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                الأمان والتحقق البيومتري
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                WebAuthn & Biometrics (Face/Touch ID)
              </p>
            </div>
          </div>

          {/* Biometric Toggle */}
          <div className="space-y-4 divide-y divide-slate-100 dark:divide-white/5">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <Fingerprint size={20} className="text-yazal-cyan" />
                <div>
                  <span className="text-sm font-black text-yazal-navy dark:text-white block">
                    {language === 'ar' ? 'الدخول السريع بالبصمة' : 'Biometric Quick Login'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {language === 'ar' ? 'تسجيل الدخول تلقائياً بالبصمة أو الوجه' : 'Automatically log in with fingerprint or face'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${
                  biometricEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    biometricEnabled ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-yazal-navy-dark/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-yazal-cyan" />
                <span className="text-xs font-black text-yazal-navy dark:text-white">تسجيل الدخول ببصمة الأصبع / الوجه</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-black text-[9px] uppercase tracking-wider">
                {biometricEnabled ? 'مفعل' : 'معطل'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              يدعم نظام "يزل" الدخول البيومتري المباشر عبر تقنية WebAuthn، مع توفير رمز PIN سري كبديل آمن في حالة عدم توفر الحساس.
            </p>
          </div>

          {/* Change Password Button */}
          <button
            onClick={() => navigate('/change-password')}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3"
          >
            <Key size={20} />
            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
