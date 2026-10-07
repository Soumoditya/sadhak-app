import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { db, collection, addDoc, serverTimestamp, auth } from '../config/firebase';

// Lightweight, anonymous diagnostics: JS errors, slow screens and slow or
// failed network calls, batched to Firestore `diagnostics`. No names, emails
// or birth data: just a random install id, device model and app version.
// Users can turn it off in Settings.

type Ev = { t: number; name: string; data?: Record<string, any> };
const KEY_ID = 'sadhak_install_id';
const KEY_OFF = 'sadhak_diag_off';
let installId = '';
let enabled = true;
let queue: Ev[] = [];
let timer: any = null;
let started = false;

const pc: any = (Platform as any).constants || {};
const device = {
  os: `${Platform.OS} ${pc.Release ?? Platform.Version}`,
  model: [pc.Manufacturer || pc.Brand, pc.Model].filter(Boolean).join(' ') || Platform.OS,
};
const app = {
  version: Constants.expoConfig?.version || '',
  build: String(Constants.expoConfig?.android?.versionCode ?? ''),
  update: (Updates as any).updateId ? String((Updates as any).updateId).slice(0, 8) : 'embedded',
};

export function logEvent(name: string, data?: Record<string, any>) {
  if (!enabled) return;
  queue.push({ t: Date.now(), name, data });
  if (queue.length > 200) queue = queue.slice(-200);
  if (!timer) timer = setTimeout(flush, 30000);
}

export async function flush() {
  timer = null;
  if (!enabled || !queue.length || !auth.currentUser) return;
  const events = queue.splice(0, 100);
  try {
    await addDoc(collection(db, 'diagnostics'), {
      installId, ...device, ...app, events: JSON.stringify(events).slice(0, 60000), at: serverTimestamp(),
    });
  } catch {
    queue = [...events, ...queue].slice(-200);
  }
}

export async function setDiagnosticsEnabled(on: boolean) {
  enabled = on;
  if (!on) queue = [];
  try { on ? await AsyncStorage.removeItem(KEY_OFF) : await AsyncStorage.setItem(KEY_OFF, '1'); } catch {}
}
export const diagnosticsEnabled = () => enabled;
export const getInstallId = () => installId;

/** Wire global error capture once, at app start. */
export async function startDiagnostics() {
  if (started) return;
  started = true;
  try {
    enabled = !(await AsyncStorage.getItem(KEY_OFF));
    installId = (await AsyncStorage.getItem(KEY_ID)) || '';
    if (!installId) {
      installId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      await AsyncStorage.setItem(KEY_ID, installId);
    }
  } catch {}

  const g: any = globalThis as any;
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((err: any, fatal?: boolean) => {
    logEvent('js_error', { fatal: !!fatal, msg: String(err?.message || err).slice(0, 300), stack: String(err?.stack || '').split('\n').slice(0, 6).join(' | ').slice(0, 600) });
    if (fatal) flush();
    prev?.(err, fatal);
  });

  // Network timing for our own APIs and Firebase-free fetches.
  const origFetch = g.fetch;
  if (origFetch && !g.__sadhakFetch) {
    g.__sadhakFetch = true;
    g.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      const t0 = Date.now();
      try {
        const res = await origFetch(input, init);
        const ms = Date.now() - t0;
        if (!res.ok || ms > 4000) logEvent('net', { host: url.replace(/^https?:\/\//, '').split(/[/?]/)[0], path: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60), status: res.status, ms });
        return res;
      } catch (e: any) {
        logEvent('net_fail', { host: url.replace(/^https?:\/\//, '').split(/[/?]/)[0], ms: Date.now() - t0, msg: String(e?.message || e).slice(0, 120) });
        throw e;
      }
    };
  }

  AppState.addEventListener('change', (s) => { if (s !== 'active') flush(); });
  logEvent('app_start', { coldMs: Math.round((globalThis as any).performance?.now?.() ?? 0) });
}

/** Screen timing: call on route change; logs screens that take long to settle. */
let lastRoute = '';
let routeAt = 0;
export function trackScreen(route: string) {
  const now = Date.now();
  if (lastRoute) {
    const stay = now - routeAt;
    if (stay < 250) logEvent('screen_bounce', { from: lastRoute, to: route, ms: stay });
  }
  lastRoute = route; routeAt = now;
  logEvent('screen', { route });
  // Frame-lag probe: if the JS thread is blocked after navigating, report it.
  const t0 = Date.now();
  setTimeout(() => { const lag = Date.now() - t0 - 50; if (lag > 300) logEvent('slow_screen', { route, lagMs: lag }); }, 50);
}
