import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { useLayoutInsets, TAB_BAR_HEIGHT } from '../../constants/layout';

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
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-month' : 'calendar-month-outline'}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'bookshelf' : 'book-outline'}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={focused ? 26 : 24}
              color={color}
            />
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activeIndicator: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
});
