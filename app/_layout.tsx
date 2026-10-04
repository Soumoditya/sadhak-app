import { useEffect, useRef, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet, Image, Dimensions, Text, Easing, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { DialogProvider } from '../contexts/DialogContext';
import * as SplashScreen from 'expo-splash-screen';
import { ensureNotificationsScheduled, applyNotificationPrefs, prefsFromProfile } from '../services/notifications';
import { requestFirstRunPermissions } from '../services/firstRunPermissions';

SplashScreen.preventAutoHideAsync();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Animated Splash Overlay ───────────────────────────────────────────────
// Theme-aware (parchment in light, warm charcoal in dark) so it hands off
// smoothly to the app; short, calm, no pulsing loop.
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors, isDark } = useTheme();
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(10)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.delay(380),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  const EMBLEM = Math.min(SCREEN_W * 0.42, 170);
  const GLOW = EMBLEM * 2;

  return (
    <Modal visible transparent={false} animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <Animated.View style={[splashStyles.overlay, { backgroundColor: colors.background, opacity: overlayOpacity }]} pointerEvents="none">
        <View style={{ width: EMBLEM, height: EMBLEM, alignItems: 'center', justifyContent: 'center', marginBottom: 34 }}>
          {/* Soft saffron aura (radial gradient, no hard edges) */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', width: GLOW, height: GLOW, top: (EMBLEM - GLOW) / 2, left: (EMBLEM - GLOW) / 2, opacity: glowOpacity }}>
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
                  <Stop offset="0.45" stopColor={colors.primary} stopOpacity={isDark ? 0.32 : 0.22} />
                  <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#aura)" />
            </Svg>
          </Animated.View>
          <Animated.Image
            source={require('../assets/images/emblem.png')}
            style={{ width: EMBLEM, height: EMBLEM, opacity: logoOpacity, transform: [{ scale: logoScale }] }}
            resizeMode="contain"
          />
        </View>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textSlide }], alignItems: 'center' }}>
          <Text style={[splashStyles.hindi, { color: colors.text }]}>साधक</Text>
          <Text style={[splashStyles.appName, { color: colors.primary }]}>SADHAK</Text>
          <Text style={[splashStyles.tagline, { color: colors.textTertiary }]}>Your daily spiritual companion</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const splashStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hindi: { fontSize: 40, fontWeight: '700', lineHeight: 56 },
  appName: { fontSize: 13, fontWeight: '800', letterSpacing: 8, paddingLeft: 8, marginTop: 2 },
  tagline: { fontSize: 13, marginTop: 14, letterSpacing: 0.3 },
});

// ─── Root Layout Inner ─────────────────────────────────────────────────────
function RootLayoutInner() {
  const { isDark, colors } = useTheme();
  const { profile } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Keep scheduled alerts in line with the Settings switches + location.
  const prefsKey = profile ? JSON.stringify(prefsFromProfile(profile)) : '';
  useEffect(() => {
    if (!profile) return;
    applyNotificationPrefs(prefsFromProfile(profile)).catch(() => {});
  }, [prefsKey]);

  useEffect(() => {
    // Hand off quickly from the native splash to our animated Modal splash, which
    // covers the blank gap and is guaranteed full-screen/centered (Modal).
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 120);
    ensureNotificationsScheduled();
    // First launch: ask for all needed permissions up front (runs once).
    requestFirstRunPermissions();

    // Deep-link: tapping a reminder/notification opens the relevant screen.
    let lastHandled = '';
    const openFrom = (resp: Notifications.NotificationResponse | null | undefined) => {
      const key = `${resp?.notification?.request?.identifier}:${resp?.notification?.date}`;
      if (!resp || key === lastHandled) return; // listener + cold-start lookup can both report the same tap
      lastHandled = key;
      const route = resp?.notification?.request?.content?.data?.route as string | undefined;
      if (route) {
        try { router.push(route as any); } catch {}
      }
    };
    const sub = Notifications.addNotificationResponseReceivedListener(openFrom);
    // Cold start: the listener above misses the tap that launched the app.
    let coldStart: ReturnType<typeof setTimeout> | undefined;
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        if (!resp) return;
        coldStart = setTimeout(() => openFrom(resp), 400); // let the navigator mount
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      })
      .catch(() => {});
    return () => {
      clearTimeout(t);
      if (coldStart) clearTimeout(coldStart);
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
        <Stack.Screen name="play" options={{ headerShown: false }} />
        <Stack.Screen name="compass" options={{ headerShown: false }} />
        <Stack.Screen name="jyotish" options={{ headerShown: false }} />
        <Stack.Screen name="ayurveda" options={{ headerShown: false }} />
        <Stack.Screen name="wiki" options={{ headerShown: false }} />
        <Stack.Screen name="puja-guide" options={{ headerShown: false }} />
        <Stack.Screen name="bhog" options={{ headerShown: false }} />
        <Stack.Screen name="ask" options={{ headerShown: false }} />
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
