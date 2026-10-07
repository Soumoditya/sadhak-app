import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, type TextInputProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Icon, { type IconName } from './Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS } from '../../constants/ds';

// Shared pieces for the login and sign-up screens so both look identical.

export function AuthBrand({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  const { display, tx } = useLanguage();
  return (
    <View style={s.brandWrap}>
      <Image source={require('../../assets/images/emblem.png')} style={s.emblem} />
      <Text style={[s.wordmark, { color: colors.primary }]}>{tx('Sadhak')}</Text>
      <Text style={[s.title, { color: colors.text }, display]}>{title}</Text>
      <Text style={[s.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

export function AuthField({ label, icon, secure, ...input }: TextInputProps & { label: string; icon: IconName; secure?: boolean }) {
  const { colors } = useTheme();
  const { noTrack } = useLanguage();
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[s.label, { color: colors.textSecondary }, noTrack]}>{label}</Text>
      <View style={[s.field, { borderColor: focus ? colors.primary : colors.cardBorder, backgroundColor: colors.surface }]}>
        <Icon name={icon} size={20} color={focus ? colors.primary : colors.textTertiary} />
        <TextInput
          {...input}
          secureTextEntry={secure && !show}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          style={[s.input, { color: colors.text }]}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
            <Icon name="eye" size={20} color={show ? colors.primary : colors.textTertiary} weight={show ? 'fill' : 'regular'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** Google's standard "Continue with Google" button (white, G logo). */
export function GoogleButton({ onPress, loading, disabled }: { onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const { colors, isDark } = useTheme();
  const { tx } = useLanguage();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[s.google, { backgroundColor: isDark ? '#131314' : '#FFFFFF', borderColor: isDark ? '#8E918F' : '#747775', opacity: disabled ? 0.6 : 1 }]}
    >
      {loading ? <ActivityIndicator color={colors.primary} /> : (
        <>
          <Svg width={20} height={20} viewBox="0 0 48 48">
            <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </Svg>
          <Text style={[s.googleText, { color: isDark ? '#E3E3E3' : '#1F1F1F' }]}>{tx('Continue with Google')}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function OrDivider() {
  const { colors } = useTheme();
  const { tx } = useLanguage();
  return (
    <View style={s.divider}>
      <View style={[s.line, { backgroundColor: colors.divider }]} />
      <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '600' }}>{tx('or')}</Text>
      <View style={[s.line, { backgroundColor: colors.divider }]} />
    </View>
  );
}

const s = StyleSheet.create({
  brandWrap: { alignItems: 'center', marginBottom: 28 },
  emblem: { width: 88, height: 88, borderRadius: 44 },
  wordmark: { fontSize: 13, fontWeight: '800', letterSpacing: 4, marginTop: 10, textTransform: 'uppercase' },
  title: { fontSize: 30, lineHeight: 40, marginTop: 14, textAlign: 'center' },
  sub: { fontSize: 15.5, lineHeight: 22, marginTop: 4, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, borderRadius: DS.radius.lg, borderWidth: 1.5, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16.5, paddingVertical: 0 },
  google: { height: 54, borderRadius: DS.radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  googleText: { fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1 },
});
