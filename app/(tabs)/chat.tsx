import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Avatar from '../../components/community/Avatar';
import { subscribeDms, isDmRequest, type DmEntry } from '../../services/social';
import { db, rtdb, collection, getDocs, addDoc, serverTimestamp, ref, onValue, off } from '../../config/firebase';
import { Screen, Button, Diya, Icon, fromMaterial, AppBar, ActionSheet } from '../../components/ui';
import { DS, useDsInsets } from '../../constants/ds';

type ChatTab = 'rooms' | 'dms' | 'groups' | 'channels';

interface Room {
  id: string; name: string; description: string;
  type: 'public' | 'group' | 'broadcast' | 'dm';
  pfp?: string | null;
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
  const { colors, tone } = useTheme();
  const { t, tx } = useLanguage();
  const dialog = useDialog();
  const { insets, tabScrollBottom } = useDsInsets();

  const [tab, setTabState] = useState<ChatTab>('rooms');
  const [touched, setTouched] = useState(false);
  const setTab = (k: ChatTab) => { setTouched(true); setTabState(k); };
  const [menu, setMenu] = useState(false);
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [groups, setGroups] = useState<Room[]>([]);
  const [channels, setChannels] = useState<Room[]>([]);
  const [dms, setDms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<Room[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const toRoom = (d: DmEntry): Room => ({
      id: d.roomId, name: d.otherName, description: '', type: 'dm', icon: 'account', color: '#C2410C',
      pfp: d.otherPfp, lastMessage: d.lastMessage, lastMessageTime: d.lastMessageTime,
    });
    // People you follow land in Chats; anyone else waits in Requests.
    return subscribeDms(user.uid, (list) => {
      setDms(list.filter((d) => !d.blocked && !isDmRequest(d)).map(toRoom));
      setRequests(list.filter(isDmRequest).map(toRoom));
    });
  }, [user?.uid]);
  useEffect(() => { if (!requests.length) setShowRequests(false); }, [requests.length]);
  // People who already chat land on their chats first.
  useEffect(() => { if (!touched && dms.length) setTabState('dms'); }, [dms.length]);
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
    const items = tab === 'rooms' ? rooms : tab === 'groups' ? groups : tab === 'channels' ? channels : showRequests ? requests : dms;
    const query = q.trim().toLowerCase();
    return query ? items.filter(r => r.name.toLowerCase().includes(query) || (r.description || '').toLowerCase().includes(query)) : items;
  }, [tab, rooms, groups, channels, dms, requests, showRequests, q]);
  const counts: Record<ChatTab, number> = { dms: dms.length, rooms: rooms.length, groups: groups.length, channels: channels.length };

  const canCreate = tab === 'groups' || tab === 'channels';

  const TABS: { k: ChatTab; label: string }[] = [
    { k: 'dms', label: tx('Chats') },
    { k: 'rooms', label: t('chat.rooms') },
    { k: 'groups', label: t('chat.groups') },
    { k: 'channels', label: t('chat.channels') },
  ];
  const isLive = (ts?: number) => !!ts && Date.now() - ts < 15 * 60_000;

  return (
    <Screen tabbed edges={{ top: false, bottom: false }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <AppBar
          title={t('chat.title')}
          subtitle={t('chat.subtitle')}
          right={
            <TouchableOpacity onPress={() => setMenu(true)} accessibilityLabel={tx('New')} style={[s.newBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="create-outline" size={19} color="#FFF" />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Icon name="magnifying-glass" size={17} color={colors.textTertiary} weight="regular" />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder={t('chat.search')}
          placeholderTextColor={colors.textTertiary}
          value={q} onChangeText={setQ}
        />
        {!!q && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={17} color={colors.textTertiary} /></TouchableOpacity>}
      </View>

      {/* Shortcuts */}
      <View style={s.shortcuts}>
        {([
          { key: 'feed', label: tx('Feed'), icon: 'newspaper', tone: 'saffron', go: () => router.push('/feed') },
          { key: 'post', label: tx('New post'), icon: 'note-pencil', tone: 'kumkum', go: () => router.push('/create-post') },
          { key: 'people', label: tx('People'), icon: 'users-three', tone: 'neel', go: () => (user?.uid ? router.push({ pathname: '/follows', params: { uid: user.uid, kind: 'following' } }) : router.push('/feed')) },
          { key: 'ask', label: tx('Ask'), icon: 'question', tone: 'plum', go: () => openRoom(DEFAULT_ROOMS[DEFAULT_ROOMS.length - 1]) },
        ] as const).map((x) => (
          <TouchableOpacity key={x.key} onPress={x.go} style={s.shortcut} activeOpacity={0.75}>
            <View style={[s.shortcutIcon, { backgroundColor: tone(x.tone).bg }]}>
              <Icon name={x.icon} size={22} color={tone(x.tone).fg} />
            </View>
            <Text style={[s.shortcutText, { color: colors.text }]} numberOfLines={1}>{x.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { borderBottomColor: colors.divider }]}>
        {TABS.map(({ k, label }) => {
          const active = tab === k;
          return (
            <TouchableOpacity key={k} style={s.tab} onPress={() => setTab(k)} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[s.tabText, { color: active ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{label}</Text>
                {k !== 'rooms' && counts[k] > 0 && (
                  <View style={[s.count, { backgroundColor: active ? colors.primary : colors.surfaceSecondary }]}>
                    <Text style={[s.countText, { color: active ? '#FFF' : colors.textSecondary }]}>{counts[k]}</Text>
                  </View>
                )}
              </View>
              <View style={[s.tabLine, { backgroundColor: active ? colors.primary : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: tabScrollBottom, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={tab === 'dms' && (requests.length > 0 || showRequests) ? (
          <TouchableOpacity onPress={() => setShowRequests((v) => !v)} style={s.row} activeOpacity={0.7}>
            <View style={[s.avatarBox, { backgroundColor: colors.primary + '14', borderRadius: 24 }]}>
              <Ionicons name={showRequests ? 'arrow-back' : 'mail-unread-outline'} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowName, { color: colors.text }]}>{showRequests ? tx('Back to chats') : tx('Message requests')}</Text>
              {!showRequests && <Text style={[s.rowLast, { color: colors.textSecondary }]}>{requests.length} {tx(requests.length === 1 ? 'person wants to chat' : 'people want to chat')}</Text>}
            </View>
            {!showRequests && (
              <View style={[s.count, { backgroundColor: colors.primary }]}><Text style={[s.countText, { color: '#FFF' }]}>{requests.length}</Text></View>
            )}
          </TouchableOpacity>
        ) : canCreate ? (
          <TouchableOpacity onPress={() => { setCType(tab === 'channels' ? 'broadcast' : 'group'); setCreateOpen(true); }} style={s.row} activeOpacity={0.7}>
            <View style={[s.avatarBox, { backgroundColor: colors.primary + '14', borderRadius: 24 }]}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </View>
            <Text style={[s.rowName, { color: colors.primary }]}>{tx(tab === 'channels' ? 'New channel' : 'New group')}</Text>
          </TouchableOpacity>
        ) : null}
        ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: colors.divider }]} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openRoom(item)} style={s.row} activeOpacity={0.7}>
            <View style={[s.avatarBox, { backgroundColor: item.type === 'dm' ? 'transparent' : tone(item.color).bg }]}>
              {item.type === 'dm' ? (
                <Avatar uri={item.pfp} name={item.name} size={48} />
              ) : item.icon === 'candle' ? (
                <Diya size={24} color={tone(item.color).fg} />
              ) : fromMaterial(item.icon) ? (
                <Icon name={fromMaterial(item.icon)!} size={25} color={tone(item.color).fg} />
              ) : (
                <MaterialCommunityIcons name={item.icon as any} size={22} color={tone(item.color).fg} />
              )}
              {isLive(item.lastMessageTime) && <View style={[s.liveDot, { borderColor: colors.background }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rowTop}>
                <Text style={[s.rowName, { color: colors.text }]} numberOfLines={1}>{item.type === 'dm' ? item.name : tx(item.name)}</Text>
                {!!item.lastMessageTime && (
                  <Text style={[s.rowTime, { color: isLive(item.lastMessageTime) ? colors.primary : colors.textTertiary }]}>{relTime(item.lastMessageTime)}</Text>
                )}
              </View>
              <Text style={[s.rowLast, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.lastMessage || tx(item.description || '')}
              </Text>
              {!!item.memberCount && item.type !== 'dm' && (
                <Text style={[s.rowMeta, { color: colors.textTertiary }]}>{item.memberCount} {tx('members')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          tab === 'dms' ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                <Icon name="chat-circle" size={30} color={colors.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>{tx('No direct messages yet')}</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>{tx('Open someone’s profile from the feed and tap Message.')}</Text>
              <Button title={tx('Find sadhaks')} onPress={() => router.push('/feed')} style={{ marginTop: 12, paddingHorizontal: 22 }} />
            </View>
          ) : canCreate ? null : (
            <View style={s.empty}>
              <MaterialCommunityIcons name="magnify" size={36} color={colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{tx('No matches')}</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>{tx('Try a different search.')}</Text>
            </View>
          )
        }
      />

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        actions={[
          { label: tx('New post'), icon: 'create-outline', onPress: () => router.push('/create-post') },
          { label: tx('New group'), icon: 'people-outline', onPress: () => { setCType('group'); setCreateOpen(true); } },
          { label: tx('New channel'), icon: 'megaphone-outline', onPress: () => { setCType('broadcast'); setCreateOpen(true); } },
          { label: tx('Find sadhaks'), icon: 'search-outline', onPress: () => router.push('/feed') },
        ]}
      />

      {/* Create modal */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView behavior="padding" style={s.sheetOverlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface, paddingBottom: 24 + insets.bottom }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>{tx('New')} {cType === 'broadcast' ? 'Channel' : 'Group'}</Text>
            <Text style={[s.sheetSub, { color: colors.textSecondary }]}>{tx('Give it a name and short description.')}</Text>

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
              placeholder={tx('Name')} placeholderTextColor={colors.textTertiary}
              value={cName} onChangeText={setCName} maxLength={40}
            />
            <TextInput
              style={[s.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background, height: 88, textAlignVertical: 'top' }]}
              placeholder={tx('Description (optional)')} placeholderTextColor={colors.textTertiary}
              value={cDesc} onChangeText={setCDesc} multiline maxLength={140}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={tx('Cancel')} variant="secondary" onPress={() => setCreateOpen(false)} style={{ flex: 1 }} />
              <Button title={tx('Create')} loading={saving} disabled={!cName.trim()} onPress={create} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 13, marginTop: 2 },
  newBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: DS.space.sm, paddingHorizontal: 14, height: 44, borderRadius: DS.radius.lg, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14.5 },

  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: DS.space.lg, paddingHorizontal: 4 },
  shortcut: { alignItems: 'center', gap: 6, width: 72 },
  shortcutIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  shortcutText: { fontSize: 12, fontWeight: '700' },

  tabBar: { flexDirection: 'row', marginTop: DS.space.lg, borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingTop: 8 },
  tabText: { fontSize: 13.5, fontWeight: '800' },
  tabLine: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 8, marginHorizontal: 10 },
  count: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10.5, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  liveDot: { position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: '#22A35A', borderWidth: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowName: { flex: 1, fontSize: 15.5, fontWeight: '800' },
  rowTime: { fontSize: 11.5, fontWeight: '700' },
  rowLast: { fontSize: 13, marginTop: 3 },
  rowMeta: { fontSize: 11.5, marginTop: 2 },
  sep: { height: 1, marginLeft: 62 },

  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
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
