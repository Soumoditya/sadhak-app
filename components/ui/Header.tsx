import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS, useDsInsets } from '../../constants/ds';
import { LanguageChip, ThemeToggle } from './QuickSettings';

/**
 * Screen header for every pushed screen: back, display-face title, optional
 * right actions, and the same language chip + theme toggle as Home and the
 * tabs (pass quick={false} on screens that draw their own, e.g. Settings).
 */
interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  /** Custom back action (e.g. close an in-screen sub-view instead of leaving). */
  onBack?: () => void;
  quick?: boolean;
}

// Screens opened from a notification on a cold start have no history to go
// back to; fall back to Home instead of a no-op/"GO_BACK not handled" error.
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function Header({ title, subtitle, back = true, right, onBack, quick = true }: Props) {
  const { colors } = useTheme();
  const { display, noTrack, tx } = useLanguage();
  const { insets } = useDsInsets();
  // Long names ("Temples & Bhandara") step down a size instead of truncating
  // next to header actions.
  const crowded = !!right;
  const titleSize = crowded && title.length > 14 ? 16 : title.length > 16 || (crowded && title.length > 10) ? 18 : title.length > 11 ? 20 : 22;
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: DS.space.md }]}>
      <View style={styles.row}>
        {back && (
          <TouchableOpacity
            onPress={onBack || goBackOrHome}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="caret-left" size={20} color={colors.text} weight="regular" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: back ? DS.space.md : 0, marginRight: DS.space.sm }}>
          <Text
            style={[styles.title, { color: colors.text, fontSize: titleSize, lineHeight: titleSize + 8 }, display]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {tx(title)}
          </Text>
          {!!subtitle && <Text style={[styles.sub, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{tx(subtitle)}</Text>}
        </View>
        <View style={styles.right}>
          {quick && <LanguageChip size={38} />}
          {quick && <ThemeToggle size={38} />}
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: DS.layout.screenPaddingH },
  row: { flexDirection: 'row', alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, lineHeight: 30 },
  sub: { fontSize: DS.type.caption.size, marginTop: 0 },
});
