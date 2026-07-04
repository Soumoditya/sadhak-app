import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const AARTIS = [
  {
    id: '1', name: 'Om Jai Jagdish Hare', nameHi: 'ॐ जय जगदीश हरे', deity: 'Lord Vishnu', color: '#1565C0',
    lyrics: 'ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे।\nभक्त जनों के संकट, दास जनों के संकट,\nक्षण में दूर करे। ॐ जय जगदीश हरे।\n\nजो ध्यावे फल पावे, दुख बिनसे मन का,\nस्वामी दुख बिनसे मन का।\nसुख-सम्पत्ति घर आवे, सुख-सम्पत्ति घर आवे,\nकष्ट मिटे तन का। ॐ जय जगदीश हरे।',
  },
  {
    id: '2', name: 'Om Jai Shiv Omkara', nameHi: 'ॐ जय शिव ओमकारा', deity: 'Lord Shiva', color: '#4A148C',
    lyrics: 'ॐ जय शिव ओमकारा, स्वामी जय शिव ओमकारा।\nब्रह्मा, विष्णु, सदाशिव, अर्द्धांगी धारा। ॐ जय शिव ओमकारा।\n\nएकानन, चतुरानन, पंचानन राजे,\nस्वामी पंचानन राजे।\nहंसासन, गरुड़ासन, वृषवाहन साजे। ॐ जय शिव ओमकारा।',
  },
  {
    id: '3', name: 'Aarti Kunj Bihari Ki', nameHi: 'आरती कुंजबिहारी की', deity: 'Lord Krishna', color: '#0D47A1',
    lyrics: 'आरती कुंजबिहारी की, श्री गिरिधर कृष्ण मुरारी की।\n\nगले में बैजंती माला, बजावे मुरली मधुर बाला।\nश्रवन में कुण्डल झलकाला, नन्द के आनन्द नन्दलाला।\nगगन सम अंग कान्ति काली, राधिका चमक रही आली।\nलतन में ठाड़े बनमाली। भ्रमर सी अलक कस्तूरी तिलक दिये भाली।',
  },
  {
    id: '4', name: 'Jai Ganesh Deva', nameHi: 'जय गणेश देवा', deity: 'Lord Ganesha', color: '#D94F00',
    lyrics: 'जय गणेश जय गणेश, जय गणेश देवा।\nमाता जाकी पार्वती, पिता महादेवा। जय गणेश देवा।\n\nएक दन्त दयावन्त, चार भुजा धारी।\nमाथे पर तिलक सोहे, मूसे की सवारी। जय गणेश देवा।',
  },
  {
    id: '5', name: 'Aarti Shri Hanuman Ji Ki', nameHi: 'आरती कीजै हनुमान लला की', deity: 'Lord Hanuman', color: '#BF360C',
    lyrics: 'आरती कीजै हनुमान लला की।\nदुष्ट दलन रघुनाथ कला की। आरती कीजै हनुमान लला की।\n\nजाके बल से गिरिवर काँपे, रोग दोष जाके निकट न झाँके।\nअंजनी पुत्र महा बलदाई, संतन के प्रभु सदा सहाई। आरती कीजै हनुमान लला की।',
  },
  {
    id: '6', name: 'Om Jai Lakshmi Mata', nameHi: 'ॐ जय लक्ष्मी माता', deity: 'Goddess Lakshmi', color: '#D32F2F',
    lyrics: 'ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता।\nतुमको निशदिन सेवत, हरि विष्णु विधाता। ॐ जय लक्ष्मी माता।\n\nउमा, रमा, ब्रह्माणी, तुम ही जग माता।\nसूर्य-चन्द्रमा ध्यावत, नारद ऋषि गाता। ॐ जय लक्ष्मी माता।',
  },
  {
    id: '7', name: 'Jai Ambe Gauri', nameHi: 'जय अम्बे गौरी', deity: 'Goddess Durga', color: '#C62828',
    lyrics: 'जय अम्बे गौरी, मैया जय श्यामा गौरी।\nतुमको निशदिन ध्यावत, हरि ब्रह्मा शिवरी। जय अम्बे गौरी।\n\nमांग सिन्दूर विराजत, टीको मृगमद को,\nउज्ज्वल से दोउ नैना, चन्द्रवदन नीको। जय अम्बे गौरी।',
  },
  {
    id: '8', name: 'Shri Saraswati Aarti', nameHi: 'श्री सरस्वती आरती', deity: 'Goddess Saraswati', color: '#FFD700',
    lyrics: 'जय सरस्वती माता, मैया जय सरस्वती माता।\nसदगुण वैभव शालिनी, त्रिभुवन विख्याता। जय सरस्वती माता।\n\nचन्द्र वदनी पद्मासनी, ध्यान जो लगाता,\nषट्‌ दर्शन की जननी, कमला के दाता। जय सरस्वती माता।',
  },
];

export default function AartiScreen() {
  const { colors, isDark } = useTheme();
  const [selectedAarti, setSelectedAarti] = useState<typeof AARTIS[0] | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {!selectedAarti && (
        <LinearGradient colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']} style={styles.headerGrad}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Aarti Collection</Text>
          </View>
        </LinearGradient>
      )}

      {!selectedAarti ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {AARTIS.map(aarti => (
            <TouchableOpacity
              key={aarti.id}
              style={[styles.aartiCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => setSelectedAarti(aarti)}
              activeOpacity={0.7}
            >
              <View style={[styles.aartiIcon, { backgroundColor: aarti.color + '15' }]}>
                <MaterialCommunityIcons name="candle" size={26} color={aarti.color} />
              </View>
              <View style={styles.aartiInfo}>
                <Text style={[styles.aartiName, { color: colors.text }]}>{aarti.name}</Text>
                <Text style={[styles.aartiNameHi, { color: colors.primary }]}>{aarti.nameHi}</Text>
                <Text style={[styles.aartiDeity, { color: colors.textSecondary }]}>{aarti.deity}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[selectedAarti.color, selectedAarti.color + 'CC']} style={styles.aartiHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedAarti(null)}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="candle" size={36} color="#FFD700" />
            <Text style={styles.aartiTitle}>{selectedAarti.name}</Text>
            <Text style={styles.aartiTitleHi}>{selectedAarti.nameHi}</Text>
            <Text style={styles.aartiHeaderDeity}>{selectedAarti.deity}</Text>
          </LinearGradient>
          <View style={[styles.lyricsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.lyricsText, { color: colors.text }]}>{selectedAarti.lyrics}</Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBackBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  list: { padding: 16, gap: 8 },
  aartiCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  aartiIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  aartiInfo: { flex: 1 },
  aartiName: { fontSize: 15, fontWeight: '700' },
  aartiNameHi: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  aartiDeity: { fontSize: 12, marginTop: 2 },
  aartiHeader: { paddingTop: 20, paddingBottom: 30, alignItems: 'center', marginHorizontal: 16, marginTop: 10, borderRadius: 20 },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  aartiTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 10 },
  aartiTitleHi: { fontSize: 18, color: '#FFD700', marginTop: 4 },
  aartiHeaderDeity: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  lyricsCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, borderWidth: 1 },
  lyricsText: { fontSize: 18, lineHeight: 32, fontWeight: '500' },
});
