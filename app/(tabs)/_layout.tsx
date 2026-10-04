import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Animated, Pressable, type ColorValue } from 'react-native';
import React, { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
          backgroundColor: isDark ? '#141921' : '#FFFFFF',
          borderRadius: BorderRadius.xxl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(42, 49, 64, 0.6)' : 'rgba(0,0,0,0.06)',
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
            <TabIcon label="Home" color={color} focused={focused}>
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label="Calendar" color={color} focused={focused}>
            <MaterialCommunityIcons
              name={focused ? 'calendar-month' : 'calendar-month-outline'}
              size={22}
              color={color}
            />
          </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label="Library" color={color} focused={focused}>
            <MaterialCommunityIcons
              name={focused ? 'bookshelf' : 'book-outline'}
              size={22}
              color={color}
            />
          </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label="Chat" color={color} focused={focused}>
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={color}
            />
          </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon label="Profile" color={color} focused={focused}>
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
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
