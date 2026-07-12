import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
      const cached = await AsyncStorage.getItem('userProfile');
      if (cached) {
        const data = JSON.parse(cached);
        setProfile(data);
        return data;
      }
      return null;
    }
  }, []);

  // Create initial profile for new user
  const createProfile = useCallback(async (firebaseUser: User, isGuest: boolean, name?: string) => {
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
      setProfile(newProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      return newProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      setProfile(newProfile);
      return newProfile;
    }
  }, []);

  // Auth state listener — fires on app open with persisted credentials
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const existingProfile = await fetchProfile(firebaseUser.uid);
        if (!existingProfile) {
          await createProfile(firebaseUser, firebaseUser.isAnonymous);
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

  // Sign up with email
  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(cred.user, false, name);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      await AsyncStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Delete account permanently
  const deleteAccount = async () => {
    if (!user) return;
    try {
      // Delete Firestore profile
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete Firebase auth account
      await firebaseDeleteUser(user);
      setProfile(null);
      await AsyncStorage.removeItem('userProfile');
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
