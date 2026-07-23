/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-yazal-navy-light p-6 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 border-r-4 flex items-center gap-5 transition-all"
      style={{ borderRightColor: color.includes('#') ? color : undefined }}
    >
      <div className={`p-4 rounded-xl ${color.startsWith('bg-') ? color : ''} text-white shadow-sm`} style={{ backgroundColor: !color.startsWith('bg-') ? color : undefined }}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 tracking-wider">{label}</p>
        <h3 className="text-2xl font-black">{value}</h3>
      </div>
    </motion.div>
  );
};

export default StatCard;
