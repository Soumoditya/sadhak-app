import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  off,
  query as rtQuery,
  orderByChild,
  limitToLast,
  serverTimestamp as rtServerTimestamp,
} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAEeAwOtwMjnGenFjoykVQLy8a24GfWUro',
  authDomain: 'sadhak-app.firebaseapp.com',
  projectId: 'sadhak-app',
  storageBucket: 'sadhak-app.firebasestorage.app',
  messagingSenderId: '779861206772',
  appId: '1:779861206772:web:00821148295be84fb120a1',
  measurementId: 'G-7NWJREWJ1S',
  // IMPORTANT: this database lives in asia-southeast1 — the old .firebaseio.com
  // URL points at a non-existent US database, which is why chat writes never landed.
  databaseURL: 'https://sadhak-app-default-rtdb.asia-southeast1.firebasedatabase.app',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// USE initializeAuth with AsyncStorage persistence — this is THE fix for
// "auto logout on app restart". getAuth() defaults to in-memory persistence
// in React Native, so the session is lost when the app is closed.
//
// NOTE: firebase-js-sdk v12 ships getReactNativePersistence at runtime but
// dropped it from the published TS types (known upstream issue). Pull it via
// require so the type-checker doesn't fail while runtime behaviour is unchanged.
const { getReactNativePersistence } = require('firebase/auth');
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const rtdb = getDatabase(app);

export {
  app,
  auth,
  db,
  rtdb,
  // Auth
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  // Firestore
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  // Realtime DB
  ref,
  push,
  set,
  onValue,
  off,
  rtQuery,
  orderByChild,
  limitToLast,
  rtServerTimestamp,
};

export type { User };
