/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoSrc from '../assets/images/yazal_logo_1784807246124.png';

interface YZLOriginalLogoProps {
  className?: string;
  size?: number;
}

/**
 * شعار المؤسسة الجديد (Institution Logo)
 * يستخدم صورة الشعار المرسلة بدلاً من شعار YZL الافتراضي.
 */
const YZLOriginalLogo: React.FC<YZLOriginalLogoProps> = ({ className = '', size = 200 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={logoSrc}
        alt="Institution Logo"
        style={{ width: size, height: 'auto' }}
        className="object-contain"
      />
    </div>
  );
};

export default YZLOriginalLogo;
