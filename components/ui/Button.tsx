import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { DS } from '../../constants/ds';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'lg' | 'md';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title, onPress, variant = 'primary', size = 'lg',
  icon, disabled, loading, fullWidth = true, style,
}: Props) {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const height = size === 'lg' ? DS.layout.buttonHeightLg : DS.layout.buttonHeightMd;

  const content = (fg: string) => (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon as any} size={size === 'lg' ? 20 : 18} color={fg} />}
          <Text style={[styles.text, { color: fg, fontSize: DS.type.button.size }]}>{tx(title)}</Text>
        </>
      )}
    </View>
  );

  const wrap: ViewStyle = {
    height,
    borderRadius: DS.radius.lg,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity disabled={disabled || loading} onPress={onPress} activeOpacity={0.85} style={[wrap, style]}>
        <LinearGradient colors={['#C2410C', '#E8743B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill}>
          {content('#FFF')}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  if (variant === 'destructive') {
    return (
      <TouchableOpacity disabled={disabled || loading} onPress={onPress} activeOpacity={0.85} style={[wrap, { backgroundColor: '#DC262622', borderWidth: 1, borderColor: '#DC262655' }, style]}>
        <View style={styles.fill}>{content('#EF4444')}</View>
      </TouchableOpacity>
    );
  }
  if (variant === 'ghost') {
    return (
      <TouchableOpacity disabled={disabled || loading} onPress={onPress} activeOpacity={0.85} style={[wrap, style]}>
        <View style={styles.fill}>{content(colors.textSecondary)}</View>
      </TouchableOpacity>
    );
  }
  // secondary
  return (
    <TouchableOpacity disabled={disabled || loading} onPress={onPress} activeOpacity={0.85} style={[wrap, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder }, style]}>
      <View style={styles.fill}>{content(colors.text)}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});
