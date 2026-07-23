/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Trash2, 
  CheckCheck,
  Volume2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../lib/translations';
import { logActivity } from '../lib/audit';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'normal';
  read: boolean;
  type: 'task_update' | 'deadline_approaching' | 'system' | 'payment';
  created_at: any;
}

// Sub-component for individual notification card using React.memo
const NotificationCard: React.FC<{
  item: SystemNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = React.memo(({ item, onMarkAsRead, onDelete }) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-500/10 text-red-500 border-red-500/20',
          label: 'عالية الأولوية',
          icon: AlertTriangle
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          label: 'متوسطة',
          icon: Clock
        };
      default:
        return {
          bg: 'bg-yazal-cyan/10 text-yazal-cyan border-yazal-cyan/20',
          label: 'عادية',
          icon: Info
        };
    }
  };

  const badge = getPriorityBadge(item.priority);
  const Icon = badge.icon;

  const formattedDate = useMemo(() => {
    if (!item.created_at) return new Date().toLocaleTimeString();
    if (typeof item.created_at === 'object' && 'toDate' in item.created_at) {
      return item.created_at.toDate().toLocaleString();
    }
    return String(item.created_at);
  }, [item.created_at]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className={`p-6 rounded-[2rem] border transition-all ${
        item.read
          ? 'bg-white dark:bg-yazal-navy-light/40 border-slate-100 dark:border-white/5'
          : 'bg-yazal-cyan/5 dark:bg-yazal-cyan/10 border-yazal-cyan/30 shadow-lg shadow-yazal-cyan/5'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${badge.bg}`}>
            <Icon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className={`font-black text-sm uppercase tracking-tight ${
                item.read ? 'text-slate-700 dark:text-slate-300' : 'text-yazal-navy dark:text-white'
              }`}>
                {item.title}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.bg}`}>
                {badge.label}
              </span>
              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-yazal-cyan animate-ping" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-3">
              {item.body}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Clock size={12} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!item.read && (
            <button
              onClick={() => onMarkAsRead(item.id)}
              className="p-2.5 rounded-xl bg-yazal-cyan/10 hover:bg-yazal-cyan/20 text-yazal-cyan transition-colors"
              title="تحديد كمعاين"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-slate-400 transition-colors"
            title="حذف الإشعار"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

NotificationCard.displayName = 'NotificationCard';

const Notifications: React.FC = () => {
  const { language } = useApp();
  const t = translations[language];

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'normal' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  // Default fallback items if database is empty initially
  const defaultNotifications: SystemNotification[] = useMemo(() => [
    {
      id: 'n1',
      title: 'اقتراب موعد تسليم تأشيرة العميل أحمد علي',
      body: 'ينتهي الموعد المترتب على طلب الفيزا خلال 24 ساعة. يرجى الاستكمال فوراً.',
      priority: 'high',
      read: false,
      type: 'deadline_approaching',
      created_at: new Date()
    },
    {
      id: 'n2',
      title: 'تم تحديث حالة تذكرة السفر #8492',
      body: 'تم التأكيد وإصدار الكود البرمجي من الخطوط اليمنية.',
      priority: 'medium',
      read: true,
      type: 'task_update',
      created_at: new Date(Date.now() - 3600000)
    },
    {
      id: 'n3',
      title: 'إيداع مالي جديد بـ الكريمي',
      body: 'تم إضافة مبلغ 150,000 YER إلى سجل الميزانية الرئيسية.',
      priority: 'normal',
      read: false,
      type: 'payment',
      created_at: new Date(Date.now() - 86400000)
    }
  ], []);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemNotification));
        setNotifications(items);
      } else {
        setNotifications(defaultNotifications);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Notifications snapshot error:', err);
      setNotifications(defaultNotifications);
      setLoading(false);
    });

    return () => unsub();
  }, [defaultNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    logActivity('قراءة الإشعارات', 'تم تحديد جميع الإشعارات كمعاينة');
  }, []);

  const handlePlayTestSound = () => {
    const audio = new Audio('/assets/sounds/notification.mp3');
    audio.play().catch(e => console.log('Audio notification error:', e));
  };

  // Filtered notifications list using useMemo
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      if (priorityFilter === 'all') return true;
      if (priorityFilter === 'unread') return !item.read;
      return item.priority === priorityFilter;
    });
  }, [notifications, priorityFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-yazal-navy dark:text-white uppercase tracking-tight">
              الإشعارات والتنبيهات
            </h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-yazal-cyan text-yazal-navy font-black text-xs rounded-full uppercase tracking-wider">
                {unreadCount} جديد
              </span>
            )}
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            سجل التنبيهات الفورية الواردة عبر Firebase FCM والتحديثات
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayTestSound}
            className="px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Volume2 size={16} className="text-yazal-cyan" />
            اختبار الصوت
          </button>

          <button
            onClick={handleMarkAllRead}
            className="px-5 py-3 bg-yazal-navy dark:bg-yazal-navy-light hover:bg-yazal-navy-dark text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-yazal-navy/10 transition-all flex items-center gap-2"
          >
            <CheckCheck size={16} className="text-yazal-cyan" />
            تحديد الكل كمعاين
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-yazal-navy-light p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto p-1">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-1">
            <Filter size={14} />
            الأولوية:
          </span>

          {[
            { id: 'all', label: 'الكل' },
            { id: 'unread', label: `غير مقروءة (${unreadCount})` },
            { id: 'high', label: 'عالية' },
            { id: 'medium', label: 'متوسطة' },
            { id: 'normal', label: 'عادية' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPriorityFilter(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                priorityFilter === tab.id
                  ? 'bg-yazal-cyan text-yazal-navy shadow-md shadow-yazal-cyan/20'
                  : 'text-slate-400 hover:text-yazal-navy dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(item => (
              <NotificationCard
                key={item.id}
                item={item}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-yazal-navy-light p-16 rounded-[2.5rem] border border-slate-100 dark:border-white/5 text-center"
            >
              <Bell size={48} className="mx-auto text-slate-200 dark:text-white/10 mb-4 animate-bounce" />
              <h3 className="text-lg font-black text-yazal-navy dark:text-white uppercase tracking-tight">
                لا توجد إشعارات تطابق التصفية
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                جميع التنبيهات معالجة ومُحدثة لحظياً
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;
