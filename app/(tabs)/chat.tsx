import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db, rtdb, collection, getDocs, addDoc, serverTimestamp, ref, onValue, off } from '../../config/firebase';
import { Screen, Card, Button, Diya, Icon, fromMaterial } from '../../components/ui';
import { DS, useDsInsets } from '../../constants/ds';

type ChatTab = 'rooms' | 'dms' | 'groups' | 'channels';

interface Room {
  id: string; name: string; description: string;
  type: 'public' | 'group' | 'broadcast';
  icon: string; color: string;
  lastMessage?: string; lastMessageTime?: number; memberCount?: number; createdBy?: string;
}

const DEFAULT_ROOMS: Room[] = [
  { id: 'general', name: 'General', description: 'Dharma & spirituality', type: 'public', icon: 'forum-outline', color: '#C2410C' },
  { id: 'puja', name: 'Puja & Rituals', description: 'Vidhi and rituals', type: 'public', icon: 'candle', color: '#D32F2F' },
  { id: 'gita', name: 'Gita Discussion', description: 'Bhagavad Gita shlokas', type: 'public', icon: 'book-open-variant', color: '#1565C0' },
  { id: 'festivals', name: 'Festivals', description: 'Celebrations & preparation', type: 'public', icon: 'party-popper', color: '#FF8C00' },
  { id: 'astrology', name: 'Jyotish', description: 'Vedic astrology', type: 'public', icon: 'star-four-points-outline', color: '#9C27B0' },
  { id: 'help', name: 'Ask a Question', description: 'Get help from the community', type: 'public', icon: 'help-circle-outline', color: '#2D6A4F' },
];

function relTime(ts?: number): string {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60_000) return 'now';
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const { insets, tabScrollBottom } = useDsInsets();

  const [tab, setTab] = useState<ChatTab>('rooms');
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [groups, setGroups] = useState<Room[]>([]);
  const [channels, setChannels] = useState<Room[]>([]);
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cType, setCType] = useState<'group' | 'broadcast'>('group');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const r = ref(rtdb, 'rooms');
    onValue(r, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      setRooms(DEFAULT_ROOMS.map((room) => ({
        ...room,
        lastMessage: data[room.id]?.lastMessage || '',
        lastMessageTime: data[room.id]?.lastMessageTime || 0,
        memberCount: data[room.id]?.memberCount || 0,
      })));
    });
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'chat_groups'));
        const g: Room[] = [], b: Room[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          const room: Room = {
            id: doc.id, name: d.name, description: d.description || '',
            type: d.type, icon: d.type === 'broadcast' ? 'bullhorn-outline' : 'account-group-outline',
            color: d.type === 'broadcast' ? '#FF6B00' : '#2D6A4F',
            memberCount: d.memberCount || 0, createdBy: d.createdBy,
          };
          if (d.type === 'broadcast') b.push(room); else g.push(room);
        });
        setGroups(g); setChannels(b);
      } catch {}
    })();
    return () => off(r);
  }, []);

  const create = async () => {
    if (!cName.trim()) { dialog.alert('Missing name', 'Give this a name so people know what it is.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'chat_groups'), {
        name: cName.trim(), description: cDesc.trim(), type: cType,
        createdBy: user?.uid, createdAt: serverTimestamp(), members: [user?.uid], memberCount: 1,
      });
      setCreateOpen(false); setCName(''); setCDesc('');
      dialog.alert(cType === 'broadcast' ? 'Channel created' : 'Group created', 'Ready for members to join.', undefined, { tone: 'success' });
    } catch (e: any) {
      dialog.alert('Could not create', String(e?.message || e).slice(0, 200));
    } finally { setSaving(false); }
  };

  const openRoom = (r: Room) => router.push({ pathname: '/chatroom', params: { roomId: r.id, roomName: r.name, roomType: r.type } });

  const list = useMemo(() => {
    const items = tab === 'rooms' ? rooms : tab === 'groups' ? groups : tab === 'channels' ? channels : [];
    const query = q.trim().toLowerCase();
    return query ? items.filter(r => r.name.toLowerCase().includes(query) || (r.description || '').toLowerCase().includes(query)) : items;
  }, [tab, rooms, groups, channels, q]);

  const canCreate = tab === 'groups' || tab === 'channels';

  return (
    <Screen tabbed edges={{ top: false, bottom: false }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12 }}>
        <View style={s.headRow}>
          <Text style={[s.title, { color: colors.text }]}>{t('chat.title')}</Text>
          {canCreate && (
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              style={[s.newBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>NEW</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[s.sub, { color: colors.textTertiary }]}>{t('chat.subtitle')}</Text>
      </View>

      {/* Explore Feed banner */}
      <Card
        onPress={() => router.push('/feed')}
        style={{ marginTop: DS.space.lg, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }}
      >
        <View style={s.exploreRow}>
          <View style={[s.exploreIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="compass" size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.exploreTitle, { color: colors.text }]}>{t('chat.explore')}</Text>
            <Text style={[s.exploreSub, { color: colors.textSecondary }]}>{t('chat.exploreSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </Card>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Ionicons name="search" size={17} color={colors.textTertiary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search rooms, groups…"
          placeholderTextColor={colors.textTertiary}
          value={q} onChangeText={setQ}
        />
        {!!q && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={17} color={colors.textTertiary} /></TouchableOpacity>}
      </View>

      {/* Compact tabs */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {(['rooms', 'dms', 'groups', 'channels'] as ChatTab[]).map((k) => {
          const active = tab === k;
          const label = k === 'rooms' ? t('chat.rooms') : k === 'dms' ? t('chat.dms') : k === 'groups' ? t('chat.groups') : t('chat.channels');
          return (
            <TouchableOpacity
              key={k}
              style={[s.tab, active && { backgroundColor: colors.primary }]}
              onPress={() => setTab(k)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, { color: active ? '#FFF' : colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rooms list */}
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        style={{ marginTop: DS.space.md }}
        contentContainerStyle={{ paddingBottom: tabScrollBottom, gap: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openRoom(item)}
            style={[s.roomCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            activeOpacity={0.75}
          >
            <View style={[s.roomIcon, { backgroundColor: item.color + '18' }]}>
              {item.icon === 'candle' ? (
                <Diya size={22} color={item.color} />
              ) : fromMaterial(item.icon) ? (
                <Icon name={fromMaterial(item.icon)!} size={24} color={item.color} />
              ) : (
                <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.roomTop}>
                <Text style={[s.roomName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {!!item.lastMessageTime && (
                  <Text style={[s.roomTime, { color: colors.textTertiary }]}>{relTime(item.lastMessageTime)}</Text>
                )}
              </View>
              <Text style={[s.roomLast, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.lastMessage || item.description}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          tab === 'dms' ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="message-outline" size={36} color={colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No direct messages yet</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                Find fellow Sadhaks in the feed and start a conversation.
              </Text>
            </View>
          ) : (
            <View style={s.empty}>
              <MaterialCommunityIcons name={canCreate ? 'plus-circle-outline' : 'magnify'} size={36} color={colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{q ? 'No matches' : canCreate ? `No ${tab} yet` : 'Nothing here'}</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                {q ? 'Try a different search.' : canCreate ? `Create the first ${tab === 'groups' ? 'group' : 'channel'}.` : 'Check back later.'}
              </Text>
            </View>
          )
        }
      />

      {/* Create modal */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={s.sheetOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface, paddingBottom: 24 + insets.bottom }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>New {cType === 'broadcast' ? 'Channel' : 'Group'}</Text>
            <Text style={[s.sheetSub, { color: colors.textSecondary }]}>Give it a name and short description.</Text>

            <View style={s.typeRow}>
              {(['group', 'broadcast'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setCType(t)}
                  style={[s.typeChip, { borderColor: cType === t ? colors.primary : colors.cardBorder, backgroundColor: cType === t ? colors.primary + '18' : 'transparent' }]}
                >
                  <MaterialCommunityIcons
                    name={t === 'group' ? 'account-group-outline' : 'bullhorn-outline'}
                    size={16}
                    color={cType === t ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[s.typeText, { color: cType === t ? colors.primary : colors.textSecondary }]}>
                    {t === 'group' ? 'Group' : 'Channel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[s.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              placeholder="Name" placeholderTextColor={colors.textTertiary}
              value={cName} onChangeText={setCName} maxLength={40}
            />
            <TextInput
              style={[s.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background, height: 88, textAlignVertical: 'top' }]}
              placeholder="Description (optional)" placeholderTextColor={colors.textTertiary}
              value={cDesc} onChangeText={setCDesc} multiline maxLength={140}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setCreateOpen(false)} />
              <Button title="Create" loading={saving} disabled={!cName.trim()} onPress={create} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 13, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, height: 32 },

  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exploreIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  exploreTitle: { fontSize: 15.5, fontWeight: '800' },
  exploreSub: { fontSize: 12.5, marginTop: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: DS.space.lg, paddingHorizontal: 14, height: 44, borderRadius: DS.radius.lg, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14.5 },

  tabBar: { flexDirection: 'row', marginTop: DS.space.md, padding: 4, borderRadius: DS.radius.lg, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: DS.radius.md },
  tabText: { fontSize: 12.5, fontWeight: '700' },

  roomCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: DS.radius.lg, borderWidth: 1 },
  roomIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roomTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomName: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  roomTime: { fontSize: 11.5, fontWeight: '600' },
  roomLast: { fontSize: 12.5, marginTop: 3 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  emptySub: { fontSize: 12.5, textAlign: 'center', maxWidth: 260 },

  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSub: { fontSize: 12.5, marginTop: 3, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  typeText: { fontSize: 13, fontWeight: '700' },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5, marginBottom: 10 },
});
