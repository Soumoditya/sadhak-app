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
    title: 'Acceptance of Terms',
    content: `By downloading, installing, or using ${APP_NAME}, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the app.`,
  },
  {
    title: 'User Accounts',
    content: `You may use ${APP_NAME} as a Guest or create a registered account. You are responsible for maintaining the confidentiality of your credentials. You must provide accurate information during registration.`,
  },
  {
    title: 'Acceptable Use',
    content: 'You agree to use Sadhak only for lawful purposes. You must not:\n• Post offensive, hateful, or inappropriate content in community chat\n• Impersonate other users or entities\n• Attempt to hack, disrupt, or reverse-engineer the app\n• Upload copyrighted material to the library without permission\n• Use automated bots or scripts to access the app',
  },
  {
    title: 'Community Guidelines',
    content: 'Sadhak is a spiritual community. In all chat rooms and interactions:\n• Be respectful of all traditions and beliefs within Hinduism\n• No casteism, discrimination, or hate speech\n• No spam, advertising, or promotional content\n• No sharing of personal information of others\n• Admins reserve the right to remove content or ban users who violate these guidelines',
  },
  {
    title: 'Content & Intellectual Property',
    content: `All content provided by ${APP_NAME} (Panchang calculations, grooming rules, shlokas, aarti lyrics) is for informational and spiritual purposes. We strive for accuracy but cannot guarantee perfection. Sacred texts and translations are sourced from public domain scriptures.`,
  },
  {
    title: 'User-Generated Content',
    content: 'By uploading content (PDFs, chat messages, notes), you grant Sadhak a non-exclusive license to display that content within the app. You retain ownership of your content and can delete it at any time.',
  },
  {
    title: 'Disclaimer',
    content: `${APP_NAME} is provided "as is" without warranties of any kind. Grooming rules and Panchang data are based on traditional Hindu scriptures and may vary by regional tradition. Always consult local pandits for important ceremonies. ${APP_NAME} is not responsible for any decisions made based on app content.`,
  },
  {
    title: 'Limitation of Liability',
    content: `${APP_NAME} and its developers shall not be liable for any indirect, incidental, or consequential damages arising from the use of the app.`,
  },
  {
    title: 'Changes to Terms',
    content: 'We may update these Terms & Conditions from time to time. Continued use of the app after changes constitutes acceptance of the new terms.',
  },
];

export default function TermsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title={t('terms.title')} subtitle="Effective: June 2026" />

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{`${idx + 1}. ${section.title}`}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.content}</Text>
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
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 13, lineHeight: 21 },
  contactText: { textAlign: 'center', marginTop: 24, fontSize: 13 },
});
