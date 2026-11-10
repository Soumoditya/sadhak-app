import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Icon, ToolGlyph, Diya } from '../ui';
import { TOOLS, type Tool } from '../../constants/tools';
import { DEVOTIONAL_ITEMS } from '../../constants/devotional';
import { PUJA_GUIDES } from '../../constants/pujaGuides';

// Home search: tools, aartis/chalisas/mantras/stotras and puja guides in one
// place. Tapping a result closes the sheet, then navigates (aarti and puja
// results open the exact item via an `id` param).

const MAIN_TOOLS = ['panchang', 'japa', 'aarti', 'ai'];

export default function HomeSearch({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  useEffect(() => { if (!visible) setQ(''); }, [visible]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return null;
    return {
      tools: TOOLS.filter((tool) => `${tool.key} ${t(tool.label)} ${t(tool.desc)}`.toLowerCase().includes(query)),
      devotional: DEVOTIONAL_ITEMS.filter((d) => `${d.title} ${d.titleHi} ${d.deity}`.toLowerCase().includes(query)),
      puja: PUJA_GUIDES.filter((g) => `${g.deity} ${g.deityHi} ${g.day}`.toLowerCase().includes(query)),
    };
  }, [q, language]);

  const go = (pathname: string, params?: Record<string, string>) => {
    onClose();
    setTimeout(() => router.push({ pathname, params } as any), 150);
  };

  const total = results ? results.tools.length + results.devotional.length + results.puja.length : 0;
  const suggestions = MAIN_TOOLS.map((k) => TOOLS.find((x) => x.key === k)!).filter(Boolean);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={hs.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('ui.cancel')} />
        <View style={[hs.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 18, maxHeight: '82%' }]}>
          <View style={[hs.grabber, { backgroundColor: colors.divider }]} />
          <View style={[hs.searchBar, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
            <Icon name="magnifying-glass" size={18} color={colors.textTertiary} weight="regular" />
            <TextInput
              style={[hs.input, { color: colors.text }]}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={q}
              onChangeText={setQ}
              autoFocus
              returnKeyType="search"
            />
            {q.length > 0 ? (
              <TouchableOpacity onPress={() => setQ('')} hitSlop={8}>
                <Icon name="x-circle" size={18} color={colors.textTertiary} weight="regular" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Icon name="x" size={18} color={colors.textTertiary} weight="regular" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!results && (
              <>
                <Text style={[hs.sectionLabel, { color: colors.textTertiary }]}>{t('home.quickAccess')}</Text>
                {suggestions.map((tool) => (
                  <SearchRow key={tool.key} tool={tool} title={t(tool.label)} sub={t(tool.desc)} onPress={() => go(tool.route)} />
                ))}
              </>
            )}
            {results && total === 0 && (
              <Text style={[hs.empty, { color: colors.textSecondary }]}>{t('home.noResults')}</Text>
            )}
            {results && results.tools.length > 0 && (
              <>
                <Text style={[hs.sectionLabel, { color: colors.textTertiary }]}>{t('home.tools')}</Text>
                {results.tools.map((tool) => (
                  <SearchRow key={tool.key} tool={tool} title={t(tool.label)} sub={t(tool.desc)} onPress={() => go(tool.route)} />
                ))}
              </>
            )}
            {results && results.devotional.length > 0 && (
              <>
                <Text style={[hs.sectionLabel, { color: colors.textTertiary }]}>{t('f.aarti')}</Text>
                {results.devotional.map((d) => (
                  <TouchableOpacity key={d.id} onPress={() => go('/aarti', { id: d.id })} style={hs.row} activeOpacity={0.7}>
                    <View style={[hs.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Diya size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[hs.title, { color: colors.text }]} numberOfLines={1}>{d.title}</Text>
                      <Text style={[hs.sub, { color: colors.textSecondary }]} numberOfLines={1}>{d.titleHi} · {d.deity}</Text>
                    </View>
                    <Icon name="caret-right" size={15} color={colors.textTertiary} weight="regular" />
                  </TouchableOpacity>
                ))}
              </>
            )}
            {results && results.puja.length > 0 && (
              <>
                <Text style={[hs.sectionLabel, { color: colors.textTertiary }]}>{t('f.puja')}</Text>
                {results.puja.map((g) => (
                  <TouchableOpacity key={g.id} onPress={() => go('/puja-guide', { id: g.id })} style={hs.row} activeOpacity={0.7}>
                    <View style={[hs.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Icon name="scroll" size={20} color={colors.primary} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[hs.title, { color: colors.text }]} numberOfLines={1}>{g.deity}</Text>
                      <Text style={[hs.sub, { color: colors.textSecondary }]} numberOfLines={1}>{g.deityHi} · {g.day}</Text>
                    </View>
                    <Icon name="caret-right" size={15} color={colors.textTertiary} weight="regular" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SearchRow({ tool, title, sub, onPress }: { tool: Tool; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={hs.row} activeOpacity={0.7}>
      <ToolGlyph tool={tool} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={[hs.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[hs.sub, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text>
      </View>
      <Icon name="caret-right" size={15} color={colors.textTertiary} weight="regular" />
    </TouchableOpacity>
  );
}

const hs = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, height: 48 },
  input: { flex: 1, fontSize: 15.5 },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 1 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 28, marginBottom: 12 },
});
