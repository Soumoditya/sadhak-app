import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Easing, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../../contexts/LanguageContext';
import { DS } from '../../constants/ds';

// One sheet for the two things people flip most: light/dark and language.
// Reachable from Home, every tab header and every screen header, so nobody
// has to dig into Settings for them.

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useQuickSettings = () => useContext(Ctx);

export function QuickSettingsProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setVisible(true);
  }, []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {visible && <QuickSheet onClose={() => setVisible(false)} />}
    </Ctx.Provider>
  );
}

// Short script mark for the current language, shown on the header chip.
const SCRIPT_MARK: Record<string, string> = {
  en: 'En', hi: 'हि', bn: 'বা', mr: 'म', gu: 'ગુ', ta: 'த', te: 'తె', kn: 'ಕ', ml: 'മ', pa: 'ਪੰ', as: 'অ', od: 'ଓ',
};

function QuickSheet({ onClose }: { onClose: () => void }) {
  const { colors, mode, setMode, isDark } = useTheme();
  const { language, setLanguage, t, noTrack, display } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const close = () => {
    Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };

  const pickMode = (m: ThemeMode) => { Haptics.selectionAsync().catch(() => {}); setMode(m); };
  const pickLang = (l: LanguageCode) => { Haptics.selectionAsync().catch(() => {}); setLanguage(l); };

  const modes: { key: ThemeMode; icon: 'sun' | 'moon' | 'gear-six'; label: string }[] = [
    { key: 'light', icon: 'sun', label: t('theme.light') },
    { key: 'dark', icon: 'moon', label: t('theme.dark') },
    { key: 'system', icon: 'gear-six', label: t('theme.system') },
  ];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('ui.cancel')} />
      </Animated.View>
      <Animated.View
        style={[
          qs.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 18,
            maxHeight: height * 0.82,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.6] }) }],
          },
        ]}
      >
        <View style={[qs.grabber, { backgroundColor: colors.border }]} />
        <View style={qs.titleRow}>
          <Text style={[qs.title, { color: colors.text }, display]}>{t('qs.title')}</Text>
          <TouchableOpacity onPress={close} hitSlop={10} style={[qs.close, { backgroundColor: colors.surfaceSecondary }]}>
            <Icon name="x" size={16} color={colors.textSecondary} weight="regular" />
          </TouchableOpacity>
        </View>

        <Text style={[qs.label, { color: colors.textTertiary }, noTrack]}>{t('s.appearance')}</Text>
        <View style={[qs.segment, { backgroundColor: colors.surfaceSecondary }]}>
          {modes.map((m) => {
            const on = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => pickMode(m.key)}
                style={[qs.segBtn, on && { backgroundColor: colors.surface, ...DS.elevation.sm, shadowOpacity: isDark ? 0.3 : 0.08 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={m.icon} size={18} color={on ? colors.primary : colors.textTertiary} weight={on ? 'fill' : 'regular'} />
                <Text style={[qs.segText, { color: on ? colors.text : colors.textSecondary }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[qs.label, { color: colors.textTertiary, marginTop: 22 }, noTrack]}>{t('s.language')}</Text>
        <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
          <View style={qs.langGrid}>
            {SUPPORTED_LANGUAGES.map((l) => {
              const on = language === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => pickLang(l.code as LanguageCode)}
                  style={[
                    qs.lang,
                    { backgroundColor: on ? colors.primary + '14' : colors.surface, borderColor: on ? colors.primary : colors.cardBorder },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[qs.langNative, { color: on ? colors.primary : colors.text }]} numberOfLines={1}>{l.nativeName}</Text>
                  <Text style={[qs.langEn, { color: colors.textTertiary }]} numberOfLines={1}>{l.name}</Text>
                  {on && (
                    <View style={[qs.tick, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={11} color="#FFF" weight="regular" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={[qs.note, { color: colors.textTertiary }]}>{t('s.languageNote')}</Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Header controls ────────────────────────────────────────────────────────

/** Round language chip ("En", "हि", "বা") that opens the quick sheet. */
export function LanguageChip({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const { open } = useQuickSettings();
  return (
    <TouchableOpacity
      onPress={open}
      hitSlop={6}
      accessibilityLabel={t('s.language')}
      style={[qs.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
    >
      <Text style={[qs.chipText, { color: colors.text }]}>{SCRIPT_MARK[language] || 'En'}</Text>
    </TouchableOpacity>
  );
}

/** One-tap light/dark flip. Long-press opens the full sheet (incl. System). */
export function ThemeToggle({ size = 40 }: { size?: number }) {
  const { colors, isDark, setMode } = useTheme();
  const { t } = useLanguage();
  const { open } = useQuickSettings();
  const spin = useRef(new Animated.Value(0)).current;
  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setMode(isDark ? 'light' : 'dark');
  };
  return (
    <TouchableOpacity
      onPress={flip}
      onLongPress={open}
      hitSlop={6}
      accessibilityLabel={t(isDark ? 'theme.light' : 'theme.dark')}
      style={[qs.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
    >
      <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
        <Icon name={isDark ? 'sun' : 'moon'} size={19} color={isDark ? '#F2C14E' : colors.text} weight="duotone" />
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Compact single button for crowded headers: opens theme + language sheet. */
export function QuickSettingsButton({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { open } = useQuickSettings();
  return (
    <TouchableOpacity
      onPress={open}
      hitSlop={6}
      accessibilityLabel={t('qs.title')}
      style={[qs.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
    >
      <Icon name="text-aa" size={19} color={colors.text} />
    </TouchableOpacity>
  );
}

const qs = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 22 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 12 },
  segText: { fontSize: 14, fontWeight: '700' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lang: { width: '31%', flexGrow: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5 },
  langNative: { fontSize: 16, fontWeight: '700' },
  langEn: { fontSize: 11.5, marginTop: 2 },
  tick: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 14 },
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '800', letterSpacing: 0 },
});
