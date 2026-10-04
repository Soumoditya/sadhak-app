import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { DS } from '../../constants/ds';
import Icon, { fromMaterial } from './Icon';

// Rows pass Material icon names; show the Phosphor glyph when one maps.

interface Props {
  icon: string;
  label: string;
  detail?: string;
  onPress?: () => void;
  right?: 'chevron' | 'switch' | React.ReactNode;
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  danger?: boolean;
  iconColor?: string;
}

export default function SettingsRow({
  icon, label, detail, onPress, right = 'chevron',
  switchValue, onSwitchChange, danger, iconColor,
}: Props) {
  const { colors } = useTheme();
  const Wrap: any = onPress ? TouchableOpacity : View;
  const wrapProps = onPress ? { onPress, activeOpacity: 0.7 } : {};
  const tint = danger ? '#EF4444' : iconColor || colors.textSecondary;

  return (
    <Wrap {...wrapProps} style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: (iconColor || colors.textTertiary) + '18' }]}>
        {fromMaterial(icon)
          ? <Icon name={fromMaterial(icon)!} size={20} color={tint} />
          : <MaterialCommunityIcons name={icon as any} size={18} color={tint} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: danger ? '#EF4444' : colors.text }]}>{label}</Text>
        {detail && <Text style={[styles.detail, { color: colors.textTertiary }]}>{detail}</Text>}
      </View>
      {right === 'switch' ? (
        <Switch value={!!switchValue} onValueChange={onSwitchChange} trackColor={{ true: colors.primary + '80', false: colors.cardBorder }} thumbColor={switchValue ? colors.primary : '#F3F4F6'} />
      ) : right === 'chevron' ? (
        <Icon name="caret-right" size={17} color={colors.textTertiary} weight="regular" />
      ) : right}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, paddingVertical: 14, paddingHorizontal: DS.layout.cardPadding },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: DS.type.body.size, fontWeight: '600' },
  detail: { fontSize: 12.5, marginTop: 2 },
});
