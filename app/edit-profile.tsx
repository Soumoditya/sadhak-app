import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Header, Button } from '../components/ui';
import Avatar from '../components/community/Avatar';
import { useAuth, type UserProfile } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { db, doc, getDoc, setDoc, deleteDoc } from '../config/firebase';
import { uploadToCloudinary } from '../services/cloudinary';
import { syncAuthorOnPosts } from '../services/posts';
import { DS, useDsInsets } from '../constants/ds';

type Avail = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'same';

export default function EditProfile() {
  const { profile, user, updateProfile, isGuest } = useAuth();
  const { colors } = useTheme();
  const { tx, noTrack } = useLanguage();
  const dialog = useDialog();
  const { screenBottom } = useDsInsets();

  const [name, setName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [gender, setGender] = useState<UserProfile['gender']>(profile?.gender ?? null);
  const [marriage, setMarriage] = useState<UserProfile['marriageStatus']>(profile?.marriageStatus ?? null);
  const [location, setLocation] = useState<UserProfile['location']>(profile?.location ?? null);
  const [city, setCity] = useState(profile?.location?.city || '');
  const [pfp, setPfp] = useState<string | null>(profile?.profilePicUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avail, setAvail] = useState<Avail>('idle');
  const timer = useRef<any>(null);

  // Live username availability (debounced).
  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (timer.current) clearTimeout(timer.current);
    if (!u) { setAvail('idle'); return; }
    if (u === profile?.username) { setAvail('same'); return; }
    if (u.length < 3 || u.length > 24 || !/^[a-z0-9_]+$/.test(u)) { setAvail('invalid'); return; }
    setAvail('checking');
    timer.current = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, 'usernames', u));
        const v: any = snap.exists() ? snap.data() : null;
        setAvail(v && !v.deletedAt && v.uid !== user?.uid ? 'taken' : 'ok');
      } catch { setAvail('ok'); }
    }, 400);
    return () => timer.current && clearTimeout(timer.current);
  }, [username, profile?.username, user?.uid]);

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { dialog.alert('Permission needed', 'Allow photo library access.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (res.canceled || !res.assets?.[0]) return;
      setUploading(true);
      const small = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
      const up = await uploadToCloudinary(small.uri, 'sadhak/avatars', 'image');
      setPfp(up.secure_url);
    } catch (e: any) {
      dialog.alert('Upload failed', String(e?.message || e).slice(0, 300));
    } finally { setUploading(false); }
  };

  const detectCity = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { dialog.alert('Permission needed', 'Allow location to fill in your city.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const [a] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const next = {
        city: a?.city || a?.subregion || '', state: a?.region || '',
        lat: loc.coords.latitude, lng: loc.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      setLocation(next); setCity(next.city);
    } catch {
      dialog.alert('Error', 'Could not get your location. You can type your city instead.');
    } finally { setLocating(false); }
  };

  const save = async () => {
    if (!user || !profile) return;
    const u = username.trim().toLowerCase();
    if (avail === 'invalid') { dialog.alert('Invalid username', 'Use 3 to 24 lowercase letters, numbers or underscores.'); return; }
    if (avail === 'taken') { dialog.alert('Taken', 'That username is already taken.'); return; }
    if (avail === 'checking') return;
    setSaving(true);
    try {
      if (u && u !== profile.username) {
        await setDoc(doc(db, 'usernames', u), { uid: user.uid, username: u, createdAt: Date.now() });
        if (profile.username) {
          await deleteDoc(doc(db, 'usernames', profile.username)).catch(() =>
            setDoc(doc(db, 'usernames', profile.username), { deletedAt: Date.now() }, { merge: true }).catch(() => {}));
        }
      }
      const cityTrim = city.trim();
      const loc = cityTrim
        ? (location && location.city === cityTrim ? location : { ...(location || { state: '', lat: 0, lng: 0, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }), city: cityTrim })
        : null;
      const displayName = name.trim() || 'Sadhak';
      await updateProfile({ displayName, username: u || profile.username, bio: bio.trim(), gender, marriageStatus: marriage, location: loc, profilePicUrl: pfp });
      syncAuthorOnPosts(user.uid, { displayName, username: u || profile.username, profilePicUrl: pfp }).catch(() => {});
      router.back();
    } catch (e: any) {
      dialog.alert('Could not save', String(e?.message || e).slice(0, 200));
    } finally { setSaving(false); }
  };

  const availText: Record<Avail, [string, string] | null> = {
    idle: null,
    same: null,
    checking: [tx('Checking…'), colors.textTertiary],
    ok: [tx('Available'), colors.success],
    taken: [tx('Already taken'), colors.error],
    invalid: [tx('3 to 24 lowercase letters, numbers or _'), colors.warning],
  };

  const Label = ({ children }: { children: string }) => <Text style={[s.label, { color: colors.textSecondary }, noTrack]}>{children}</Text>;

  const Chip = ({ active, label, icon, onPress }: { active: boolean; label: string; icon: any; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.chip, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + '15' : colors.surface }]}
    >
      <MaterialCommunityIcons name={icon} size={17} color={active ? colors.primary : colors.textSecondary} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.primary : colors.text }} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  const field = [s.field, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }];
  const at = availText[avail];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={tx('Edit profile')} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: DS.layout.screenPaddingH, paddingBottom: screenBottom }}
      >
        <TouchableOpacity onPress={pickPhoto} style={s.photo} activeOpacity={0.85}>
          <View>
            <Avatar uri={pfp} name={name} size={104} />
            <View style={[s.cam, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={16} color="#FFF" />}
            </View>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 10 }}>{tx('Change photo')}</Text>
        </TouchableOpacity>

        <Label>{tx('Name')}</Label>
        <TextInput style={field} value={name} onChangeText={setName} placeholder={tx('Your name')} placeholderTextColor={colors.textTertiary} maxLength={40} />

        <Label>{tx('Username')}</Label>
        <View style={[s.field, s.userRow, { borderColor: avail === 'taken' ? colors.error : colors.cardBorder, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textTertiary, fontSize: 16, fontWeight: '700' }}>@</Text>
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 }}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
            placeholder="your_username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />
          {avail === 'checking' ? <ActivityIndicator size="small" color={colors.textTertiary} /> :
            avail === 'ok' ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> :
            avail === 'taken' ? <Ionicons name="close-circle" size={20} color={colors.error} /> : null}
        </View>
        {at ? <Text style={[s.hint, { color: at[1] }]}>{at[0]}</Text> : <Text style={[s.hint, { color: colors.textTertiary }]}>{tx('Others can find and mention you by your @username.')}</Text>}

        <Label>{tx('Bio')}</Label>
        <TextInput
          style={[field, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
          value={bio} onChangeText={setBio} multiline maxLength={150}
          placeholder={tx('Tell us about your spiritual journey…')} placeholderTextColor={colors.textTertiary}
        />
        <Text style={[s.hint, { color: colors.textTertiary, textAlign: 'right' }]}>{bio.length}/150</Text>

        <Label>{tx('City')}</Label>
        <View style={[s.field, s.userRow, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
          <Ionicons name="location-outline" size={18} color={colors.textTertiary} />
          <TextInput style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 }} value={city} onChangeText={setCity} placeholder={tx('Your city')} placeholderTextColor={colors.textTertiary} />
          <TouchableOpacity onPress={detectCity} hitSlop={8} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: '700' }}>{tx('Detect')}</Text>}
          </TouchableOpacity>
        </View>
        <Text style={[s.hint, { color: colors.textTertiary }]}>{tx('Used for sunrise, panchang and festival timings.')}</Text>

        <Label>{tx('Gender')}</Label>
        <View style={s.chips}>
          <Chip active={gender === 'male'} label={tx('Male')} icon="gender-male" onPress={() => setGender(gender === 'male' ? null : 'male')} />
          <Chip active={gender === 'female'} label={tx('Female')} icon="gender-female" onPress={() => setGender(gender === 'female' ? null : 'female')} />
        </View>

        <Label>{tx('Marital status')}</Label>
        <View style={s.chips}>
          <Chip active={marriage === 'unmarried'} label={tx('Unmarried')} icon="heart-outline" onPress={() => setMarriage('unmarried')} />
          <Chip active={marriage === 'married'} label={tx('Married')} icon="heart" onPress={() => setMarriage('married')} />
        </View>
        <View style={[s.chips, { marginTop: 10 }]}>
          <Chip active={marriage === 'widowed'} label={tx('Widowed')} icon="heart-broken-outline" onPress={() => setMarriage('widowed')} />
          <View style={{ flex: 1 }} />
        </View>
        <Text style={[s.hint, { color: colors.textTertiary }]}>{tx('Used to personalise grooming and vrat guidance per shastra.')}</Text>

        {isGuest && <Text style={[s.hint, { color: colors.warning, marginTop: 16 }]}>{tx('You are browsing as a guest. Create an account to keep your profile.')}</Text>}

        <Button title={tx('Save')} icon="check" loading={saving} onPress={save} style={{ marginTop: 28 }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', marginTop: 8, marginBottom: 8 },
  cam: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  field: { borderWidth: 1.5, borderRadius: DS.radius.lg, paddingHorizontal: 16, height: 54, fontSize: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12.5, marginTop: 6 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: DS.radius.lg, borderWidth: 1.5 },
});
