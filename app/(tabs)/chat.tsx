import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Modal,
  TextInput, Alert, ActivityIndicator, Platform, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from "../../contexts/DialogContext";
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { db, rtdb, collection, getDocs, addDoc, doc, setDoc, serverTimestamp, ref, onValue, off } from '../../config/firebase';
import { useLayoutInsets } from '../../constants/layout';

type ChatTab = 'rooms' | 'private' | 'groups' | 'broadcast';

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'group' | 'broadcast';
  icon: string;
  color: string;
  lastMessage?: string;
  lastMessageTime?: number;
  memberCount?: number;
  createdBy?: string;
}

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'general', name: 'General', description: 'General discussion about dharma & spirituality', type: 'public', icon: 'forum-outline', color: '#D94F00', memberCount: 0 },
  { id: 'puja', name: 'Puja & Rituals', description: 'Discuss puja procedures, vidhi, and rituals', type: 'public', icon: 'candle', color: '#D32F2F', memberCount: 0 },
  { id: 'gita', name: 'Gita Discussion', description: 'Study and discuss Bhagavad Gita shlokas', type: 'public', icon: 'book-open-variant', color: '#1565C0', memberCount: 0 },
  { id: 'festivals', name: 'Festivals', description: 'Festival celebrations & preparations', type: 'public', icon: 'party-popper', color: '#FF8C00', memberCount: 0 },
  { id: 'astrology', name: 'Jyotish & Astrology', description: 'Vedic astrology discussions', type: 'public', icon: 'star-four-points-outline', color: '#9C27B0', memberCount: 0 },
  { id: 'help', name: 'Ask a Question', description: 'Get help from the community', type: 'public', icon: 'help-circle-outline', color: '#2D6A4F', memberCount: 0 },
];

function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ChatScreen() {
  const { user, profile, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t } = useLanguage();
  const { headerPaddingTop, tabContentPadding } = useLayoutInsets();
  const [activeTab, setActiveTab] = useState<ChatTab>('rooms');
  const [rooms, setRooms] = useState<ChatRoom[]>(DEFAULT_ROOMS);
  const [groups, setGroups] = useState<ChatRoom[]>([]);
  const [privateChats, setPrivateChats] = useState<ChatRoom[]>([]);
  const [broadcasts, setBroadcasts] = useState<ChatRoom[]>([]);
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState<'group' | 'broadcast'>('group');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const roomsRef = ref(rtdb, 'rooms');
    onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const updated = DEFAULT_ROOMS.map(room => ({
          ...room,
          lastMessage: data[room.id]?.lastMessage || '',
          lastMessageTime: data[room.id]?.lastMessageTime || 0,
          memberCount: data[room.id]?.memberCount || 0,
        }));
        setRooms(updated);
      }
    });
    fetchGroups();
    return () => off(roomsRef);
  }, []);

  const fetchGroups = async () => {
    try {
      const groupSnapshot = await getDocs(collection(db, 'chat_groups'));
      const g: ChatRoom[] = [];
      const b: ChatRoom[] = [];
      groupSnapshot.forEach(doc => {
        const data = doc.data();
        const room: ChatRoom = {
          id: doc.id, name: data.name, description: data.description || '',
          type: data.type, icon: data.type === 'broadcast' ? 'bullhorn-outline' : 'account-group-outline',
          color: data.type === 'broadcast' ? '#FF6B00' : '#2D6A4F',
          memberCount: data.memberCount || 0, createdBy: data.createdBy,
        };
        if (data.type === 'broadcast') b.push(room);
        else g.push(room);
      });
      setGroups(g);
      setBroadcasts(b);
    } catch (error) { console.error(error); }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) { dialog.alert('Error', 'Please enter a name'); return; }
    try {
      await addDoc(collection(db, 'chat_groups'), {
        name: newGroupName.trim(), description: newGroupDesc.trim(),
        type: newGroupType, createdBy: user?.uid,
        createdAt: serverTimestamp(), members: [user?.uid], memberCount: 1,
      });
      setCreateGroupModal(false);
      setNewGroupName(''); setNewGroupDesc('');
      fetchGroups();
      dialog.alert('Created!', `${newGroupType === 'broadcast' ? 'Channel' : 'Group'} created successfully.`);
    } catch (error) { dialog.alert('Error', 'Could not create group'); }
  };

  const openRoom = (room: ChatRoom) => {
    router.push({ pathname: '/chatroom', params: { roomId: room.id, roomName: room.name, roomType: room.type } });
  };

  const tabs: { key: ChatTab; label: string; icon: string; count?: number }[] = [
    { key: 'rooms', label: 'Rooms', icon: 'forum-outline', count: rooms.length },
    { key: 'private', label: 'DMs', icon: 'chat-outline', count: privateChats.length },
    { key: 'groups', label: 'Groups', icon: 'account-group-outline', count: groups.length },
    { key: 'broadcast', label: 'Channels', icon: 'bullhorn-outline', count: broadcasts.length },
  ];

  const getCurrentList = (): ChatRoom[] => {
    const list = (() => {
      switch (activeTab) {
        case 'rooms': return rooms;
        case 'private': return privateChats;
        case 'groups': return groups;
        case 'broadcast': return broadcasts;
        default: return rooms;
      }
    })();
    if (!searchQuery) return list;
    return list.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getEmptyState = () => {
    switch (activeTab) {
      case 'private': return { icon: 'chat-sleep-outline' as const, title: 'No conversations yet', text: 'Start a direct message with another Sadhak' };
      case 'groups': return { icon: 'account-group-outline' as const, title: 'No groups yet', text: 'Create a study group or discussion circle' };
      case 'broadcast': return { icon: 'bullhorn-variant-outline' as const, title: 'No channels yet', text: 'Create a broadcast channel to share wisdom' };
      default: return { icon: 'forum-outline' as const, title: 'No rooms available', text: 'Check back later' };
    }
  };

  const renderChatItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={[st.chatItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
      onPress={() => openRoom(item)}
      activeOpacity={0.7}
    >
      <View style={[st.chatAvatar, { backgroundColor: item.color + '12' }]}>
        <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={st.chatInfo}>
        <View style={st.chatNameRow}>
          <Text style={[st.chatName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.lastMessageTime ? (
            <Text style={[st.chatTime, { color: colors.textTertiary }]}>{formatTime(item.lastMessageTime)}</Text>
          ) : null}
        </View>
        <Text style={[st.chatLastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.lastMessage || item.description}
        </Text>
        {(item.memberCount || 0) > 0 && (
          <View style={st.memberRow}>
            <MaterialCommunityIcons name="account-multiple-outline" size={12} color={colors.textTertiary} />
            <Text style={[st.memberText, { color: colors.textTertiary }]}>{item.memberCount} members</Text>
          </View>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const emptyState = getEmptyState();

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#1B7A42', '#2D9D5E']}
        style={[st.header, { paddingTop: headerPaddingTop }]}
      >
        <View style={st.headerContent}>
          <View>
            <Text style={st.headerTitle}>Community</Text>
            <Text style={st.headerSub}>Connect with fellow Sadhaks</Text>
          </View>
          <View style={[st.onlineBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={st.onlineDot} />
            <Text style={st.onlineText}>Online</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[st.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      {/* Tabs */}
      <View style={[st.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[st.tab, isActive && { backgroundColor: colors.primary + '12', borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons name={tab.icon as any} size={18} color={isActive ? colors.primary : colors.textTertiary} />
              <Text style={[st.tabText, { color: isActive ? colors.primary : colors.textTertiary }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chat List */}
      <FlatList
        data={getCurrentList()}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[st.chatList, { paddingBottom: tabContentPadding }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={[st.emptyCircle, { backgroundColor: isDark ? colors.surfaceElevated : '#F0F9F4' }]}>
              <MaterialCommunityIcons name={emptyState.icon} size={40} color={colors.textTertiary} />
            </View>
            <Text style={[st.emptyTitle, { color: colors.text }]}>{emptyState.title}</Text>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>{emptyState.text}</Text>
            {(activeTab === 'groups' || activeTab === 'broadcast') && (
              <TouchableOpacity
                style={[st.emptyBtn, { backgroundColor: colors.primary + '12' }]}
                onPress={() => { setNewGroupType(activeTab === 'broadcast' ? 'broadcast' : 'group'); setCreateGroupModal(true); }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Create {activeTab === 'broadcast' ? 'Channel' : 'Group'}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Group/Broadcast FAB */}
      {(activeTab === 'groups' || activeTab === 'broadcast') && (
        <TouchableOpacity
          style={st.fab}
          onPress={() => { setNewGroupType(activeTab === 'broadcast' ? 'broadcast' : 'group'); setCreateGroupModal(true); }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#1B7A42', '#4ADE80']} style={st.fabGrad}>
            <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Create Group Modal */}
      <Modal visible={createGroupModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.surface }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>
                Create {newGroupType === 'broadcast' ? 'Channel' : 'Group'}
              </Text>
              <TouchableOpacity onPress={() => setCreateGroupModal(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={st.typeRow}>
              {[{ key: 'group' as const, label: 'Study Group', icon: 'account-group-outline', desc: 'Everyone can participate' },
                { key: 'broadcast' as const, label: 'Channel', icon: 'bullhorn-outline', desc: 'Only admins can post' }].map(opt => (
                <TouchableOpacity key={opt.key}
                  style={[st.typeCard, { backgroundColor: newGroupType === opt.key ? colors.primary + '10' : colors.background, borderColor: newGroupType === opt.key ? colors.primary : colors.border }]}
                  onPress={() => setNewGroupType(opt.key)}>
                  <MaterialCommunityIcons name={opt.icon as any} size={22} color={newGroupType === opt.key ? colors.primary : colors.textSecondary} />
                  <Text style={[st.typeLabel, { color: newGroupType === opt.key ? colors.primary : colors.text }]}>{opt.label}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Name *"
              placeholderTextColor={colors.textTertiary}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TextInput
              style={[st.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
            />

            <TouchableOpacity onPress={createGroup} activeOpacity={0.8}>
              <LinearGradient colors={['#1B7A42', '#4ADE80']} style={st.createBtn}>
                <MaterialCommunityIcons name="check" size={22} color="#FFF" />
                <Text style={st.createBtnText}>Create</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  tabText: { fontSize: 11, fontWeight: '700' },

  chatList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 12 },
  chatAvatar: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1 },
  chatNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', flex: 1 },
  chatTime: { fontSize: 11, marginLeft: 6 },
  chatLastMsg: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  memberText: { fontSize: 10, fontWeight: '500' },

  emptyState: { alignItems: 'center', marginTop: 50, gap: 10, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },

  fab: { position: 'absolute', bottom: 90, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#1B7A42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  typeLabel: { fontSize: 13, fontWeight: '700' },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  createBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 52 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
