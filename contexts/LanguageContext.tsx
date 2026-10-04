import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_TRANSLATIONS, SUPPORTED_LANGUAGES, LOCALE, type LanguageCode } from '../constants/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  /** t() with {placeholders} filled, e.g. tf('panch.until', { t: '05:51' }). */
  tf: (key: string, vars: Record<string, string | number>) => string;
  /** Locale for toLocaleDateString / toLocaleTimeString in the chosen language. */
  locale: string;
  /** Style override: Indic scripts break apart with letter-spacing, so drop it. */
  noTrack: { letterSpacing?: number };
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  tf: (key: string) => key,
  locale: 'en-IN',
  noTrack: {},
});

export const useLanguage = () => useContext(LanguageContext);
export { SUPPORTED_LANGUAGES };
export type { LanguageCode };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem('language');
      if (stored && stored in ALL_TRANSLATIONS) {
        setLanguageState(stored as LanguageCode);
      }
    } catch (e) {}
  };

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('language', lang);
  };

  // Fallback chain: selected → English. (It used to fall back to Hindi, which
  // showed Hindi to Tamil/Bengali/Telugu users for every missing phrase.)
  const t = useCallback((key: string): string => {
    return ALL_TRANSLATIONS[language]?.[key] || ALL_TRANSLATIONS.en[key] || key;
  }, [language]);

  const tf = useCallback((key: string, vars: Record<string, string | number>): string => {
    return t(key).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  }, [t]);

  const locale = LOCALE[language] || 'en-IN';
  const noTrack = useMemo(() => (language === 'en' ? {} : { letterSpacing: 0 }), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tf, locale, noTrack }}>
      {children}
    </LanguageContext.Provider>
  );
}
