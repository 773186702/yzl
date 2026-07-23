/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// سياق التطبيق (Theme & Language Context)
// Manages light/dark mode and Arabic/English localization

interface AppContextType {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  toggleTheme: () => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  isRTL: boolean;
}

const AppContext = createContext<AppContextType>({
  theme: 'light',
  language: 'ar',
  toggleTheme: () => {},
  setLanguage: () => {},
  isRTL: true,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('yazal-theme') as 'light' | 'dark') || 'light'
  );
  const [language, setLanguage] = useState<'ar' | 'en'>(
    (localStorage.getItem('yazal-lang') as 'ar' | 'en') || 'ar'
  );

  useEffect(() => {
    // تطبيق السمة (Theme)
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('yazal-theme', theme);
  }, [theme]);

  useEffect(() => {
    // تطبيق اللغة واتجاه النص (RTL/LTR)
    const root = window.document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
    localStorage.setItem('yazal-lang', language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const isRTL = language === 'ar';

  return (
    <AppContext.Provider value={{ theme, language, toggleTheme, setLanguage, isRTL }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
