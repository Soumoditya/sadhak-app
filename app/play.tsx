import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLayoutInsets } from '../constants/layout';

// In-app devotional player — YouTube search results inside a WebView so
// aarti/bhajan videos play without leaving Sadhak. Free, no API key.
export default function PlayScreen() {
  const { query, title } = useLocalSearchParams<{ query: string; title?: string }>();
  const { colors } = useTheme();
  const { headerPaddingTop, bottomInset } = useLayoutInsets();
  const [loading, setLoading] = useState(true);

  const url = `https://m.youtube.com/results?search_query=${encodeURIComponent(String(query || 'aarti'))}`;

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <View style={[st.topBar, { paddingTop: headerPaddingTop, backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={[st.iconBtn, { backgroundColor: colors.background }]} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: colors.text }]} numberOfLines={1}>{title || 'Play'}</Text>
          <Text style={[st.sub, { color: colors.textTertiary }]}>Tap a video to play — stays inside Sadhak</Text>
        </View>
        <MaterialCommunityIcons name="youtube" size={24} color="#FF0000" />
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <View style={[StyleSheet.absoluteFill, st.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 13 }}>Finding devotional videos…</Text>
          </View>
        )}
      </View>
      <View style={{ height: bottomInset }} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15.5, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 1 },
});
