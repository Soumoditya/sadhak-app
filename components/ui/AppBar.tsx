import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { goBackOrHome } from './Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS } from '../../constants/ds';
import { LanguageChip, ThemeToggle } from './QuickSettings';

/**
 * Top bar for the tab screens: large display title on the left, language and
 * theme switches (plus any extra actions) on the right. Sits inside the
 * screen's scroll content, under the safe-area padding.
 */
export default function AppBar({ title, subtitle, right, overline, back }: {
  title: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  /** Show a back button (for tab-hosted screens reached from elsewhere). */
  back?: boolean;
}) {
  const { colors } = useTheme();
  const { display, noTrack } = useLanguage();
  return (
    <View style={s.row}>
      {back && (
        <TouchableOpacity
          onPress={goBackOrHome}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[s.back, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <Icon name="caret-left" size={20} color={colors.text} weight="regular" />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1, marginRight: 10 }}>
        {!!overline && <Text style={[s.overline, { color: colors.primary }, noTrack]} numberOfLines={1}>{overline}</Text>}
        <Text style={[s.title, { color: colors.text }, display]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{title}</Text>
        {!!subtitle && <Text style={[s.sub, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={s.right}>
        {right}
        <LanguageChip />
        <ThemeToggle />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginBottom: DS.space.lg },
  overline: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 30, lineHeight: 40 },
  sub: { fontSize: 13, marginTop: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
