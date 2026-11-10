import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_VERSION, CHANGELOG } from '../constants/appInfo';

export default function ChangelogScreen() {
  const { colors, isDark } = useTheme();
  const { t, tx } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title={t('changelog.title')} subtitle={`You're on v${APP_VERSION}`} />

        {CHANGELOG.map((entry, idx) => (
          <View key={entry.version} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.versionRow}>
              <View style={[styles.versionBadge, idx === 0 && { backgroundColor: '#C2410C' }]}>
                <Text style={[styles.versionNumber, idx === 0 && { color: '#FFF' }]}>v{entry.version}</Text>
              </View>
              {idx === 0 && (
                <View style={styles.latestBadge}>
                  <Text style={styles.latestText}>{tx('Latest')}</Text>
                </View>
              )}
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>{entry.date}</Text>
            </View>
            <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title}</Text>
            {entry.changes.map((change, i) => (
              <View key={i} style={styles.changeRow}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#4ADE80" style={{ marginTop: 2 }} />
                <Text style={[styles.changeText, { color: colors.textSecondary }]}>{change}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 8 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  versionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(217,79,0,0.1)' },
  versionNumber: { fontSize: 13, fontWeight: '700', color: '#C2410C' },
  latestBadge: { backgroundColor: '#4ADE80', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  latestText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  dateText: { flex: 1, textAlign: 'right', fontSize: 12 },
  entryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  changeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  changeText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
