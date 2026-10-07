/**
 * Sadhak notifications
 * - Three gentle moments a day (morning, midday, evening) in the app language
 * - Timely alerts: festivals (and the evening before big ones), Ekadashi,
 *   grahan with sutak, grooming notes
 * - Quiet hours respected
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { calculatePanchang } from './panchang';
import { lunarFestivalsOn, getFixedFestivals } from './festivals';
import { getDailyGroomingAdvice } from './groomingRules';
import { eclipsesInMonth } from './eclipses';
import { MOMENTS, MOMENT_ROUTE, KIND, alertCopy, notifLang, type NLang } from './notifCopy';

// Configure notification handler.
// SDK 53+ splits the old `shouldShowAlert` into `shouldShowBanner` +
// `shouldShowList`; both are required or foreground notifications won't render.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true, // back-compat for older runtimes
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }) as any,
});

// ─── Copy ────────────────────────────────────────────────────────────
// Three moments a day in the app language, never the same one twice in a row.
async function appLang(): Promise<NLang> {
  try { return notifLang(await AsyncStorage.getItem('language')); } catch { return 'en'; }
}

type Slot = 'morning' | 'midday' | 'evening';
const SLOT_TIME: Record<Slot, [number, number]> = { morning: [6, 40], midday: [12, 50], evening: [19, 10] };

async function pickMoment(slot: Slot, lang: NLang): Promise<{ title: string; body: string; route?: string }> {
  const pool = MOMENTS[slot];
  const key = `sadhak_notif_seen_${slot}`;
  let seen: number[] = [];
  try { seen = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
  let free = pool.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!free.length) { seen = seen.slice(-1); free = pool.map((_, i) => i).filter((i) => !seen.includes(i)); }
  const i = free[Math.floor(Math.random() * free.length)];
  await AsyncStorage.setItem(key, JSON.stringify([...seen, i])).catch(() => {});
  const t = pool[i];
  return { ...t[lang], route: MOMENT_ROUTE[t.en.title] };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Set Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sadhak-spiritual', {
      name: 'Spiritual Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C2410C',
      sound: 'default',
      description: 'Hourly spiritual wisdom, mantras, and Hindu facts',
    });
    
    await Notifications.setNotificationChannelAsync('sadhak-festivals', {
      name: 'Festival Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FFD700',
      sound: 'default',
      description: 'Festival and religious observance reminders',
    });
  }

  return true;
}

// ─── USER PREFERENCES ────────────────────────────────────────────────
// Mirrors the Settings switches (stored on the Firestore profile) locally so
// the scheduler can honour them at app start without waiting on the network.
export interface NotificationPrefs {
  spiritual: boolean;
  grooming: boolean;
  festival: boolean;
  ekadashi: boolean;
  quietStart: number; // hour 0-23, hourly reminders pause from here…
  quietEnd: number;   // …until here
  lat: number;
  lng: number;
  gender: 'male' | 'female';
  marriageStatus: 'married' | 'unmarried' | 'widowed';
}

const PREFS_KEY = 'sadhak_notif_prefs';
const DEFAULT_PREFS: NotificationPrefs = {
  spiritual: true, grooming: true, festival: true, ekadashi: true,
  quietStart: 22, quietEnd: 6, lat: 28.6139, lng: 77.209, gender: 'male', marriageStatus: 'unmarried',
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Build prefs from the profile (settings + location + gender). */
export function prefsFromProfile(profile: any): NotificationPrefs {
  const st = profile?.settings || {};
  return {
    spiritual: st.notifications !== false,
    grooming: st.groomingReminders !== false,
    festival: st.festivalReminders !== false,
    ekadashi: st.ekadashiReminders !== false,
    quietStart: DEFAULT_PREFS.quietStart,
    quietEnd: DEFAULT_PREFS.quietEnd,
    lat: profile?.location?.lat || DEFAULT_PREFS.lat,
    lng: profile?.location?.lng || DEFAULT_PREFS.lng,
    gender: profile?.gender || DEFAULT_PREFS.gender,
    marriageStatus: profile?.marriageStatus || DEFAULT_PREFS.marriageStatus,
  };
}

/** Save prefs and reschedule if anything relevant changed. */
export async function applyNotificationPrefs(next: NotificationPrefs): Promise<void> {
  const prev = await getNotificationPrefs();
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  if (JSON.stringify(prev) === JSON.stringify(next)) return;
  await scheduleHourlyNotifications();
  await scheduleObservanceAlerts();
}

// App start, Settings changes and profile sync can all trigger a reschedule at
// once; run them one at a time so two cancel+schedule passes never interleave
// (which would leave duplicate notifications behind).
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export function scheduleHourlyNotifications(): Promise<void> { return serial(scheduleHourlyNow); }
export function scheduleObservanceAlerts(): Promise<void> { return serial(scheduleObservanceNow); }

const inQuietHours = (hr: number, p: NotificationPrefs) =>
  p.quietStart > p.quietEnd ? hr >= p.quietStart || hr < p.quietEnd : hr >= p.quietStart && hr < p.quietEnd;

async function cancelByType(type: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => (n.content?.data as any)?.type === type)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

// Schedule hourly notifications (up to 64 — Android limit)
async function scheduleHourlyNow(): Promise<void> {
  // Cancel ONLY the previous batch. cancelAll would also wipe the user's own
  // calendar/notes reminders and the daily Jyotish reminder.
  await cancelByType('spiritual_reminder');

  const prefs = await getNotificationPrefs();
  const now = new Date();
  // Turned off in Settings: nothing to schedule, but remember we checked.
  if (!prefs.spiritual) { await AsyncStorage.setItem('lastNotifSchedule', now.toISOString()); return; }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Three gentle moments a day for the next three days (a few minutes of
  // jitter so it never feels robotic), skipping quiet hours.
  const lang = await appLang();
  for (let d = 0; d < 3; d++) {
    for (const slot of ['morning', 'midday', 'evening'] as Slot[]) {
      const [h, m] = SLOT_TIME[slot];
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m + Math.floor(Math.random() * 12), 0);
      if (at.getTime() <= now.getTime() + 60_000 || inQuietHours(at.getHours(), prefs)) continue;
      const note = await pickMoment(slot, lang);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: note.title,
          body: note.body,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'sadhak-spiritual' } : {}),
          data: { type: 'spiritual_reminder', ...(note.route ? { route: note.route } : {}) },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      }).catch(() => {});
    }
  }

  await AsyncStorage.setItem('lastNotifSchedule', now.toISOString());
}

// ── Daily personalised astrology reminder (user-set time) ──
const ASTRO_REMINDER_KEY = 'sadhak_astro_reminder'; // stores "HH:MM" or absent

export async function scheduleDailyAstroReminder(hour: number, minute: number): Promise<void> {
  const ok = await requestNotificationPermissions();
  if (!ok) throw new Error('Notifications are turned off for Sadhak. Enable them in system settings.');
  await Notifications.cancelScheduledNotificationAsync('astro-daily').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'astro-daily',
    content: {
      title: '🔮 Your daily Jyotish guidance',
      body: "Today's reading from your chart is ready — tap to see what's favourable and what to avoid.",
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'sadhak-spiritual' } : {}),
      data: { type: 'astro_daily', route: '/jyotish' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } as any,
  });
  await AsyncStorage.setItem(ASTRO_REMINDER_KEY, `${hour}:${minute}`);
}

export async function cancelDailyAstroReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('astro-daily').catch(() => {});
  await AsyncStorage.removeItem(ASTRO_REMINDER_KEY);
}

export async function getAstroReminder(): Promise<{ hour: number; minute: number } | null> {
  const v = await AsyncStorage.getItem(ASTRO_REMINDER_KEY);
  if (!v) return null;
  const [h, m] = v.split(':').map(Number);
  return { hour: h, minute: m };
}

// Make sure the daily astro reminder is still scheduled (e.g. after an app
// update or the OS clearing alarms). Idempotent: reschedules the same id.
async function reapplyAstroReminder(): Promise<void> {
  const r = await getAstroReminder();
  if (r) { try { await scheduleDailyAstroReminder(r.hour, r.minute); } catch {} }
}

// ── Morning alerts for festivals, Ekadashi and grooming-restricted days ──
// One combined notification at 6:30 AM on each relevant day (next 21 days),
// computed from the same panchang + festival data the calendar uses.
const OBSERVANCE_DAYS = 21;

async function scheduleObservanceNow(): Promise<void> {
  await cancelByType('observance');
  const prefs = await getNotificationPrefs();
  if (!prefs.festival && !prefs.ekadashi && !prefs.grooming) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const lang = await appLang();
  const name = (f: { name: string; nameHi: string }) => (lang === 'hi' && f.nameHi ? f.nameHi : f.name);
  const desc = (f: { description: string; descriptionHi: string }) => (lang === 'hi' && f.descriptionHi ? f.descriptionHi : f.description);
  const hm = (d: Date) => d.toLocaleTimeString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'bn-IN', { hour: 'numeric', minute: '2-digit' });
  const now = new Date();
  const put = async (date: Date, note: { title: string; body: string }, route = '/(tabs)/calendar') => {
    if (date.getTime() <= now.getTime() + 60_000) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: note.title,
        body: note.body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'sadhak-festivals' } : {}),
        data: { type: 'observance', route },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    }).catch(() => {});
  };

  for (let i = 0; i < OBSERVANCE_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 6, 30, 0);
    const eve = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 19, 30, 0);
    let p;
    try { p = calculatePanchang(day, prefs.lat, prefs.lng); } catch { continue; }

    let morning: { title: string; body: string } | null = null;
    const extra: string[] = [];
    if (prefs.festival) {
      const fests = [
        ...lunarFestivalsOn(day, prefs.lat, prefs.lng),
        ...getFixedFestivals(day.getMonth() + 1, day.getDate()),
      ].filter((f) => f.type === 'major' || f.type === 'minor' || f.type === 'sankranti');
      if (fests.length) {
        const f = fests[0];
        morning = alertCopy('festDay', lang, { name: fests.map(name).join(' · '), desc: desc(f) });
        // Big festivals also get a heads-up the evening before.
        if (f.type === 'major') await put(eve, alertCopy('festEve', lang, { name: name(f), desc: desc(f) }));
      }
    }
    const isEkadashi = (p.tithi.name || '').toLowerCase().includes('ekadashi');
    if (prefs.ekadashi && isEkadashi) {
      if (!morning) morning = alertCopy('ekDay', lang);
      else extra.push(alertCopy('ekDay', lang).body);
      await put(eve, alertCopy('ekEve', lang));
    }
    if (prefs.grooming) {
      const g = getDailyGroomingAdvice(day, prefs.gender, prefs.marriageStatus, p.tithi.name);
      if (g.overallStatus === 'forbidden') {
        if (!morning) morning = alertCopy('grooming', lang);
        else extra.push(alertCopy('grooming', lang).body);
      }
    }
    if (morning) await put(day, { title: morning.title, body: [morning.body, ...extra].join(' ') });
  }

  // Grahan visible from home: a note when sutak starts and 30 minutes before.
  if (prefs.festival) {
    const until = now.getTime() + OBSERVANCE_DAYS * 86400_000;
    const months = [0, 1].map((k) => new Date(now.getFullYear(), now.getMonth() + k, 1));
    for (const m of months) {
      for (const g of eclipsesInMonth(m.getFullYear(), m.getMonth(), prefs.lat, prefs.lng)) {
        if (!g.visible || g.start.getTime() > until) continue;
        const v = { kind: KIND[lang][g.kind], start: hm(g.start), end: hm(g.end), time: g.sutak ? hm(g.sutak) : '' };
        if (g.sutak) await put(g.sutak, alertCopy('sutak', lang, v));
        await put(new Date(g.start.getTime() - 30 * 60_000), alertCopy('grahan', lang, v));
      }
    }
  }
}

// Re-schedule if needed (call on app open)
export async function ensureNotificationsScheduled(): Promise<void> {
  try {
    let lastSchedule = await AsyncStorage.getItem('lastNotifSchedule');
    // 1.17 replaced the hourly reminders with three a day: redo the old batch once.
    if ((await AsyncStorage.getItem('sadhak_notif_v')) !== '2') { lastSchedule = null; await AsyncStorage.setItem('sadhak_notif_v', '2'); }
    if (!lastSchedule) {
      await scheduleHourlyNotifications();
      await scheduleObservanceAlerts();
      await reapplyAstroReminder();
      return;
    }

    const lastDate = new Date(lastSchedule);
    const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);

    // Re-schedule if more than 24 hours since last schedule
    if (hoursSince > 24) {
      await scheduleHourlyNotifications();
      await scheduleObservanceAlerts();
      await reapplyAstroReminder();
    }
  } catch (e) {
    console.error('Notification scheduling error:', e);
    await scheduleHourlyNotifications();
    await reapplyAstroReminder();
  }
}

// Send an immediate test notification
export async function sendTestNotification(): Promise<void> {
  const note = await pickMoment('morning', await appLang());
  await Notifications.scheduleNotificationAsync({
    content: { title: note.title, body: note.body, sound: 'default', ...(Platform.OS === 'android' ? { channelId: 'sadhak-spiritual' } : {}), data: { type: 'test', ...(note.route ? { route: note.route } : {}) } },
    trigger: null,
  });
}

// Send festival notification
export async function sendFestivalNotification(festivalName: string, message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🪔 ${festivalName}`,
      body: message,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: 'sadhak-festivals' } : {}),
    },
    trigger: null,
  });
}
