import { Link, Stack, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DS } from '../constants/ds';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <MaterialCommunityIcons name="compass-off-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Off the path</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          This screen isn't part of Sadhak. Head back to your daily practice.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="home" size={18} color="#FFF" />
          <Text style={styles.ctaText}>Go home</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: DS.space.xl },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: DS.space.xl,
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  body: { fontSize: 14.5, lineHeight: 21, marginTop: DS.space.md, textAlign: 'center', maxWidth: 300 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 26, paddingVertical: 13, borderRadius: 100, marginTop: DS.space['2xl'],
  },
  ctaText: { color: '#FFF', fontSize: 14.5, fontWeight: '800' },
});
