import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDialog } from '../contexts/DialogContext';
import { useLayoutInsets } from '../constants/layout';
import { uploadToCloudinary } from '../services/cloudinary';
import { createPost, extractHashtags } from '../services/posts';

export default function CreatePostScreen() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { headerPaddingTop, backBtnTop, screenBottomPadding } = useLayoutInsets();

  const [text, setText] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const tags = useMemo(() => extractHashtags(text), [text]);
  const canPost = (text.trim().length > 0 || !!localImage) && !posting;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      dialog.alert('Permission needed', 'Allow photo access to attach an image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]) setLocalImage(res.assets[0].uri);
  };

  const submit = async () => {
    if (!user || !profile) {
      dialog.alert('Sign in required', 'Please sign in to post.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (localImage) {
        // Compress to feed size first — full camera photos are multi-MB and die
        // on weak connections; ~1280px JPEG uploads reliably.
        const small = await ImageManipulator.manipulateAsync(
          localImage,
          [{ resize: { width: 1280 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const up = await uploadToCloudinary(small.uri, 'sadhak/posts', 'image');
        imageUrl = up.secure_url;
      }
      // Fire-and-close: Firestore shows the post instantly from the local queue
      // and syncs when the connection allows — no more false "could not post"
      // failures on a flaky network.
      createPost({
        author: {
          uid: user.uid,
          displayName: profile.displayName,
          username: profile.username,
          profilePicUrl: profile.profilePicUrl,
        },
        text,
        imageUrl,
      }).catch(() => {});
      router.back();
    } catch (e: any) {
      dialog.alert('Could not post', String(e?.message || e).slice(0, 250));
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
        style={[styles.header, { paddingTop: headerPaddingTop }]}
      >
        <TouchableOpacity style={[styles.backBtn, { top: backBtnTop }]} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.postBtn, { opacity: canPost ? 1 : 0.5 }]}
          disabled={!canPost}
          onPress={submit}
        >
          {posting ? <ActivityIndicator color="#D94F00" size="small" /> : <Text style={styles.postBtnText}>Share</Text>}
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: screenBottomPadding }} keyboardShouldPersistTaps="handled">
          {/* Author row */}
          <View style={styles.authorRow}>
            {profile?.profilePicUrl ? (
              <Image source={{ uri: profile.profilePicUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{(profile?.displayName || 'S')[0]}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.authorName, { color: colors.text }]}>{profile?.displayName || 'Sadhak'}</Text>
              {!!profile?.username && <Text style={[styles.authorHandle, { color: colors.textTertiary }]}>@{profile.username}</Text>}
            </View>
          </View>

          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Share a thought, question, or blessing…  Use #hashtags"
            placeholderTextColor={colors.textTertiary}
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            maxLength={2000}
          />

          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.primaryMuted }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {localImage && (
            <View style={styles.imageWrap}>
              <Image source={{ uri: localImage }} style={styles.image} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImage} onPress={() => setLocalImage(null)}>
                <Ionicons name="close" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.toolbar, { borderTopColor: colors.divider, backgroundColor: colors.surface, paddingBottom: screenBottomPadding }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
            <MaterialCommunityIcons name="image-plus" size={22} color={colors.primary} />
            <Text style={[styles.toolText, { color: colors.textSecondary }]}>Photo</Text>
          </TouchableOpacity>
          <Text style={[styles.counter, { color: colors.textTertiary }]}>{text.length}/2000</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backBtn: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  postBtn: { position: 'absolute', right: 16, bottom: 12, backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#D94F00', fontWeight: '800', fontSize: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  authorName: { fontSize: 15, fontWeight: '700' },
  authorHandle: { fontSize: 12 },
  input: { fontSize: 17, lineHeight: 24, minHeight: 120, textAlignVertical: 'top' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 12, fontWeight: '700' },
  imageWrap: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: 260 },
  removeImage: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolText: { fontSize: 14, fontWeight: '600' },
  counter: { fontSize: 12 },
});
