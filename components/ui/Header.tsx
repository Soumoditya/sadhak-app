import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { DS, useDsInsets } from '../../constants/ds';

/**
 * Redesigned page header — inline title, no gradient posters. Kept to the
 * screen padding grid so it aligns with body content.
 */
interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  /** Custom back action (e.g. close an in-screen sub-view instead of leaving). */
  onBack?: () => void;
}

// Screens opened from a notification on a cold start have no history to go
// back to; fall back to Home instead of a no-op/"GO_BACK not handled" error.
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function Header({ title, subtitle, back = true, right, onBack }: Props) {
  const { colors } = useTheme();
  const { insets } = useDsInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: DS.space.md }]}>
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            onPress={onBack || goBackOrHome}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <View style={{ flex: 1, marginLeft: DS.space.md, marginRight: right ? DS.space.md : 0 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={[styles.sub, { color: colors.textTertiary }]} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: DS.layout.screenPaddingH },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: DS.type.title2.size, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: DS.type.caption.size, marginTop: 2 },
});
