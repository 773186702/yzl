/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import defaultLogoSrc from '../assets/images/yazal_logo_1784807246124.png';

interface YZLOriginalLogoProps {
  className?: string;
  size?: number;
  src?: string;
  maxHeight?: number;
}

/**
 * شعار المؤسسة (Institution Logo)
 * يدعم صورتين مختلفتين: شعار افتراضي قديم لصفحة الدخول، وشعار جديد للوحة التحكم.
 * 
 * props:
 * - size: عرض الشعار بالبكسل (الافتراضي 300)
 * - src: مسار الصورة (اختياري - يستخدم الشعار الافتراضي إن لم يُمرر)
 * - maxHeight: أقصى ارتفاع للشعار (اختياري - للتحكم في الهيدر)
 */
const YZLOriginalLogo: React.FC<YZLOriginalLogoProps> = ({ 
  className = '', 
  size = 300,
  src,
  maxHeight
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={src || defaultLogoSrc}
        alt="Institution Logo"
        style={{ 
          width: size, 
          height: 'auto',
          maxHeight: maxHeight ? `${maxHeight}px` : undefined
        }}
        className="object-contain"
      />
    </div>
  );
};

export default YZLOriginalLogo;
