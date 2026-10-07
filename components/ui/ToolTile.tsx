import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Icon from './Icon';
import Diya from './Diya';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Tool } from '../../constants/tools';

/** Tool glyph in its tone: a soft rounded square with a duotone icon. */
export function ToolGlyph({ tool, size = 48 }: { tool: Tool; size?: number }) {
  const { tones } = useTheme();
  const tone = tones[tool.tone];
  const icon = Math.round(size * 0.52);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
      {tool.icon === 'diya' ? <Diya size={icon} color={tone.fg} /> : <Icon name={tool.icon} size={icon} color={tone.fg} />}
    </View>
  );
}

/** Grid tile: glyph over a short label. Width comes from the parent grid. */
export function ToolTile({ tool, width }: { tool: Tool; width: number }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={() => router.push(tool.route as any)}
      style={({ pressed }) => [s.tile, { width, opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      accessibilityRole="button"
      accessibilityLabel={t(tool.label)}
    >
      <ToolGlyph tool={tool} size={Math.min(56, width - 18)} />
      <Text style={[s.label, { color: colors.text }]} numberOfLines={1}>{t(tool.label)}</Text>
    </Pressable>
  );
}

/** Row card: glyph, name and one-line description (Tools tab). */
export function ToolRow({ tool }: { tool: Tool }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={() => router.push(tool.route as any)}
      style={({ pressed }) => [s.row, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
    >
      <ToolGlyph tool={tool} size={46} />
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{t(tool.label)}</Text>
        <Text style={[s.rowDesc, { color: colors.textSecondary }]} numberOfLines={2}>{t(tool.desc)}</Text>
      </View>
      <Icon name="caret-right" size={16} color={colors.textTertiary} weight="regular" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: { alignItems: 'center', paddingVertical: 6, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1 },
  rowTitle: { fontSize: 15.5, fontWeight: '800' },
  rowDesc: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
});
