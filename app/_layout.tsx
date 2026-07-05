import { useEffect, useRef, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet, Image, Dimensions, Text, Easing, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { DialogProvider } from '../contexts/DialogContext';
import * as SplashScreen from 'expo-splash-screen';
import { ensureNotificationsScheduled } from '../services/notifications';

SplashScreen.preventAutoHideAsync();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Animated Splash Overlay ───────────────────────────────────────────────
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(16)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle continuous glow pulse behind the emblem.
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    Animated.sequence([
      // Phase 1: emblem + halo ring bloom in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      // Phase 2: wordmark rises
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textSlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]),
      // Phase 3: hold
      Animated.delay(500),
      // Phase 4: fade the whole overlay out
      Animated.timing(overlayOpacity, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  const glowStyle = {
    opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.55] }),
    transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.12] }) }],
  };

  const EMBLEM = Math.min(SCREEN_W * 0.46, 200);
  const GLOW = EMBLEM * 1.9;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
    <Animated.View style={[splashStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      {/* Emblem box — halos are centered inside it deterministically (no % math) */}
      <View style={{ width: EMBLEM, height: EMBLEM, alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
        {/* Pulsing saffron halo */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: (EMBLEM - GLOW) / 2,
              left: (EMBLEM - GLOW) / 2,
              width: GLOW,
              height: GLOW,
              borderRadius: GLOW / 2,
              backgroundColor: 'rgba(217, 79, 0, 0.16)',
            },
            glowStyle,
          ]}
        />
        {/* Thin ring accent */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -17,
            left: -17,
            width: EMBLEM + 34,
            height: EMBLEM + 34,
            borderRadius: (EMBLEM + 34) / 2,
            borderWidth: 1,
            borderColor: 'rgba(240, 120, 48, 0.35)',
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        {/* Circular emblem */}
        <Animated.Image
          source={require('../assets/images/icon.png')}
          style={{
            width: EMBLEM,
            height: EMBLEM,
            borderRadius: EMBLEM / 2,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
          resizeMode="cover"
        />
      </View>

      {/* Wordmark */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textSlide }], alignItems: 'center' }}>
        <Text style={splashStyles.appName}>S A D H A K</Text>
        <View style={splashStyles.divider} />
        <Text style={splashStyles.tagline}>YOUR SPIRITUAL COMPANION</Text>
      </Animated.View>
    </Animated.View>
    </Modal>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0B0E13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '50%',
    marginTop: -SCREEN_W * 0.55,
    width: SCREEN_W * 0.9,
    height: SCREEN_W * 0.9,
    borderRadius: SCREEN_W * 0.45,
    backgroundColor: 'rgba(217, 79, 0, 0.18)',
  },
  ring: {
    position: 'absolute',
    top: '50%',
    marginTop: -(SCREEN_W * 0.5 + 34) / 2 - 28,
    borderWidth: 1,
    borderColor: 'rgba(240, 120, 48, 0.35)',
  },
  appName: {
    fontSize: 30,
    fontWeight: '400',
    color: '#F5F3F0',
    letterSpacing: 10,
    textAlign: 'center',
    paddingLeft: 10, // optical balance for the wide letter-spacing
  },
  divider: {
    width: 42,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D94F00',
    marginVertical: 12,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(241, 240, 238, 0.55)',
    letterSpacing: 3,
    textAlign: 'center',
  },
});

// ─── Root Layout Inner ─────────────────────────────────────────────────────
function RootLayoutInner() {
  const { isDark, colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hand off quickly from the native splash to our animated Modal splash, which
    // covers the blank gap and is guaranteed full-screen/centered (Modal).
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 120);
    ensureNotificationsScheduled();

    // Deep-link: tapping a reminder/notification opens the relevant screen.
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const route = resp?.notification?.request?.content?.data?.route as string | undefined;
      if (route) {
        try { router.push(route as any); } catch {}
      }
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.background },
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="panchang" options={{ headerShown: false }} />
        <Stack.Screen name="notes" options={{ headerShown: false }} />
        <Stack.Screen name="temples" options={{ headerShown: false }} />
        <Stack.Screen name="japa" options={{ headerShown: false }} />
        <Stack.Screen name="aarti" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="chatroom" options={{ headerShown: false }} />
        <Stack.Screen name="feed" options={{ headerShown: false }} />
        <Stack.Screen name="reader" options={{ headerShown: false }} />
        <Stack.Screen name="create-post" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="faq" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="changelog" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </>
  );
}

// ─── Root Export ────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <LanguageProvider>
            <AuthProvider>
              <RootLayoutInner />
            </AuthProvider>
          </LanguageProvider>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
