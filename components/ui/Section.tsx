import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS } from '../../constants/ds';

interface Props {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  compact?: boolean;
}

export default function Section({ title, action, children, compact }: Props) {
  const { colors } = useTheme();
  const { display } = useLanguage();
  return (
    <View style={{ marginTop: compact ? DS.space.lg : DS.layout.sectionGap }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }, display]}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionBtn} hitSlop={8}>
            <Text style={[styles.actionText, { color: colors.primary }]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DS.space.md },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '800', letterSpacing: -0.2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 13, fontWeight: '700' },
});
