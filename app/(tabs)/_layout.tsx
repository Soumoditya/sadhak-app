import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Animated, Pressable, type ColorValue } from 'react-native';
import React, { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { useLayoutInsets, TAB_BAR_HEIGHT } from '../../constants/layout';

// Icon + always-visible label: icon-only tabs made the sections hard to find.
function TabIcon({ label, color, focused, children }: { label: string; color: ColorValue; focused: boolean; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {/* Fixed icon box so labels line up across icon families. */}
      <View style={{ height: 24, justifyContent: 'center' }}>{children}</View>
      <Text style={[styles.tabLabel, { color, fontWeight: focused ? '800' : '600' }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Animated Tab Button ───────────────────────────────────────────────────
function TabButton({ children, onPress, accessibilityState, colors }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const focused = accessibilityState?.selected;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View style={[
        styles.tabButtonInner,
        { transform: [{ scale }] },
      ]}>
        {focused && (
          <View style={[styles.activeIndicator, { backgroundColor: `${colors.primary}15` }]} />
        )}
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { tabBarBottom } = useLayoutInsets();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: tabBarBottom,
          left: Spacing.lg,
          right: Spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.xxl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          height: TAB_BAR_HEIGHT,
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadows.xl,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarShowLabel: false,
        tabBarButton: (props) => <TabButton {...props} colors={colors} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.home')} color={color} focused={focused}>
              <Icon name="house" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.calendar')} color={color} focused={focused}>
              <Icon name="calendar-dots" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.tools')} color={color} focused={focused}>
              <Icon name="squares-four" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.library')} color={color} focused={focused}>
              <Icon name="books" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.chat')} color={color} focused={focused}>
              <Icon name="chats-circle" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          // Reached from the avatar on Home and Tools; keeps the bar to five.
          href: null,
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label={t('nav.profile')} color={color} focused={focused}>
              <Icon name="user-circle" size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 52,
    borderRadius: 16,
  },
  activeIndicator: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
