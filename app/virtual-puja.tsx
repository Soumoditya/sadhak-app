import React, { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/ui';
import { useDsInsets, DS } from '../constants/ds';
import { BG, BG_ASPECT } from '../components/puja/art';
import { SCENES, type Scene, type Lang } from '../components/puja/scenes';
import { readStreak } from '../components/puja/streak';

// Choose a puja: each one a card showing its painted place (from Satya Jyotish).
export default function VirtualPujaScreen() {
  const { colors, tones } = useTheme();
  const { tx, language } = useLanguage();
  const { screenBottom } = useDsInsets();
  const lang: Lang = language === 'hi' || language === 'mr' ? 'hi' : language === 'bn' || language === 'as' ? 'bn' : 'en';
  const [streak, setStreak] = useState(0);
  useFocusEffect(useCallback(() => { void readStreak().then(setStreak); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tx('Virtual puja')} subtitle={tx('Offer, pour, light and do aarti with your finger')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom, gap: 14 }} showsVerticalScrollIndicator={false}>
        {streak > 0 && (
          <View style={[s.streak, { backgroundColor: tones.saffron.bg, borderColor: tones.saffron.fg + '40' }]}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>🪔 {streak} {tx(streak === 1 ? 'day' : 'days in a row')}</Text>
          </View>
        )}
        {SCENES.map((scene) => (
          <PujaCard key={scene.id} scene={scene} lang={lang} onPress={() => router.push(`/puja/${scene.id}` as never)} />
        ))}
        <Pressable onPress={() => router.push('/puja-guide')} style={[s.guide, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14.5 }}>{tx('Doing the puja at home?')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }}>{tx('Samagri list and step-by-step vidhi')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const CARD_H = 190;
/** Where the deity's point lands in the card, from the top: the middle of the part the caption leaves clear. */
const FOCUS_AT = 64;

/** One puja: its painted place at full card width, slid so the deity sits above the caption. */
function PujaCard({ scene, lang, onPress }: { scene: Scene; lang: Lang; onPress: () => void }) {
  const [w, setW] = useState(0);
  const h = w / BG_ASPECT;
  const top = Math.min(0, Math.max(CARD_H - h, FOCUS_AT - scene.card * h));
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={s.card}>
        {w > 0 ? <Image source={BG[scene.bg]} style={{ position: 'absolute', left: 0, top, width: w, height: h }} resizeMode="cover" /> : null}
        <View style={s.caption}>
          <Text style={s.title}>{scene.title[lang]}</Text>
          <Text style={s.blurb} numberOfLines={1}>{scene.blurb[lang]}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  streak: { borderRadius: 16, borderWidth: 1, padding: 14 },
  card: { height: CARD_H, borderRadius: 20, overflow: 'hidden', backgroundColor: '#120c08' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(12,6,2,0.6)' },
  title: { color: '#fff3d6', fontSize: 19, fontWeight: '800' },
  blurb: { color: '#ecd9b0', fontSize: 13, marginTop: 2 },
  guide: { padding: 14, borderRadius: 16, borderWidth: 1 },
});
