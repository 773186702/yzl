/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * مكون التحميل الهيكلي (Skeleton Loader)
 * يستخدم لتعزيز تجربة المستخدم أثناء جلب البيانات
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`bg-slate-200 dark:bg-white/5 animate-pulse rounded-xl ${className}`}
        />
      ))}
    </>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-yazal-navy-light p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
    <div className="flex justify-between">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <div className="p-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-4 flex-1">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <Skeleton className="h-8 w-24 rounded-lg" />
  </div>
);
