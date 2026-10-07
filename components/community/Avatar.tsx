import React from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const { colors } = useTheme();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const initials = (name || 'S').trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}
