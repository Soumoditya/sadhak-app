import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS } from '../../constants/ds';
import type { Post } from '../../services/posts';
import Avatar from './Avatar';

/** Avatar + counts + name/handle/bio block shared by own and public profiles. */
export function ProfileHead({
  uid, name, username, pfp, bio, city, since, posts, followers, following, onAvatar, avatarBusy, editable,
}: {
  uid: string; name: string; username?: string; pfp?: string | null; bio?: string; city?: string; since?: number;
  posts: number; followers: number; following: number; onAvatar?: () => void; avatarBusy?: boolean; editable?: boolean;
}) {
  const { colors } = useTheme();
  const { tx, display } = useLanguage();
  const openList = (kind: 'followers' | 'following') => router.push({ pathname: '/follows', params: { uid, kind, name } });
  const Stat = ({ n, label, onPress }: { n: number | string; label: string; onPress?: () => void }) => (
    <TouchableOpacity style={s.stat} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Text style={[s.statNum, { color: colors.text }]}>{n}</Text>
      <Text style={[s.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View>
      <View style={s.row}>
        <TouchableOpacity onPress={onAvatar} disabled={!onAvatar} activeOpacity={0.8}>
          <Avatar uri={pfp} name={name} size={86} />
          {editable && (
            <View style={[s.cam, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              {avatarBusy ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="camera" size={13} color="#FFF" />}
            </View>
          )}
        </TouchableOpacity>
        <View style={s.stats}>
          <Stat n={posts} label={tx('Posts')} />
          <Stat n={followers} label={tx('Followers')} onPress={() => openList('followers')} />
          <Stat n={following} label={tx('Following')} onPress={() => openList('following')} />
        </View>
      </View>
      <Text style={[s.name, { color: colors.text }, display]} numberOfLines={1}>{name || 'Sadhak'}</Text>
      {!!username && <Text style={[s.handle, { color: colors.textTertiary }]}>@{username}</Text>}
      {!!bio && <Text style={[s.bio, { color: colors.textSecondary }]}>{bio}</Text>}
      {(!!city || !!since) && (
        <View style={s.metaRow}>
          {!!city && (
            <View style={s.meta}><Ionicons name="location-outline" size={14} color={colors.textTertiary} /><Text style={[s.metaText, { color: colors.textTertiary }]}>{city}</Text></View>
          )}
          {!!since && (
            <View style={s.meta}><Ionicons name="calendar-outline" size={14} color={colors.textTertiary} /><Text style={[s.metaText, { color: colors.textTertiary }]}>{tx('Joined')} {since}</Text></View>
          )}
        </View>
      )}
    </View>
  );
}

const W = Dimensions.get('window').width;
const GAP = 3;
const CELL = (W - 20 * 2 - GAP * 2) / 3;

/** Three-column grid; tapping a tile opens the vertical post feed at it. */
export function PostGrid({ posts, uid, name }: { posts: Post[]; uid: string; name?: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.grid}>
      {posts.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={s.cell}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/posts', params: { uid, start: p.id, name: name || '' } })}
        >
          {p.imageUrl ? (
            <Image source={{ uri: p.imageUrl }} style={s.img} />
          ) : (
            <View style={[s.textCell, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 11.5, lineHeight: 15 }} numberOfLines={5}>{p.text}</Text>
            </View>
          )}
          {(p.likeCount > 0 || p.commentCount > 0) && (
            <View style={s.badge}>
              <Ionicons name="heart" size={10} color="#FFF" />
              <Text style={s.badgeText}>{p.likeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cam: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 10 },
  stat: { alignItems: 'center', minWidth: 64 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12.5, marginTop: 2 },
  name: { fontSize: 24, lineHeight: 32, marginTop: DS.space.md },
  handle: { fontSize: 13.5, marginTop: 1 },
  bio: { fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  textCell: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, justifyContent: 'center' },
  badge: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
});
