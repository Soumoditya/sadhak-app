import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { DS } from '../../constants/ds';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  variant?: 'surface' | 'flat' | 'tinted';
  tint?: string; // for tinted variant
}

export default function Card({ children, onPress, style, padded = true, variant = 'surface', tint }: Props) {
  const { colors } = useTheme();

  const base: ViewStyle = {
    borderRadius: DS.radius.xl,
    padding: padded ? DS.layout.cardPadding : 0,
    borderWidth: variant === 'flat' ? 0 : 1,
    borderColor: colors.cardBorder,
    backgroundColor: variant === 'tinted' && tint ? `${tint}12` :
                     variant === 'flat' ? 'transparent' : colors.surface,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[base, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
