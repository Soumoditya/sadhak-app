import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_TRANSLATIONS, SUPPORTED_LANGUAGES, type LanguageCode } from '../constants/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
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

  // Translation function with fallback chain: selected → hi → en
  const t = useCallback((key: string): string => {
    const selectedMap = ALL_TRANSLATIONS[language];
    if (selectedMap?.[key]) return selectedMap[key];

    // Fallback to Hindi
    if (language !== 'hi' && ALL_TRANSLATIONS.hi[key]) return ALL_TRANSLATIONS.hi[key];

    // Fallback to English
    if (ALL_TRANSLATIONS.en[key]) return ALL_TRANSLATIONS.en[key];

    // Return key itself if nothing found
    return key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
