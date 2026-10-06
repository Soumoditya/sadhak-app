import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/appInfo';
import { linkWithCredential, sendEmailVerification, signOut as fbSignOut, deleteUser as fbDeleteUser, signInAnonymously as fbAnon } from 'firebase/auth';
import {
  auth,
  db,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  collection,
  getDocs,
  User,
} from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string | null;
  phone: string | null;
  bio: string;
  gender: 'male' | 'female' | null;
  marriageStatus: 'married' | 'unmarried' | 'widowed' | null;
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
    timezone: string;
  } | null;
  // NOTE: sensitive Vedic birth details (DOB/time/place) are NOT stored here —
  // the profile doc is community-readable, so they live only in the owner-only
  // subcollection users/{uid}/jyotish/natal (see services/jyotish.ts). We keep
  // just a flag so the UI knows a chart exists.
  hasBirthChart?: boolean;
  // One-time consent to store profile + astro + usage data (app improvement / research).
  dataConsent?: boolean;
  role: 'user' | 'admin';
  isGuest: boolean;
  profilePicUrl: string | null;
  createdAt: any;
  lastActive: any;
  settings: {
    darkMode: boolean;
    language: string;
    notifications: boolean;
    groomingReminders: boolean;
    festivalReminders: boolean;
    ekadashiReminders: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: number; // hour 0-23
    quietHoursEnd: number;
    showProfileInCommunity: boolean;
    allowDMs: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Email for an email-or-username login id (usernames are looked up). */
  resolveLoginEmail: (id: string) => Promise<string>;
  /** Google account sign-in. Resolves false if the user cancelled. */
  signInWithGoogle: () => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  isAdmin: false,
  signInAsGuest: async () => {},
  signInWithEmail: async () => {},
  resolveLoginEmail: async (id: string) => id,
  signInWithGoogle: async () => false,
  signUpWithEmail: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  deleteAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const DEFAULT_SETTINGS: UserProfile['settings'] = {
  darkMode: false,
  language: 'en',
  notifications: true,
  groomingReminders: true,
  festivalReminders: true,
  ekadashiReminders: true,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 5,
  showProfileInCommunity: true,
  allowDMs: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        // Ensure new fields have defaults for old profiles
        const migrated: UserProfile = {
          ...data,
          bio: data.bio || '',
          username: data.username || '',
          lastActive: data.lastActive || null,
          settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        };
        setProfile(migrated);
        await AsyncStorage.setItem('userProfile', JSON.stringify(migrated));
        return migrated;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Try loading from local cache
      // Offline: fall back to the cached copy, but only if it is this user's.
      try {
        const cached = await AsyncStorage.getItem('userProfile');
        if (cached) {
          const data = JSON.parse(cached);
          if (data?.uid === uid) {
            setProfile(data);
            return data;
          }
        }
      } catch {}
      // Unknown (offline), which is not the same as "no profile yet".
      return undefined;
    }
  }, []);

  // Create initial profile for new user. Shared per uid so the auth listener
  // and sign-up can't race each other into two different profiles.
  const creating = useRef<Record<string, Promise<UserProfile>>>({});
  const pendingName = useRef<string | undefined>(undefined);
  const createProfile = useCallback((firebaseUser: User, isGuest: boolean, name?: string) => {
    const uid = firebaseUser.uid;
    if (!creating.current[uid]) creating.current[uid] = doCreateProfile(firebaseUser, isGuest, name);
    return creating.current[uid];
  }, []);
  const doCreateProfile = async (firebaseUser: User, isGuest: boolean, name?: string): Promise<UserProfile> => {
    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: name || (isGuest ? 'Sadhak' : firebaseUser.displayName || 'Sadhak'),
      username: '',
      email: firebaseUser.email,
      phone: firebaseUser.phoneNumber,
      bio: '',
      gender: null,
      marriageStatus: null,
      location: null,
      hasBirthChart: false,
      dataConsent: false,
      role: 'user',
      isGuest,
      profilePicUrl: firebaseUser.photoURL,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      settings: DEFAULT_SETTINGS,
    };

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      // serverTimestamp() is only a placeholder locally; keep real dates in state
      // so "Since" etc. don't show NaN until the next app start.
      const local = { ...newProfile, createdAt: Date.now(), lastActive: Date.now() };
      setProfile(local);
      await AsyncStorage.setItem('userProfile', JSON.stringify(local));
      return local;
    } catch (error) {
      console.error('Error creating profile:', error);
      const local = { ...newProfile, createdAt: Date.now(), lastActive: Date.now() };
      setProfile(local);
      return local;
    }
  };

  // While looking up a username we briefly sign in anonymously; the listener
  // must ignore that throwaway session (it used to create junk guest profiles).
  const quiet = useRef(false);

  // Auth state listener — fires on app open with persisted credentials
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (quiet.current) return;
      setUser(firebaseUser);

      if (firebaseUser) {
        const existingProfile = await fetchProfile(firebaseUser.uid);
        if (existingProfile === null) {
          await createProfile(firebaseUser, firebaseUser.isAnonymous, pendingName.current);
        }
        // Update lastActive silently
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), { lastActive: serverTimestamp() }, { merge: true });
        } catch (_) {}
      } else {
        setProfile(null);
        await AsyncStorage.removeItem('userProfile');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile, createProfile]);

  // Sign in as guest
  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Guest sign in error:', error);
      throw error;
    }
  };

  // Sign in with email
  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const resolveLoginEmail = async (loginId: string): Promise<string> => {
    const id = loginId.trim();
    if (id.includes('@')) return id;
    const username = id.replace(/^@/, '').toLowerCase();
    quiet.current = true;
    try {
      const anon = await fbAnon(auth);
      try {
        const uSnap = await getDoc(doc(db, 'usernames', username));
        const u = uSnap.exists() ? (uSnap.data() as any) : null;
        if (!u?.uid || u.deletedAt) throw new Error('No account found with this username.');
        const pSnap = await getDoc(doc(db, 'users', u.uid));
        const em = (pSnap.data() as any)?.email;
        if (!em) throw new Error('This account has no email. Sign in with your email.');
        return em;
      } finally {
        try { await fbDeleteUser(anon.user); } catch { try { await fbSignOut(auth); } catch {} }
      }
    } finally {
      quiet.current = false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    if (!GOOGLE_WEB_CLIENT_ID) throw new Error('Google sign-in is being set up. Please use email for now.');
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res: any = await GoogleSignin.signIn();
    if (res?.type === 'cancelled') return false;
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error('Google did not return a sign-in token.');
    const credential = GoogleAuthProvider.credential(idToken);
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      // Keep a guest's data by upgrading the guest account.
      try {
        const cred = await linkWithCredential(current, credential);
        await setDoc(doc(db, 'users', cred.user.uid), {
          isGuest: false, email: cred.user.email, displayName: cred.user.displayName || 'Sadhak', profilePicUrl: cred.user.photoURL || null,
        }, { merge: true });
        await fetchProfile(cred.user.uid);
        return true;
      } catch (e: any) {
        if (e?.code !== 'auth/credential-already-in-use') throw e;
        // That Google account already has a Sadhak account: sign into it.
      }
    }
    await signInWithCredential(auth, credential);
    return true;
  };

  // Sign up with email. A guest who signs up keeps their uid and data: the
  // anonymous account is upgraded in place instead of being abandoned.
  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        const cred = await linkWithCredential(current, EmailAuthProvider.credential(email, password));
        await setDoc(doc(db, 'users', cred.user.uid), { isGuest: false, email, displayName: name }, { merge: true });
        await fetchProfile(cred.user.uid);
        sendEmailVerification(cred.user).catch(() => {});
        return;
      }
      pendingName.current = name;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(cred.user, false, name);
      sendEmailVerification(cred.user).catch(() => {});
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      pendingName.current = undefined;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      GoogleSignin.signOut().catch(() => {});
      setProfile(null);
      await AsyncStorage.removeItem('userProfile');
      // Leave whatever screen we were on (Settings) for the login screen.
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Delete account permanently
  const deleteAccount = async () => {
    if (!user) return;
    // Firebase only deletes an account after a recent sign-in; check that
    // first so we never wipe the data and then fail to delete the login.
    const signedInAt = Date.parse(user.metadata.lastSignInTime || '') || 0;
    if (!user.isAnonymous && Date.now() - signedInAt > 4 * 60 * 1000) {
      const e: any = new Error('Please sign in again, then delete your account.');
      e.code = 'auth/requires-recent-login';
      throw e;
    }
    const uid = user.uid;
    try {
      const best = (pr: Promise<any>) => pr.catch(() => {});
      // Owner data first (rules allow it only while signed in).
      const notes = await getDocs(collection(db, `users/${uid}/notes`)).catch(() => null);
      if (notes) await Promise.all(notes.docs.map((d) => best(deleteDoc(d.ref))));
      await best(deleteDoc(doc(db, `users/${uid}/jyotish`, 'natal')));
      if (profile?.username) await best(deleteDoc(doc(db, 'usernames', profile.username)));
      await deleteDoc(doc(db, 'users', uid));
      await firebaseDeleteUser(user);
      setProfile(null);
      await AsyncStorage.removeItem('userProfile');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true });
      const updatedProfile = { ...profile, ...updates } as UserProfile;
      setProfile(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // Refresh profile from server
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    isGuest: profile?.isGuest || false,
    isAdmin: profile?.role === 'admin',
    signInAsGuest,
    signInWithEmail,
    resolveLoginEmail,
    signInWithGoogle,
    signUpWithEmail,
    logout,
    updateProfile,
    refreshProfile,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
