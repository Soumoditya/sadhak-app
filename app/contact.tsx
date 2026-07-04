import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from "../contexts/DialogContext";
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SUPPORT_EMAIL, APP_VERSION, PLAY_STORE_URL, PLAY_STORE_MARKET_URL } from '../constants/appInfo';
import { db, addDoc, collection, serverTimestamp } from '../config/firebase';

type FormType = 'bug' | 'feature' | null;

export default function ContactScreen() {
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      dialog.alert('Error', 'Please fill in both title and description');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, activeForm === 'bug' ? 'bug_reports' : 'feature_requests'), {
        title: title.trim(),
        description: description.trim(),
        type: activeForm,
        userId: user?.uid || 'anonymous',
        userEmail: profile?.email || 'guest',
        userName: profile?.displayName || 'Guest',
        appVersion: APP_VERSION,
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        status: 'new',
      });
      dialog.alert('🙏 Thank You!', t('contact.thankYou'));
      setTitle('');
      setDescription('');
      setActiveForm(null);
    } catch (error) {
      dialog.alert('Error', 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const contactOptions = [
    { icon: 'email-outline', label: t('contact.email'), color: '#D94F00', action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Sadhak App Feedback`) },
    { icon: 'bug-outline', label: t('contact.reportBug'), color: '#EF4444', action: () => setActiveForm('bug') },
    { icon: 'lightbulb-outline', label: t('contact.featureRequest'), color: '#4ADE80', action: () => setActiveForm('feature') },
    { icon: 'star-outline', label: t('settings.rateApp'), color: '#FFD700', action: () => {
      Linking.openURL(PLAY_STORE_MARKET_URL).catch(() => Linking.openURL(PLAY_STORE_URL));
    }},
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="message-text-outline" size={36} color="#FFD700" />
          <Text style={styles.headerTitle}>{t('contact.title')}</Text>
          <Text style={styles.headerSub}>We'd love to hear from you</Text>
        </LinearGradient>

        {/* Contact Options */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {contactOptions.map((opt, index) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.optionRow, index < contactOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}
              onPress={opt.action}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: opt.color + '15' }]}>
                <MaterialCommunityIcons name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bug Report / Feature Request Form */}
        {activeForm && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.formHeader}>
              <MaterialCommunityIcons
                name={activeForm === 'bug' ? 'bug-outline' : 'lightbulb-outline'}
                size={22}
                color={activeForm === 'bug' ? '#EF4444' : '#4ADE80'}
              />
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {activeForm === 'bug' ? t('contact.reportBug') : t('contact.featureRequest')}
              </Text>
              <TouchableOpacity onPress={() => setActiveForm(null)}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={t('contact.bugTitle')}
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={t('contact.bugDescription')}
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
              <LinearGradient colors={['#D94F00', '#F07830']} style={styles.submitBtn}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                    <Text style={styles.submitText}>{t('contact.submit')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.formNote, { color: colors.textTertiary }]}>
              App v{APP_VERSION} • {Platform.OS === 'android' ? 'Android' : 'iOS'}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            We typically respond within 24-48 hours. For urgent issues, please email us directly at{' '}
            <Text style={{ color: '#D94F00', fontWeight: '600' }}>{SUPPORT_EMAIL}</Text>
          </Text>
        </View>
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
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  formTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  textArea: { height: 100, paddingTop: 12 },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 48 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  formNote: { textAlign: 'center', marginTop: 10, fontSize: 11 },
  infoText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
