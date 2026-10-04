import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Screen, AppBar, Icon, ToolRow } from '../../components/ui';
import { TOOLS, TOOL_GROUPS } from '../../constants/tools';

// Every feature, grouped by what you're doing, with a one-line "what is this".
export default function ToolsScreen() {
  const { colors } = useTheme();
  const { t, display, noTrack } = useLanguage();
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return null;
    return TOOLS.filter((tool) =>
      [t(tool.label), t(tool.desc), tool.key].some((v) => v.toLowerCase().includes(query)),
    );
  }, [query, t]);

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <AppBar title={t('tools.title')} subtitle={t('tools.sub')} />

      <View style={[s.search, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Icon name="magnifying-glass" size={18} color={colors.textTertiary} weight="regular" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('tools.search')}
          placeholderTextColor={colors.textTertiary}
          style={[s.searchInput, { color: colors.text }]}
          returnKeyType="search"
        />
        {!!q && (
          <Pressable onPress={() => setQ('')} hitSlop={10}>
            <Icon name="x" size={16} color={colors.textTertiary} weight="regular" />
          </Pressable>
        )}
      </View>

      {matches ? (
        <View style={{ gap: 10, marginTop: 18 }}>
          {matches.length === 0 && <Text style={[s.empty, { color: colors.textTertiary }]}>{t('tools.none')}</Text>}
          {matches.map((tool) => <ToolRow key={tool.key} tool={tool} />)}
        </View>
      ) : (
        TOOL_GROUPS.map((g) => (
          <View key={g.key} style={{ marginTop: 24 }}>
            <Text style={[s.group, { color: colors.text }, display]}>{t(g.label)}</Text>
            <View style={{ gap: 10 }}>
              {TOOLS.filter((tool) => tool.group === g.key).map((tool) => <ToolRow key={tool.key} tool={tool} />)}
            </View>
          </View>
        ))
      )}

      {/* App-level shortcuts */}
      <View style={[s.footer, { borderTopColor: colors.divider }]}>
        {[
          { icon: 'user-circle' as const, label: t('nav.profile'), route: '/(tabs)/profile' },
          { icon: 'gear-six' as const, label: t('t.settings'), route: '/settings' },
          { icon: 'info' as const, label: t('tools.about'), route: '/about' },
        ].map((l) => (
          <Pressable key={l.route} onPress={() => router.push(l.route as any)} style={({ pressed }) => [s.footBtn, { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name={l.icon} size={18} color={colors.textSecondary} />
            <Text style={[s.footText, { color: colors.textSecondary }, noTrack]} numberOfLines={1}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  group: { fontSize: 19, lineHeight: 27, marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 28, paddingTop: 18, borderTopWidth: 1 },
  footBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14 },
  footText: { fontSize: 13, fontWeight: '700' },
});
