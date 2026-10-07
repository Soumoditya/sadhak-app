import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DS } from '../../constants/ds';

// A generated cover for books that have none: a cloth-bound look in the
// category colour, a spine, a small emblem and the title set in the serif.

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

type Props = { title: string; color: string; icon: string; width: number; showTitle?: boolean };

function BookCover({ title, color, icon, width, showTitle = true }: Props) {
  const height = Math.round(width * 1.42);
  const small = width < 70;
  return (
    <LinearGradient colors={[shade(color, 0.08), shade(color, -0.18)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cover, { width, height, borderRadius: small ? 6 : 10 }]}>
      <View style={[s.spine, { width: small ? 4 : 7 }]} />
      <View style={[s.frame, { margin: small ? 4 : 8, borderRadius: small ? 3 : 6 }]}>
        <MaterialCommunityIcons name={icon as any} size={small ? 16 : Math.round(width * 0.2)} color="rgba(255,240,215,0.92)" />
        {showTitle && !small && (
          <Text style={[s.title, { fontSize: Math.max(11, Math.round(width * 0.11)), lineHeight: Math.max(14, Math.round(width * 0.14)) }]} numberOfLines={4}>
            {title}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  cover: { overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  frame: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,230,190,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 6 },
  title: { color: '#FFF4E0', textAlign: 'center', fontFamily: DS.font.display },
});

export default memo(BookCover);
