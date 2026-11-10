import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Easing, Image, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import Icon, { type IconName } from './Icon';
import Diya from './Diya';
import { useQuickSettings } from './QuickSettings';
import { APP_VERSION } from '../../constants/appInfo';

// Left drawer that replaces the avatar button on Home. Backdrop tap or the
// Android back button closes it; every row navigates and closes first.

type Row = { key: string; label: string; icon: IconName | 'diya'; route: string };

const ROWS: Row[] = [
  { key: 'home', label: 'nav.home', icon: 'house', route: '/(tabs)' },
  { key: 'panchang', label: 'f.panchang', icon: 'sun-horizon', route: '/panchang' },
  { key: 'calendar', label: 'f.calendar', icon: 'calendar-dots', route: '/(tabs)/calendar' },
  { key: 'japa', label: 'f.japa', icon: 'hands-praying', route: '/japa' },
  { key: 'aarti', label: 'f.aarti', icon: 'diya', route: '/aarti' },
  { key: 'ai', label: 'f.ai', icon: 'sparkle', route: '/ask' },
  { key: 'library', label: 'f.library', icon: 'books', route: '/(tabs)/library' },
  { key: 'community', label: 'chat.title', icon: 'chats-circle', route: '/(tabs)/chat' },
  { key: 'puja', label: 'f.puja', icon: 'scroll', route: '/puja-guide' },
  { key: 'settings', label: 'menu.settings', icon: 'gear-six', route: '/settings' },
  { key: 'profile', label: 'nav.profile', icon: 'user-circle', route: '/(tabs)/profile' },
];

export default function Sidebar({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const qs = useQuickSettings();
  const slide = useRef(new Animated.Value(1)).current;
  const panelW = Math.min(320, Math.floor(width * 0.84));

  useEffect(() => {
    if (!visible) return;
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible]);

  const close = () => {
    Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };

  const go = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 200);
  };

  const openSheet = (kind: 'language' | 'theme') => {
    close();
    setTimeout(() => qs.open(kind), 220);
  };

  if (!visible) return null;
  const firstName = profile?.displayName?.split(' ')[0] || 'Sadhak';
  const langName = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';
  const isActive = (route: string) => pathname === route || (route === '/(tabs)' && (pathname === '/(tabs)/index' || pathname === '/'));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('ui.cancel')} />
      </Animated.View>
      <Animated.View
        style={[
          sb.panel,
          {
            backgroundColor: colors.surface,
            width: panelW,
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-panelW, 0] }) }],
          },
        ]}
      >
        {/* Header: the avatar lives here now; tap goes to Profile. */}
        <TouchableOpacity onPress={() => go('/(tabs)/profile')} style={sb.head} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('nav.profile')}>
          {profile?.profilePicUrl ? (
            <Image source={{ uri: profile.profilePicUrl }} style={[sb.avatar, { borderColor: colors.cardBorder }]} />
          ) : (
            <View style={[sb.avatar, { backgroundColor: colors.primary + '18', borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={[sb.avatarText, { color: colors.primary }]}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[sb.name, { color: colors.text }]} numberOfLines={1}>{profile?.displayName || 'Sadhak'}</Text>
            <Text style={[sb.viewProfile, { color: colors.primary }]} numberOfLines={1}>{profile?.username ? `@${profile.username}` : t('p.title')}</Text>
          </View>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 6 }}>
          {ROWS.map((r) => {
            const on = isActive(r.route);
            return (
              <TouchableOpacity key={r.key} onPress={() => go(r.route)} style={[sb.row, on && { backgroundColor: colors.primary + '12' }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={[sb.rowIcon, { backgroundColor: on ? colors.primary + '18' : colors.surfaceSecondary }]}>
                  {r.icon === 'diya' ? (
                    <Diya size={20} color={on ? colors.primary : colors.textSecondary} />
                  ) : (
                    <Icon name={r.icon} size={20} color={on ? colors.primary : colors.textSecondary} weight={on ? 'fill' : 'regular'} />
                  )}
                </View>
                <Text style={[sb.rowLabel, { color: on ? colors.primary : colors.text }]}>{t(r.label)}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={[sb.divider, { backgroundColor: colors.divider }]} />

          <TouchableOpacity onPress={() => openSheet('language')} style={sb.row} activeOpacity={0.7} accessibilityRole="button">
            <View style={[sb.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon name="globe" size={20} color={colors.textSecondary} weight="regular" />
            </View>
            <Text style={[sb.rowLabel, { color: colors.text }]}>{t('s.language')}</Text>
            <Text style={[sb.rowValue, { color: colors.textTertiary }]}>{langName}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openSheet('theme')} style={sb.row} activeOpacity={0.7} accessibilityRole="button">
            <View style={[sb.rowIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon name={isDark ? 'sun' : 'moon'} size={20} color={colors.textSecondary} weight="regular" />
            </View>
            <Text style={[sb.rowLabel, { color: colors.text }]}>{t('s.appearance')}</Text>
            <Text style={[sb.rowValue, { color: colors.textTertiary }]}>{isDark ? t('theme.dark') : t('theme.light')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={[sb.version, { color: colors.textTertiary }]}>Sadhak · v{APP_VERSION}</Text>
      </Animated.View>
    </Modal>
  );
}

const sb = StyleSheet.create({
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0, borderTopRightRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1 },
  avatarText: { fontSize: 21, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800' },
  viewProfile: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  rowValue: { fontSize: 13, fontWeight: '700' },
  divider: { height: 1, marginVertical: 8, marginHorizontal: 10 },
  version: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', marginTop: 10 },
});
