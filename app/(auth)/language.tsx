import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDsInsets, DS } from '../../constants/ds';
import { Button } from '../../components/ui';

export const ONBOARDED_KEY = 'sadhak_onboarded';

// First screen for a new user: pick the app language (English, Hindi,
// Bengali), then continue to the welcome screen. The choice applies at once
// so the rest of onboarding is already in the user's language.
const CHOICES: LanguageCode[] = ['en', 'hi', 'bn'];

export default function LanguageScreen() {
  const { language, setLanguage, tx } = useLanguage();
  const { colors } = useTheme();
  const { insets } = useDsInsets();
  const [picked, setPicked] = useState<LanguageCode>(language === 'hi' || language === 'bn' ? language : 'en');

  const pick = (code: LanguageCode) => {
    setPicked(code);
    setLanguage(code);
  };

  const next = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    router.push('/(auth)/welcome');
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <View style={st.brand}>
        <Image source={require('../../assets/images/emblem.png')} style={st.emblem} />
        <Text style={[st.wordmark, { color: colors.primary }]}>SADHAK</Text>
        <Text style={[st.title, { color: colors.text }]}>{tx('Choose your language')}</Text>
        <Text style={[st.sub, { color: colors.textSecondary }]}>{tx('You can change it later in Settings.')}</Text>
      </View>

      <View style={{ gap: 12 }}>
        {CHOICES.map((code) => {
          const info = SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
          const active = picked === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => pick(code)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[st.card, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '12' : colors.surface }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[st.native, { color: colors.text }]}>{info.nativeName}</Text>
                <Text style={[st.eng, { color: colors.textSecondary }]}>{info.name}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <Button title={tx('Continue')} onPress={next} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: DS.layout.screenPaddingH },
  brand: { alignItems: 'center', marginBottom: 32 },
  emblem: { width: 88, height: 88, borderRadius: 44 },
  wordmark: { fontSize: 13, fontWeight: '800', letterSpacing: 4, marginTop: 10 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  sub: { fontSize: 14.5, marginTop: 6, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18 },
  native: { fontSize: 19, fontWeight: '800' },
  eng: { fontSize: 13, marginTop: 2 },
});
