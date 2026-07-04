import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert, ActivityIndicator, Image, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from "../../contexts/DialogContext";
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen() {
  const { signInWithEmail, signInAsGuest } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      dialog.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.code === 'auth/user-not-found' ? 'No account found with this email'
        : error.code === 'auth/wrong-password' ? 'Incorrect password'
        : error.code === 'auth/invalid-email' ? 'Invalid email format'
        : 'Login failed. Please try again.';
      dialog.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setGuestLoading(true);
      await signInAsGuest();
      router.replace('/(tabs)');
    } catch (error) {
      dialog.alert('Error', 'Could not sign in as guest. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0E13' : '#FDFAF5' }]}>
      {/* Background artwork (blurred) */}
      <View style={styles.bgArtwork}>
        <Image
          source={require('../../assets/images/splash-artwork.png')}
          style={styles.bgImage}
          resizeMode="cover"
          blurRadius={Platform.OS === 'ios' ? 30 : 8}
        />
        <View style={[styles.bgOverlay, { backgroundColor: isDark ? 'rgba(11,14,19,0.85)' : 'rgba(253,250,245,0.88)' }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
          <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(240,120,48,0.08)' : 'rgba(217,79,0,0.06)' }]}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>S A D H A K</Text>
          <Text style={[styles.tagline, { color: colors.textTertiary }]}>Your Spiritual Companion</Text>
        </Animated.View>

        {/* Login Card */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.card, {
              backgroundColor: isDark ? 'rgba(30, 36, 46, 0.90)' : 'rgba(255,255,255,0.95)',
              borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.04)',
            }]}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your journey
              </Text>

              {/* Email */}
              <View style={[styles.inputContainer, {
                borderColor: emailFocused ? colors.primary : colors.border,
                backgroundColor: isDark ? colors.surfaceSecondary : colors.surfaceSecondary,
              }]}>
                <Ionicons name="mail-outline" size={18} color={emailFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputContainer, {
                borderColor: passwordFocused ? colors.primary : colors.border,
                backgroundColor: isDark ? colors.surfaceSecondary : colors.surfaceSecondary,
              }]}>
                <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity onPress={handleEmailLogin} disabled={loading} activeOpacity={0.85} style={styles.loginButtonWrapper}>
                <LinearGradient
                  colors={[Colors.light.primary, '#F07830']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or continue with</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                  <Text style={[styles.socialText, { color: colors.text }]}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]} activeOpacity={0.7}>
                  <Ionicons name="call-outline" size={20} color="#16A34A" />
                  <Text style={[styles.socialText, { color: colors.text }]}>Phone</Text>
                </TouchableOpacity>
              </View>

              {/* Guest */}
              <TouchableOpacity
                style={[styles.guestButton, { borderColor: colors.gold + '50' }]}
                onPress={handleGuestLogin}
                disabled={guestLoading}
                activeOpacity={0.7}
              >
                {guestLoading ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-outline" size={18} color={colors.gold} />
                    <Text style={[styles.guestText, { color: colors.gold }]}>Continue as Guest</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign Up */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')} hitSlop={{ top: 8, bottom: 8 }}>
                <Text style={[styles.signupLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgArtwork: { ...StyleSheet.absoluteFillObject },
  bgImage: { width: SCREEN_W, height: SCREEN_H * 0.55, position: 'absolute', top: 0 },
  bgOverlay: { ...StyleSheet.absoluteFillObject },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  logoSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 64,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 6,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: BorderRadius.xl,
    padding: 24,
    borderWidth: 1,
    ...Shadows.lg,
  },
  welcomeText: {
    fontSize: FontSize.title2,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.subheadline,
    marginBottom: 24,
    lineHeight: 20,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: FontSize.body, height: '100%' },

  loginButtonWrapper: { marginTop: 6 },
  loginButton: {
    borderRadius: BorderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: 12, fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },

  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 46,
    gap: 8,
  },
  socialText: { fontSize: FontSize.subheadline, fontWeight: '500' },

  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 46,
    marginTop: 10,
    gap: 8,
    borderStyle: 'dashed',
  },
  guestText: { fontSize: FontSize.subheadline, fontWeight: '600' },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  signupText: { fontSize: FontSize.subheadline },
  signupLink: { fontSize: FontSize.subheadline, fontWeight: '700' },
});
