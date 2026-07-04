import { useEffect, useRef, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet, Image, Dimensions, Text } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import * as SplashScreen from 'expo-splash-screen';
import { ensureNotificationsScheduled } from '../services/notifications';

SplashScreen.preventAutoHideAsync();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Animated Splash Overlay ───────────────────────────────────────────────
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(20)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Logo fade in + scale
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Text slides in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textSlide, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Hold
      Animated.delay(400),
      // Phase 4: Fade out the whole overlay
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[splashStyles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      {/* Subtle radial glow behind logo */}
      <Animated.View style={[splashStyles.glow, { opacity: glowOpacity }]} />

      {/* App Icon */}
      <Animated.Image
        source={require('../assets/images/splash-artwork.png')}
        style={[
          splashStyles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />

      {/* App Name */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textSlide }],
        }}
      >
        <Text style={splashStyles.appName}>S A D H A K</Text>
        <Text style={splashStyles.tagline}>Your Spiritual Companion</Text>
      </Animated.View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0E13',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SCREEN_W * 0.8,
    height: SCREEN_W * 0.8,
    borderRadius: SCREEN_W * 0.4,
    backgroundColor: 'rgba(217, 79, 0, 0.12)',
  },
  logo: {
    width: SCREEN_W * 0.55,
    height: SCREEN_W * 0.75,
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: '300',
    color: '#F1F0EE',
    letterSpacing: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(241, 240, 238, 0.5)',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
  },
});

// ─── Root Layout Inner ─────────────────────────────────────────────────────
function RootLayoutInner() {
  const { isDark, colors } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
    ensureNotificationsScheduled();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
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
        <Stack.Screen name="faq" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="changelog" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
    </>
  );
}

// ─── Root Export ────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
