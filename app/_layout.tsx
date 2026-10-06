import { useEffect, useRef, useState, useCallback } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet, Image, Dimensions, Text, Easing, Modal } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { DialogProvider } from '../contexts/DialogContext';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DS } from '../constants/ds';
import { QuickSettingsProvider } from '../components/ui/QuickSettings';
import { ensureNotificationsScheduled, applyNotificationPrefs, prefsFromProfile } from '../services/notifications';
import { requestFirstRunPermissions } from '../services/firstRunPermissions';
import { downloadPendingUpdate, applyUpdateNow } from '../services/appUpdates';
import { openFile } from '../services/downloads';
import { useDialog } from '../contexts/DialogContext';

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
          <Text style={[splashStyles.appName, { color: colors.primary }]}>Sadhak</Text>
          <Text style={[splashStyles.tagline, { color: colors.textTertiary }]}>Your daily spiritual companion</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const splashStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hindi: { fontSize: 46, lineHeight: 66, fontFamily: DS.font.deva },
  appName: { fontSize: 22, fontFamily: DS.font.display, marginTop: -4, letterSpacing: 0.4 },
  tagline: { fontSize: 13, marginTop: 14, letterSpacing: 0.3 },
});


// ─── System navigation backdrop ───────────────────────────────────────────
// Android draws the app edge-to-edge, so on pushed screens lists scrolled
// under the system buttons (gesture pill / ◁ ○ □). Paint the app background
// behind them. Tabs have their own docked bar; the screens listed here draw
// their own bottom bar or full-bleed background.
const OWN_BOTTOM = new Set(['(tabs)', 'ask', 'chatroom', 'temples', 'japa', 'play', 'reader', 'wallpapers', 'create-post']);
function SystemNavBackdrop() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  if (!insets.bottom || OWN_BOTTOM.has(segments[0] as string)) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom, backgroundColor: colors.background }} />;
}

// ─── Root Layout Inner ─────────────────────────────────────────────────────
function RootLayoutInner() {
  const { isDark, colors } = useTheme();
  const { profile } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const dialog = useDialog();

  // OTA: fetch a new update in the background and offer to restart into it
  // right away (otherwise it would only apply on the next cold start).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const ready = await downloadPendingUpdate();
      if (!ready || cancelled) return;
      dialog.alert('Update ready', 'A new version of Sadhak has been downloaded. Restart now to use it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: applyUpdateNow },
      ], { tone: 'success' });
    }, 4000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

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
      const data = resp?.notification?.request?.content?.data as any;
      // "Saved to Downloads" notifications open the file itself.
      if (data?.openUri) { openFile(String(data.openUri), String(data.mime || '*/*')); return; }
      const route = data?.route as string | undefined;
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
        <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="user/[uid]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="posts" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="follows" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
      <SystemNavBackdrop />
      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </>
  );
}

// ─── Root Export ────────────────────────────────────────────────────────────
export default function RootLayout() {
  // Brand faces: Fraunces for Latin titles, Tiro Devanagari for shlokas and
  // Hindi display text. The native splash stays up while they load; a slow or
  // failed load never blocks the app (falls back to system fonts).
  const [fontsLoaded, fontError] = useFonts({
    [DS.font.display]: require('../assets/fonts/Fraunces_600SemiBold.ttf'),
    [DS.font.deva]: require('../assets/fonts/TiroDevanagariHindi_400Regular.ttf'),
  });
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(t);
  }, []);
  if (!fontsLoaded && !fontError && !fontTimeout) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <ThemeProvider>
        <LanguageProvider>
          <DialogProvider>
            <QuickSettingsProvider>
              <AuthProvider>
                <RootLayoutInner />
              </AuthProvider>
            </QuickSettingsProvider>
          </DialogProvider>
        </LanguageProvider>
      </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
