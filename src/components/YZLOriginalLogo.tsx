/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface YZLOriginalLogoProps {
  className?: string;
  size?: number;
}

/**
 * شعار يزل الأصلي (YZL Original Logo SVG)
 * نسخة مطورة تحاكي الشعار الرسمي مع أنيميشن متسلسل
 */
const YZLOriginalLogo: React.FC<YZLOriginalLogoProps> = ({ className = '', size = 200 }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <style>
        {`
          @keyframes glow-sequence {
            0%, 100% { filter: drop-shadow(0 0 0px transparent); opacity: 0.6; }
            33% { filter: drop-shadow(0 0 10px #00AEEF); opacity: 1; }
          }
          .animate-y { animation: glow-sequence 3s infinite; animation-delay: 0s; }
          .animate-z { animation: glow-sequence 3s infinite; animation-delay: 1s; }
          .animate-l { animation: glow-sequence 3s infinite; animation-delay: 2s; }
          
          .logo-svg {
            width: ${size}px;
            height: auto;
            transition: all 0.3s ease;
          }
        `}
      </style>
      
      <svg
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-svg"
      >
        {/* Globe Element (Top) */}
        <g className="globe-group" opacity="0.8">
          <ellipse cx="200" cy="60" rx="30" ry="25" stroke="#0F2B48" strokeWidth="1.5" />
          <path d="M170 60 H230" stroke="#0F2B48" strokeWidth="1" />
          <path d="M180 40 Q200 60 220 40" stroke="#0F2B48" strokeWidth="1" fill="none" />
          <path d="M180 80 Q200 60 220 80" stroke="#0F2B48" strokeWidth="1" fill="none" />
          <ellipse cx="200" cy="60" rx="10" ry="25" stroke="#0F2B48" strokeWidth="1" />
        </g>

        {/* Main Stylized YZ */}
        <g className="main-letters">
          {/* Stylized Y (Navy) */}
          <path 
            className="animate-y"
            d="M130 90 L165 140 L200 90 H175 L165 115 L155 90 H130 Z" 
            fill="#0F2B48" 
          />
          <path 
            className="animate-y"
            d="M160 140 H170 V190 H160 V140 Z" 
            fill="#0F2B48" 
          />

          {/* Stylized Z (Cyan) */}
          <path 
            className="animate-z"
            d="M205 90 H275 L205 190 H275 V175 H235 L305 90 H205 V105 Z" 
            fill="#00AEEF" 
          />
        </g>

        {/* Arabic Text (Middle) */}
        <text 
          x="200" 
          y="230" 
          fontFamily="Arial, sans-serif" 
          fontSize="48" 
          fontWeight="900" 
          fill="#0F2B48" 
          textAnchor="middle"
          className="dark:fill-white"
        >
          يزل
        </text>

        {/* Bottom YZL Text with underline */}
        <g className="bottom-text">
          <text 
            x="170" 
            y="270" 
            fontFamily="Arial, sans-serif" 
            fontSize="32" 
            fontWeight="900" 
            fill="#00AEEF"
            textAnchor="start"
          >
            <tspan className="animate-y">Y</tspan>
            <tspan className="animate-z">Z</tspan>
            <tspan className="animate-l">L</tspan>
          </text>
          {/* The long underline characteristic of the logo */}
          <path 
            className="animate-l"
            d="M225 275 H280" 
            stroke="#00AEEF" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
};

export default YZLOriginalLogo;
