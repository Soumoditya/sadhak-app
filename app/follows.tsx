import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Header } from '../components/ui';
import Avatar from '../components/community/Avatar';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDsInsets, DS } from '../constants/ds';
import { listFollows } from '../services/social';
import type { UserResult } from '../services/posts';

export default function FollowsScreen() {
  const { uid, kind, name } = useLocalSearchParams<{ uid: string; kind: 'followers' | 'following'; name?: string }>();
  const { colors } = useTheme();
  const { tx } = useLanguage();
  const { screenBottom } = useDsInsets();
  const [list, setList] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    listFollows(uid, kind === 'following' ? 'following' : 'followers').then(setList).catch(() => {}).finally(() => setLoading(false));
  }, [uid, kind]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={kind === 'following' ? tx('Following') : tx('Followers')} subtitle={name || undefined} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={list}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom, gap: 8 }}
          ListEmptyComponent={<Text style={[s.empty, { color: colors.textTertiary }]}>{kind === 'following' ? tx('Not following anyone yet.') : tx('No followers yet.')}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: item.uid } })}
            >
              <Avatar uri={item.profilePicUrl} name={item.displayName} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
                {!!item.username && <Text style={{ color: colors.textTertiary, fontSize: 13 }}>@{item.username}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
