import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { Colors, Tones, toneNameFor, type Tone, type ToneName } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  mode: ThemeMode;
  colors: typeof Colors.light;
  /** Earthy accent family (fg/bg pairs) for icons, chips and categories. */
  tones: Record<ToneName, Tone>;
  /** Tone for a tone name or a legacy accent hex (themed fg/bg pair). */
  tone: (color?: string) => Tone;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  mode: 'light',
  colors: Colors.light,
  tones: Tones.light,
  tone: (c?: string) => Tones.light[toneNameFor(c)],
  setMode: () => {},
  toggleTheme: () => {},
  setDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const MODE_KEY = 'themeMode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Light by default: the saffron-on-parchment palette is the app's identity.
  // Users can pick Dark or follow the phone (System) in Settings.
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [systemDark, setSystemDark] = useState(Appearance.getColorScheme() === 'dark');
  useColorScheme(); // re-render on system changes

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); })
      .catch(() => {});
    // Track the real system scheme even while the app overrides it.
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemDark(colorScheme === 'dark'));
    return () => sub.remove();
  }, []);

  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const tones = isDark ? Tones.dark : Tones.light;
  const tone = useCallback((c?: string) => tones[toneNameFor(c)], [tones]);

  // Make native pieces (date pickers, alerts, keyboard) and the window
  // background follow the app's choice, not just the phone's.
  useEffect(() => {
    try { Appearance.setColorScheme(mode === 'system' ? ('unspecified' as any) : mode); } catch {}
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [mode, colors.background]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  }, []);
  const setDarkMode = useCallback((dark: boolean) => setMode(dark ? 'dark' : 'light'), [setMode]);
  const toggleTheme = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);

  return (
    <ThemeContext.Provider value={{ isDark, mode, colors, tones, tone, setMode, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
