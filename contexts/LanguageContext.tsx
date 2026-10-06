import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DS } from '../constants/ds';
import { PHRASES } from '../constants/translations/phrases';
import { CONTENT } from '../constants/translations/content';
import { devaToBengali } from '../constants/translations/script';
import { ALL_TRANSLATIONS, SUPPORTED_LANGUAGES, LOCALE, type LanguageCode } from '../constants/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  /** t() with {placeholders} filled, e.g. tf('panch.until', { t: '05:51' }). */
  tf: (key: string, vars: Record<string, string | number>) => string;
  /** Translate a phrase by its English wording (falls back to the English). */
  tx: (english: string) => string;
  /** Locale for toLocaleDateString / toLocaleTimeString in the chosen language. */
  locale: string;
  /** Style override: Indic scripts break apart with letter-spacing, so drop it. */
  noTrack: { letterSpacing?: number };
  /**
   * Display face for titles in the current script: Fraunces for Latin, Tiro
   * Devanagari for Hindi/Marathi, heavy system face for other scripts.
   */
  display: TextStyle;
  /**
   * A term that exists in English and Devanagari (tithi, nakshatra, festival):
   * English for en, Devanagari for hi/mr, Bengali script for bn/as.
   */
  native: (en: string, hi?: string) => string;
  /**
   * Localised field of a content object: obj[field_hi] / obj[field_bn], then
   * obj[fieldHi] for Hindi, then the English obj[field].
   */
  pick: <T extends Record<string, any>>(obj: T, field: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  tf: (key: string) => key,
  tx: (s: string) => s,
  locale: 'en-IN',
  noTrack: {},
  display: { fontFamily: DS.font.display, fontWeight: 'normal' },
  native: (en: string) => en,
  pick: (obj: any, field: string) => obj?.[field] ?? '',
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

  const tx = useCallback((english: string): string => {
    if (language === 'en' || !english) return english;
    const row = PHRASES[english] || CONTENT[english];
    if (language === 'hi' || language === 'mr') return row?.[0] || english;
    if (language === 'bn' || language === 'as') return row?.[1] || english;
    return english;
  }, [language]);

  const locale = LOCALE[language] || 'en-IN';
  const noTrack = useMemo(() => (language === 'en' ? {} : { letterSpacing: 0 }), [language]);

  const display = useMemo<TextStyle>(() => {
    if (language === 'en') return { fontFamily: DS.font.display, fontWeight: 'normal' };
    if (language === 'hi' || language === 'mr') return { fontFamily: DS.font.deva, fontWeight: 'normal', letterSpacing: 0 };
    return { fontWeight: '800', letterSpacing: 0 };
  }, [language]);

  const native = useCallback((en: string, hi?: string): string => {
    if (!hi) return en;
    if (language === 'hi' || language === 'mr') return hi;
    if (language === 'bn' || language === 'as') return devaToBengali(hi);
    return en;
  }, [language]);

  const pick = useCallback(<T extends Record<string, any>>(obj: T, field: string): string => {
    if (!obj) return '';
    const deva = language === 'hi' || language === 'mr';
    const beng = language === 'bn' || language === 'as';
    if (deva) return obj[`${field}_hi`] || obj[`${field}Hi`] || obj[field] || '';
    if (beng) return obj[`${field}_bn`] || obj[field] || '';
    return obj[field] || '';
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tf, tx, locale, noTrack, display, native, pick }}>
      {children}
    </LanguageContext.Provider>
  );
}
