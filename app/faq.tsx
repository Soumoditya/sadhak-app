import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, LayoutAnimation, Platform, UIManager, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  q: string;
  a: string;
  icon: string;
}

const FAQ_SECTIONS: { title: string; icon: string; color: string; items: FAQItem[] }[] = [
  {
    title: 'Getting Started',
    icon: 'rocket-launch-outline',
    color: '#D94F00',
    items: [
      { q: 'What is Sadhak?', a: 'Sadhak is your complete Hindu spiritual companion app. It provides daily Panchang, grooming guidance based on traditional scriptures, a Hindu calendar with festivals, a sacred library, community chat, Japa Mala counter, Aarti collection, and much more — all personalized to your gender, marriage status, and location.', icon: 'information-outline' },
      { q: 'Is this app free?', a: 'Yes! Sadhak is completely free to use. All features including Panchang, calendar, grooming rules, library, chat, and notifications are available at no cost.', icon: 'currency-inr' },
      { q: 'Do I need an account?', a: 'No! You can use Sadhak in Guest Mode without creating an account. However, creating an account enables features like personal notes, chat, and data sync across devices.', icon: 'account-outline' },
      { q: 'How do I set up my profile?', a: 'After signing up, you\'ll be guided through profile setup where you can set your gender, marriage status, and location. These are used to personalize grooming rules and festival timings.', icon: 'account-cog-outline' },
    ],
  },
  {
    title: 'Panchang & Calendar',
    icon: 'calendar-star',
    color: '#9C27B0',
    items: [
      { q: 'How accurate is the Panchang?', a: 'Our Panchang engine uses astronomical calculations based on the Surya Siddhanta and modern ephemeris data. Tithi, Nakshatra, Yoga, and Karana are calculated to within a few minutes of accuracy for your specific location.', icon: 'compass-outline' },
      { q: 'Are festival dates location-based?', a: 'Yes! Festival timings like Ekadashi, Purnima, and Amavasya are calculated based on your timezone and location, ensuring you observe them at the correct local time.', icon: 'map-marker-outline' },
      { q: 'Can I add personal notes to calendar?', a: 'Yes! Tap any date on the calendar to add personal notes, set reminders, and view grooming rules. Notes are synced to your account across devices.', icon: 'note-edit-outline' },
      { q: 'What is Rahu Kaal?', a: 'Rahu Kaal is an inauspicious period (approximately 1.5 hours) each day ruled by Rahu. Starting new ventures during Rahu Kaal is traditionally avoided. The exact timing varies by location and day of the week.', icon: 'clock-alert-outline' },
      { q: 'Can I reset the calendar?', a: 'Yes! Go to the Calendar tab and use the reset option in the top menu to clear all personal notes and start fresh.', icon: 'refresh' },
    ],
  },
  {
    title: 'Grooming Rules',
    icon: 'content-cut',
    color: '#2D6A4F',
    items: [
      { q: 'What are grooming rules?', a: 'Based on Dharmashastra, Smriti texts, and traditional Hindu practices, certain days are auspicious or inauspicious for haircuts, shaving, and nail cutting. These depend on the day of the week (Vara), Tithi, Nakshatra, your gender, and marriage status.', icon: 'book-open-outline' },
      { q: 'Why avoid grooming on certain days?', a: 'According to scriptures like Garuda Purana and Dharma Sindhu, grooming on forbidden days can bring negative effects. For example, Tuesday haircuts are associated with reduced longevity, and Saturday nail-cutting with financial loss.', icon: 'alert-circle-outline' },
      { q: 'Do rules differ for men and women?', a: 'Yes! Married women have different guidelines than unmarried women or men. Widowed individuals also have specific observances. The app personalizes rules based on your profile.', icon: 'gender-male-female' },
      { q: 'What do the colored dots mean?', a: 'Green = Safe for grooming, Yellow = Caution (mild restrictions), Red = Avoid (strictly restricted). These appear on your calendar for easy reference.', icon: 'circle-slice-8' },
    ],
  },
  {
    title: 'Library & Books',
    icon: 'bookshelf',
    color: '#1565C0',
    items: [
      { q: 'How do I read books?', a: 'Go to the Library tab, browse by category (Vedas, Upanishads, Puranas, etc.), and tap any book to open it. PDFs open in your device\'s built-in viewer.', icon: 'book-open-page-variant-outline' },
      { q: 'Can I upload a book?', a: 'Regular users can submit PDFs for review. Admin will verify the content and publish it to the library. This ensures only authentic and quality content is available.', icon: 'upload-outline' },
      { q: 'What categories are available?', a: 'Vedas, Upanishads, Bhagavad Gita, Ramayana & Mahabharata, Puranas, Stotras & Mantras, Ayurveda, and Dharmashastra.', icon: 'format-list-bulleted' },
    ],
  },
  {
    title: 'Chat & Community',
    icon: 'forum-outline',
    color: '#FF8C00',
    items: [
      { q: 'What chat features are available?', a: 'Public chat rooms for spiritual discussions, private one-on-one messaging, group chats for satsang, and broadcast channels for admin announcements. All with real-time messaging, GIF support via GIPHY, and message reactions.', icon: 'chat-outline' },
      { q: 'How do I create a group?', a: 'Go to the Chat tab > Groups section > Create Group. You can set the group as public (anyone can join) or private (invite only). Add a name and description.', icon: 'account-group-outline' },
      { q: 'Is chat moderated?', a: 'Yes! Admins can moderate all public chats. Inappropriate content can be reported and removed. We maintain a respectful spiritual environment.', icon: 'shield-check-outline' },
    ],
  },
  {
    title: 'Notifications',
    icon: 'bell-outline',
    color: '#D32F2F',
    items: [
      { q: 'Why do I get hourly notifications?', a: 'Sadhak sends unique spiritual wisdom, mantras, Hindu facts, and Vedic knowledge every hour to keep you connected with your spiritual journey. Each notification is unique — never repeated!', icon: 'bell-ring-outline' },
      { q: 'Can I disable notifications?', a: 'Yes! Go to Profile > Settings and toggle off "Spiritual Reminders". You can also control festival reminders, grooming reminders, and Ekadashi reminders individually.', icon: 'bell-off-outline' },
      { q: 'Are notifications time-aware?', a: 'Yes! Morning notifications focus on mantras and morning rituals, afternoon on facts and wisdom, evening on aarti and puja reminders, and night on bedtime shlokas and sleep rituals.', icon: 'clock-outline' },
    ],
  },
  {
    title: 'Account & Privacy',
    icon: 'shield-lock-outline',
    color: '#37474F',
    items: [
      { q: 'Is my data safe?', a: 'Your data is stored securely on Firebase servers with industry-standard encryption. Personal notes and chat messages are private to your account.', icon: 'lock-outline' },
      { q: 'Can I change my username?', a: 'Yes! Go to Profile and tap the edit icon next to your username. Usernames must be unique and can only contain letters, numbers, and underscores.', icon: 'at' },
      { q: 'How do I delete my account?', a: 'Go to Profile > Settings > Delete Account. This will permanently remove all your data, notes, and chat history. This action cannot be undone.', icon: 'delete-outline' },
      { q: 'What is Guest Mode?', a: 'Guest Mode lets you explore the app without signing up. You can view Panchang, calendar, and grooming rules. However, notes, chat, and data sync require an account.', icon: 'incognito' },
    ],
  },
];

export default function FAQScreen() {
  const { colors, isDark } = useTheme();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleSection = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === idx ? null : idx);
    setExpandedItem(null);
  };

  const toggleItem = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItem(expandedItem === key ? null : key);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <MaterialCommunityIcons name="help-circle-outline" size={40} color={colors.primary} />
        <Text style={[styles.heroTitle, { color: colors.text }]}>How can we help?</Text>
        <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
          Find answers to common questions about Sadhak
        </Text>
      </View>

      {/* FAQ Sections */}
      {FAQ_SECTIONS.map((section, sIdx) => (
        <View key={sIdx} style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(sIdx)} activeOpacity={0.7}>
            <View style={[styles.sectionIcon, { backgroundColor: section.color + '15' }]}>
              <MaterialCommunityIcons name={section.icon as any} size={22} color={section.color} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <MaterialCommunityIcons
              name={expandedSection === sIdx ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {expandedSection === sIdx && (
            <View style={styles.sectionItems}>
              {section.items.map((item, iIdx) => {
                const key = `${sIdx}-${iIdx}`;
                const isExpanded = expandedItem === key;
                return (
                  <View key={key}>
                    <TouchableOpacity
                      style={[styles.itemHeader, isExpanded && { backgroundColor: colors.primary + '08' }]}
                      onPress={() => toggleItem(key)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={item.icon as any} size={18} color={isExpanded ? colors.primary : colors.textTertiary} />
                      <Text style={[styles.itemQuestion, { color: isExpanded ? colors.primary : colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                        {item.q}
                      </Text>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'minus' : 'plus'}
                        size={18}
                        color={isExpanded ? colors.primary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={[styles.itemAnswer, { borderColor: colors.divider }]}>
                        <Text style={[styles.answerText, { color: colors.textSecondary }]}>{item.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {/* Contact */}
      <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Text style={[styles.contactTitle, { color: colors.text }]}>Still need help?</Text>
        <Text style={[styles.contactDesc, { color: colors.textSecondary }]}>
          Reach out to us and we'll get back to you
        </Text>
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => Linking.openURL('mailto:soumodityapramanik@gmail.com')}
          >
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
            <Text style={[styles.contactBtnText, { color: colors.primary }]}>Email Us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.tulsiGreen + '15' }]}
            onPress={() => Linking.openURL('https://wa.me/919064882049')}
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color={colors.tulsiGreen} />
            <Text style={[styles.contactBtnText, { color: colors.tulsiGreen }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.textTertiary }]}>Sadhak v1.0.0 • Made with 🙏 in India</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { marginHorizontal: 16, marginTop: 12, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroDesc: { fontSize: 14, textAlign: 'center' },
  section: { marginHorizontal: 16, marginTop: 10, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  sectionItems: { borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  itemQuestion: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  itemAnswer: { paddingHorizontal: 44, paddingBottom: 14, borderBottomWidth: 0.5 },
  answerText: { fontSize: 13, lineHeight: 20 },
  contactCard: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  contactTitle: { fontSize: 18, fontWeight: '700' },
  contactDesc: { fontSize: 13 },
  contactRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  contactBtnText: { fontSize: 14, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 20 },
});
