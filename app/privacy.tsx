import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_NAME, SUPPORT_EMAIL } from '../constants/appInfo';

const SECTIONS = [
  {
    title: 'Information We Collect',
    icon: 'database-outline',
    items: [
      'Account information (email, display name) when you register',
      'Profile data (gender, marriage status) you provide for personalization',
      'Approximate location (city/state) for accurate Panchang calculations',
      'App usage data to improve the experience',
    ],
  },
  {
    title: 'How We Use Your Information',
    icon: 'cog-outline',
    items: [
      'Personalize grooming rules based on your gender and marriage status',
      'Calculate accurate Panchang, sunrise/sunset based on your location',
      'Send spiritual reminders and festival notifications',
      'Display your profile in community chat (if enabled)',
    ],
  },
  {
    title: 'Data Storage & Security',
    icon: 'shield-lock-outline',
    items: [
      'Data is stored securely using Google Firebase (Firestore & Realtime Database)',
      'Profile images are stored via Cloudinary with encrypted transfer',
      'We use industry-standard encryption for all data in transit',
      'We never sell, trade, or rent your personal information to third parties',
    ],
  },
  {
    title: 'Third-Party Services',
    icon: 'link-variant',
    items: [
      'Google Firebase — Authentication, database, and analytics',
      'Cloudinary — Profile image hosting',
      'Expo Notifications — Push notification delivery',
      'We do NOT use any advertising SDKs or trackers',
    ],
  },
  {
    title: 'Your Rights',
    icon: 'account-check-outline',
    items: [
      'You can delete your account and all associated data at any time from Settings',
      'You can use the app as a Guest without providing any personal information',
      'You can disable notifications at any time',
      'You can request a copy of your data by emailing us',
      'You can control your privacy settings (community visibility, DMs) from your Profile',
    ],
  },
  {
    title: 'Location Data',
    icon: 'map-marker-outline',
    items: [
      'Location is used ONLY for Panchang calculations (sunrise, sunset, Rahu Kaal)',
      'We store only city and state — not precise GPS coordinates',
      'Location access is optional — you can use the app without it',
    ],
  },
  {
    title: 'Children\'s Privacy',
    icon: 'baby-face-outline',
    items: [
      `${APP_NAME} is suitable for all ages and contains only spiritual/educational content`,
      'We do not knowingly collect data from children under 13',
      'Parents/guardians can contact us to delete a child\'s data',
    ],
  },
];

export default function PrivacyScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title={t('privacy.title')} subtitle="Last updated: June 2026" />

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {APP_NAME} respects your privacy. This policy describes how we collect, use, and protect your information.
        </Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name={section.icon as any} size={20} color="#D94F00" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            {section.items.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: '#D94F00' }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={[styles.contactText, { color: colors.textTertiary }]}>
          Questions? Email us at {SUPPORT_EMAIL}
        </Text>
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
  intro: { fontSize: 14, lineHeight: 22, marginHorizontal: 20, marginTop: 20 },
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontSize: 16, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  contactText: { textAlign: 'center', marginTop: 24, fontSize: 13 },
});
