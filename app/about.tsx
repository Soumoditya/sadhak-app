import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Header } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_NAME, APP_VERSION, APP_TAGLINE, DEVELOPER_NAME, SUPPORT_EMAIL, SOCIAL_LINKS, CHANGELOG } from '../constants/appInfo';
import { updateLabel } from '../services/appUpdates';

export default function AboutScreen() {
  const { colors, isDark } = useTheme();
  const { t, tx } = useLanguage();

  const links = [
    { label: t('settings.privacyPolicy'), icon: 'shield-lock-outline', route: '/privacy' },
    { label: t('settings.terms'), icon: 'file-document-outline', route: '/terms' },
    { label: t('settings.contact'), icon: 'email-outline', route: '/contact' },
    { label: t('settings.changelog'), icon: 'format-list-bulleted', route: '/changelog' },
    { label: t('settings.faq'), icon: 'help-circle-outline', route: '/faq' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <Header title={t('about.title') || 'About'} />
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Image source={require('../assets/images/emblem.png')} style={styles.appIcon} />
          <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>{APP_TAGLINE}</Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.primary + '14' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>{t('about.version')} {APP_VERSION}{updateLabel() ? ` · ${updateLabel()}` : ''}</Text>
          </View>
        </View>

        {/* Mission */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="heart-outline" size={22} color="#C2410C" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('about.mission')}</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            {t('about.missionText')}
          </Text>
        </View>

        {/* Developer */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="code-tags" size={22} color="#4ADE80" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{tx('Developer')}</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{DEVELOPER_NAME}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={styles.emailRow}>
            <MaterialCommunityIcons name="email-outline" size={16} color="#C2410C" />
            <Text style={[styles.emailText, { color: '#C2410C' }]}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {links.map((link, index) => (
            <TouchableOpacity
              key={link.route}
              style={[styles.linkRow, index < links.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={link.icon as any} size={20} color={colors.textSecondary} />
              <Text style={[styles.linkText, { color: colors.text }]}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Social — only shown once real accounts exist */}
        {(SOCIAL_LINKS.website || SOCIAL_LINKS.instagram || SOCIAL_LINKS.twitter) && (
        <View style={styles.socialRow}>
          {SOCIAL_LINKS.website && (
            <TouchableOpacity onPress={() => Linking.openURL(SOCIAL_LINKS.website!)} style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialCommunityIcons name="web" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {SOCIAL_LINKS.instagram && (
            <TouchableOpacity onPress={() => Linking.openURL(SOCIAL_LINKS.instagram!)} style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialCommunityIcons name="instagram" size={22} color="#E4405F" />
            </TouchableOpacity>
          )}
          {SOCIAL_LINKS.twitter && (
            <TouchableOpacity onPress={() => Linking.openURL(SOCIAL_LINKS.twitter!)} style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialCommunityIcons name="twitter" size={22} color="#1DA1F2" />
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textTertiary }]}>{t('about.madeIn')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 44, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  appIcon: { width: 80, height: 80, borderRadius: 20, marginBottom: 12 },
  hero: { alignItems: 'center', marginHorizontal: 20, paddingVertical: 24, borderRadius: 20, borderWidth: 1 },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  tagline: { fontSize: 14, marginTop: 4 },
  versionBadge: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  versionText: { fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBody: { fontSize: 14, lineHeight: 22 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  emailText: { fontSize: 13, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '500' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 },
  socialBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  footer: { textAlign: 'center', marginTop: 24, fontSize: 13 },
});
