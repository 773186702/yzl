/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * مراقب المواعيد النهائية (Deadline Monitor)
 * يتحقق من المهام التي تقترب من موعد الانتهاء (أقل من 24 ساعة)
 */
const DeadlineMonitor: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const checkDeadlines = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const path = 'tasks';
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const q = query(
          collection(db, path),
          where('assigned_to', '==', user.uid),
          where('status', 'in', ['new', 'processing']),
          where('deadline', '<=', Timestamp.fromDate(tomorrow)),
          where('deadline', '>', Timestamp.fromDate(now))
        );

        const querySnapshot = await getDocs(q);
        const tasks = querySnapshot.docs.map(doc => doc.data() as Task);
        
        if (tasks.length > 0) {
          setUpcomingTasks(tasks);
          setShowNotification(true);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    };

    checkDeadlines();
    // التحقق كل ساعة
    const interval = setInterval(checkDeadlines, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (!showNotification || upcomingTasks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-6 left-6 z-50 w-full max-w-sm bg-yazal-navy text-white p-6 rounded-[2rem] shadow-2xl border border-yazal-cyan/30 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-yazal-cyan/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yazal-cyan rounded-2xl shadow-lg">
              <Bell size={24} />
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-xl font-black uppercase tracking-tight mb-2">تنبيه موعد نهائي</h3>
          <p className="text-xs font-bold text-white/70 leading-relaxed mb-4">
            لديك {upcomingTasks.length} مهام تنتهي خلال الـ 24 ساعة القادمة. يرجى المتابعة لإتمامها.
          </p>

          <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {upcomingTasks.map(task => (
              <div key={task.task_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <AlertTriangle size={16} className="text-yazal-cyan shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate">مهمة #{task.task_id.substring(0, 8)}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => navigate('/tasks')}
            className="w-full mt-6 bg-yazal-cyan text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-yazal-cyan-dark transition-all"
          >
            عرض المهام الآن
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeadlineMonitor;
