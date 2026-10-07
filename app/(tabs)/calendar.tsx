import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, InteractionManager, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { eclipsesInMonth, type Grahan } from '../../services/eclipses';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { holidaysOn, isPublicHoliday, type Holiday } from '../../constants/holidays';
import { REGIONS, defaultRegion, solarMonthDays, lunarMonth, regionalFestivals, type Region, type RegionalDay, type RegionalFest } from '../../services/regional';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialog } from '../../contexts/DialogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { calculatePanchang } from '../../services/panchang';
import { getDailyGroomingAdvice, getGroomingStatusColor, type GroomingStatus } from '../../services/groomingRules';
import { lunarFestivalsOn, getFixedFestivals, type Festival } from '../../services/festivals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLayoutInsets } from '../../constants/layout';
import { AppBar, Icon } from '../../components/ui';

const GRID_PAD = 10;
// Percent width, not a pixel guess from the screen width: the old math assumed
// 16px side padding (the screen uses 20 + a border), so 7 cells overflowed,
// the row wrapped after 6 and every date landed under the wrong weekday.
const CELL = `${100 / 7}%` as const;
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const NOTES_KEY = 'sadhak_calendar_notes';
const REMINDERS_KEY = 'sadhak_calendar_reminders';

// Reminder time presets — devotional day anchors, not an arbitrary 6 AM.
const TIME_PRESETS = [
  { label: 'Brahma Muhurta', time: '04:30', icon: 'weather-night' },
  { label: 'Sunrise', time: '06:00', icon: 'weather-sunset-up' },
  { label: 'Morning', time: '08:00', icon: 'white-balance-sunny' },
  { label: 'Noon', time: '12:00', icon: 'sun-wireless-outline' },
  { label: 'Evening', time: '18:00', icon: 'weather-sunset-down' },
  { label: 'Night', time: '21:00', icon: 'moon-waning-crescent' },
];
const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface DayInfo {
  status: GroomingStatus;
  isPurnima: boolean;
  isAmavasya: boolean;
  isEkadashi: boolean;
  festivals: Festival[];
  holidays: Holiday[];
  regional?: RegionalDay;
  regionalFests: RegionalFest[];
  tithiNo: number;
  paksha: 'shukla' | 'krishna';
  month: { en: string; hi: string };
  grahan: Grahan[];
}

type MonthCtx = { lat: number; lon: number; gender: string; marriage: string; region: Region; language: string; solar: boolean };

// Month data is heavy (a panchang per day), so each month is built once and
// kept; the pager builds the neighbours while you look at the current one.
const MONTH_CACHE = new Map<string, Record<number, DayInfo>>();
const monthKey = (y: number, m: number, c: MonthCtx) => `${y}-${m}|${c.lat.toFixed(2)},${c.lon.toFixed(2)}|${c.gender}|${c.marriage}|${c.region}|${c.language}`;
function buildMonthInfo(year: number, month: number, c: MonthCtx): Record<number, DayInfo> {
  const key = monthKey(year, month, c);
  const hit = MONTH_CACHE.get(key);
  if (hit) return hit;
  const map: Record<number, DayInfo> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let solar: Record<number, RegionalDay> = {};
  try { solar = c.solar ? solarMonthDays(year, month, c.region, c.lat, c.lon, c.language) : {}; } catch {}
  let eclipses: Grahan[] = [];
  try { eclipses = eclipsesInMonth(year, month, c.lat, c.lon); } catch {}
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const grahan = eclipses.filter((g) => g.peak.getDate() === d);
    try {
      const p = calculatePanchang(date, c.lat, c.lon);
      const g = getDailyGroomingAdvice(date, c.gender as any, c.marriage as any, p.tithi.name);
      const tn = (p.tithi.name || '').toLowerCase();
      // Only day-precise festivals mark the grid: an entry must carry a tithi
      // (or be a fixed Gregorian date).
      const dayFestivals = [
        ...lunarFestivalsOn(date, c.lat, c.lon),
        ...getFixedFestivals(month + 1, d),
      ].filter(f => f.type === 'major' || f.type === 'minor' || f.type === 'sankranti');
      map[d] = {
        status: g.overallStatus,
        isPurnima: tn.includes('purnima'),
        isAmavasya: tn.includes('amavasya'),
        isEkadashi: tn.includes('ekadashi'),
        festivals: dayFestivals,
        holidays: holidaysOn(date),
        regional: solar[d],
        regionalFests: (() => { try { return regionalFestivals(c.region, date, c.lat, c.lon, solar[d]); } catch { return []; } })(),
        tithiNo: ((p.tithi.number - 1) % 15) + 1,
        paksha: p.tithi.paksha,
        month: lunarMonth(c.region, p.hinduMonth.name, p.tithi.paksha),
        grahan,
      };
    } catch {
      map[d] = { status: 'allowed', isPurnima: false, isAmavasya: false, isEkadashi: false, festivals: [], holidays: holidaysOn(date), regionalFests: [], tithiNo: 0, paksha: 'shukla', month: { en: '', hi: '' }, grahan };
    }
  }
  if (MONTH_CACHE.size > 24) MONTH_CACHE.delete(MONTH_CACHE.keys().next().value as string);
  MONTH_CACHE.set(key, map);
  return map;
}

const ROW_H = 54;
const CELL_PX = (w: number) => w / 7;
const dKey = (y: number, m: number, d: number) => `${y}-${m + 1}-${d}`;

type GridColors = { text: string; textTertiary: string; primary: string; festival: string; info: string; purnima: string; ekadashi: string; amavasya: string; kumkum: string; saffron: string; grahan: string };

/** One month of the pager: six fixed rows so every page has the same height. */
const MonthPage = memo(function MonthPage({ year, month, width, ctx, selected, today, notes, onSelect, c }: {
  year: number; month: number; width: number; ctx: MonthCtx; selected: string; today: string;
  notes: Record<string, string>; onSelect: (d: Date) => void; c: GridColors;
}) {
  const key = monthKey(year, month, ctx);
  const [info, setInfo] = useState<Record<number, DayInfo> | undefined>(() => MONTH_CACHE.get(key));
  useEffect(() => {
    if (MONTH_CACHE.get(key)) { setInfo(MONTH_CACHE.get(key)); return; }
    const task = InteractionManager.runAfterInteractions(() => setInfo(buildMonthInfo(year, month, ctx)));
    return () => task.cancel();
  }, [key]);
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cw = CELL_PX(width);
  const cells = Array.from({ length: 42 }, (_, i) => i - first + 1);
  return (
    <View style={{ width, flexDirection: 'row', flexWrap: 'wrap' }}>
      {cells.map((d, i) => {
        if (d < 1 || d > days) {
          const other = new Date(year, month, d);
          return (
            <View key={i} style={{ width: cw, height: ROW_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: c.textTertiary, opacity: 0.3 }}>{other.getDate()}</Text>
            </View>
          );
        }
        const k = dKey(year, month, d);
        const it = info?.[d];
        const isSel = k === selected;
        const isToday = k === today;
        const sunday = (i % 7) === 0;
        const holiday = !!it?.holidays.some(isPublicHoliday);
        const dots: string[] = [];
        if (it) {
          if (it.festivals.length || it.regionalFests.length) dots.push(it.regionalFests.length ? c.saffron : c.kumkum);
          if (it.grahan.some((g) => g.visible)) dots.push(c.grahan);
          if (it.isEkadashi) dots.push(c.ekadashi);
          if (it.isPurnima) dots.push(c.purnima);
          if (it.isAmavasya) dots.push(c.amavasya);
          if (holiday) dots.push(c.info);
        }
        const firstOfRegional = it?.regional?.day === 1;
        return (
          <TouchableOpacity key={i} activeOpacity={0.6} onPress={() => onSelect(new Date(year, month, d))}
            style={{ width: cw, height: ROW_H, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={`${d}${it?.festivals.length ? ', ' + it.festivals.map((f) => f.name).join(', ') : ''}`}>
            <View style={[cs.dateCircle, isToday && { backgroundColor: c.primary }, isSel && !isToday && { borderWidth: 2, borderColor: c.primary }]}>
              <Text style={[cs.date, { color: isToday ? '#FFF' : sunday || holiday ? c.festival : c.text }, (isSel || isToday) && { fontWeight: '800' }]}>{d}</Text>
            </View>
            <View style={cs.dotRow}>
              {firstOfRegional
                ? <Text style={[cs.regional, { color: c.primary }]} numberOfLines={1}>{it!.regional!.monthName.slice(0, 4)}</Text>
                : dots.slice(0, 3).map((col, j) => <View key={j} style={[cs.dot, { backgroundColor: col }]} />)}
              {!!notes[k] && !firstOfRegional && <View style={[cs.dot, { backgroundColor: c.textTertiary, width: 4, height: 4 }]} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const cs = StyleSheet.create({
  dateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  date: { fontSize: 15, fontWeight: '600' },
  dotRow: { height: 9, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  regional: { fontSize: 8.5, fontWeight: '800' },
});

// Month pager: pages are indexed by months since year 0.
const PAGE_SPAN = 120;

const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function fmt12(h: number, m: number): string {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function CalendarScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t, tf, locale, noTrack, display, tx, native, pick, language } = useLanguage();
  const { tones } = useTheme();
  // Weekday/month names in the chosen language (1 Jan 2023 was a Sunday).
  const dayNames = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })), [locale]);
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2023, i, 1).toLocaleDateString(locale, { month: 'long' })), [locale]);
  const monthShort = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2023, i, 1).toLocaleDateString(locale, { month: 'short' })), [locale]);
  const { headerPaddingTop, tabContentPadding, bottomInset, insets } = useLayoutInsets();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<Record<string, { id: string; time: string }>>({});
  const [reminderSheet, setReminderSheet] = useState(false);
  const [remHour, setRemHour] = useState(7);
  const [remMinute, setRemMinute] = useState(0);
  const [groomOpen, setGroomOpen] = useState(false);
  // Regional calendar (Bengali, Tamil, Amanta …), remembered per device.
  const [region, setRegionState] = useState<Region>(() => defaultRegion(language));
  const [regionSheet, setRegionSheet] = useState(false);
  // A region the user picked sticks; otherwise follow the app language.
  useEffect(() => {
    AsyncStorage.getItem('sadhak_calendar_region').then((v) => {
      if (v && REGIONS.some((r) => r.key === v)) setRegionState(v as Region);
      else setRegionState(defaultRegion(language));
    }).catch(() => {});
  }, [language]);
  const setRegion = (r: Region) => { setRegionState(r); AsyncStorage.setItem('sadhak_calendar_region', r).catch(() => {}); };
  const regionInfo = REGIONS.find((r) => r.key === region)!;
  const holidayName = (h: Holiday) => (language === 'hi' || language === 'mr' ? h.hi : language === 'bn' || language === 'as' ? h.bn : h.name);
  const [showClock, setShowClock] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lat = profile?.location?.lat || 28.6139;
  const lon = profile?.location?.lng || 77.209;

  useEffect(() => {
    (async () => {
      try {
        const n = await AsyncStorage.getItem(NOTES_KEY);
        if (n) setNotes(JSON.parse(n));
        const r = await AsyncStorage.getItem(REMINDERS_KEY);
        if (r) setReminders(JSON.parse(r));
      } catch {}
    })();
  }, []);

  const saveNotes = async (updated: Record<string, string>) => {
    setNotes(updated);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };
  const saveReminders = async (updated: Record<string, { id: string; time: string }>) => {
    setReminders(updated);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: { day: number; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, isCurrentMonth: true });
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, isCurrentMonth: false });
    return days;
  }, [year, month]);

  const ctx: MonthCtx = useMemo(() => ({ lat, lon, gender: profile?.gender || 'male', marriage: profile?.marriageStatus || 'unmarried', region, language, solar: !!regionInfo.solar }),
    [lat, lon, profile?.gender, profile?.marriageStatus, region, language, regionInfo.solar]);
  const monthInfo = useMemo(() => buildMonthInfo(year, month, ctx), [year, month, ctx]);

  // Festivals, fasts and holidays of the visible month, in date order.
  const monthAgenda = useMemo(() => {
    const out: { key: string; day: number; title: string; sub?: string; tone: { bg: string; fg: string } }[] = [];
    Object.entries(monthInfo).forEach(([d, i]) => {
      const day = Number(d);
      i.regionalFests.forEach((f) => out.push({ key: `r${d}${f.name}`, day, title: language === 'bn' || language === 'as' ? (f.bn || native(f.name, f.hi)) : native(f.name, f.hi), sub: tx(f.note), tone: tones.saffron }));
      i.grahan.forEach((g, gi) => out.push({
        key: `g${d}${gi}`, day,
        title: tx(g.kind === 'solar' ? 'Surya grahan (solar eclipse)' : 'Chandra grahan (lunar eclipse)'),
        sub: g.visible ? `${hm(g.start)} – ${hm(g.end)}${g.sutak ? ` · ${tx('Sutak from')} ${hm(g.sutak)}` : ''}` : tx('Not visible from your place'),
        tone: { bg: colors.grahanBg, fg: colors.grahan },
      }));
      i.festivals.forEach((f) => out.push({ key: `f${d}${f.id}`, day, title: native(f.name, f.nameHi), sub: f.fasting ? tx('Fast') : undefined, tone: tones.kumkum }));
      if (i.isEkadashi && !i.festivals.some((f) => /ekadashi/i.test(f.name))) out.push({ key: `e${d}`, day, title: native('Ekadashi', 'एकादशी'), sub: tx('Fast'), tone: tones.plum });
      if (i.isPurnima && !i.festivals.some((f) => /purnima/i.test(f.name))) out.push({ key: `p${d}`, day, title: native('Purnima', 'पूर्णिमा'), tone: tones.haldi });
      if (i.isAmavasya && !i.festivals.some((f) => /amavasya/i.test(f.name))) out.push({ key: `a${d}`, day, title: native('Amavasya', 'अमावस्या'), tone: tones.neel });
      // A holiday that is the same event as a festival (Dussehra, Diwali) tags
      // the festival instead of adding a second row.
      const stem = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
      i.holidays.filter(isPublicHoliday).forEach((h) => {
        const f = i.festivals.find((x) => stem(x.name) === stem(h.name));
        const same = f && out.find((o) => o.key === `f${d}${f.id}`);
        if (same) same.sub = [same.sub, tx('Public holiday')].filter(Boolean).join(' · ');
        else out.push({ key: `h${d}${h.name}`, day, title: holidayName(h), sub: tx('Public holiday'), tone: tones.neel });
      });
    });
    return out.sort((a, b) => a.day - b.day);
  }, [monthInfo, native, tx, language, tones]);

  // Regional months this Gregorian month spans, e.g. "Ashwin – Kartik 1433".
  const monthSpan = useMemo(() => {
    const names: string[] = [];
    Object.values(monthInfo).forEach((i) => {
      const n = i.regional ? i.regional.monthName : native(i.month.en, i.month.hi);
      if (n && !names.includes(n)) names.push(n);
    });
    const yr = Object.values(monthInfo).map((i) => i.regional?.year).filter(Boolean).pop();
    return `${names.join(' – ')}${yr ? ` ${yr}` : ''} · ${language === 'bn' || language === 'as' ? regionInfo.native : tx(regionInfo.label)}`;
  }, [monthInfo, native, language, regionInfo, tx]);

  const selectedPanchang = useMemo(
    () => calculatePanchang(selectedDate, lat, lon),
    [selectedDate.toDateString(), lat, lon],
  );
  const selectedGrooming = useMemo(
    () => getDailyGroomingAdvice(selectedDate, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', selectedPanchang?.tithi.name),
    [selectedDate.toDateString(), selectedPanchang?.tithi.name],
  );
  const selectedInfo: DayInfo | undefined =
    selectedDate.getFullYear() === year && selectedDate.getMonth() === month
      ? monthInfo[selectedDate.getDate()]
      : undefined;

  const getDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };
  const isSelected = (day: number) =>
    day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  // ── Month pager: follows the finger, snaps to a month, native scrolling ──
  const nowIdx = useMemo(() => { const n = new Date(); return n.getFullYear() * 12 + n.getMonth(); }, []);
  const pages = useMemo(() => Array.from({ length: PAGE_SPAN * 2 + 1 }, (_, i) => nowIdx - PAGE_SPAN + i), [nowIdx]);
  const pagerRef = useRef<FlatList<number>>(null);
  const [pageW, setPageW] = useState(0);
  const curIdx = year * 12 + month;
  const lastScrolled = useRef(curIdx);
  useEffect(() => {
    // Arrows, Today and the month picker move the pager too.
    if (!pageW || lastScrolled.current === curIdx) return;
    lastScrolled.current = curIdx;
    const i = curIdx - (nowIdx - PAGE_SPAN);
    if (i >= 0 && i < pages.length) pagerRef.current?.scrollToIndex({ index: i, animated: true });
  }, [curIdx, pageW]);
  const onPageEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageW) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
    const idx = pages[i];
    if (idx == null || idx === curIdx) return;
    lastScrolled.current = idx;
    setCurrentDate(new Date(Math.floor(idx / 12), idx % 12, 1));
  };
  // Build next and previous months in the background so swiping never waits.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      buildMonthInfo(month === 11 ? year + 1 : year, (month + 1) % 12, ctx);
      buildMonthInfo(month === 0 ? year - 1 : year, (month + 11) % 12, ctx);
    });
    return () => task.cancel();
  }, [year, month, ctx]);
  const shiftMonth = (dir: 1 | -1) => setCurrentDate((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  const goToPrevMonth = () => shiftMonth(-1);
  const goToNextMonth = () => shiftMonth(1);
  const todayKey = useMemo(() => { const n = new Date(); return dKey(n.getFullYear(), n.getMonth(), n.getDate()); }, []);
  const selKey = dKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const gridColors: GridColors = useMemo(() => ({
    text: colors.text, textTertiary: colors.textTertiary, primary: colors.primary, festival: colors.festival, info: colors.info,
    purnima: colors.purnima, ekadashi: colors.ekadashi, amavasya: colors.amavasya, kumkum: tones.kumkum.fg, saffron: tones.saffron.fg, grahan: colors.grahan,
  }), [colors, tones]);
  const onSelectDay = useCallback((d: Date) => setSelectedDate(d), []);
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const addNote = () => {
    if (!noteText.trim()) return;
    const key = getDateKey(selectedDate);
    saveNotes({ ...notes, [key]: noteText.trim() });
    setNoteText('');
    setNoteModal(false);
  };

  const deleteNote = () => {
    const key = getDateKey(selectedDate);
    dialog.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const updated = { ...notes };
        delete updated[key];
        saveNotes(updated);
      }},
    ]);
  };

  // ─── Reminders: real time selection, schedule, cancel ────────────────────
  const selectedDateKey = getDateKey(selectedDate);
  const existingReminder = reminders[selectedDateKey];

  const openReminderSheet = () => setReminderSheet(true);

  const cancelReminder = async () => {
    try {
      if (existingReminder?.id) await Notifications.cancelScheduledNotificationAsync(existingReminder.id);
    } catch {}
    const updated = { ...reminders };
    delete updated[selectedDateKey];
    saveReminders(updated);
  };

  const scheduleAt = async (target: Date) => {
    try {
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        dialog.alert('Notifications off', 'Please allow notifications so reminders can reach you.', undefined, { tone: 'warning' });
        return;
      }
      if (target.getTime() <= Date.now()) {
        dialog.alert('Time has passed', 'Pick a future time for this reminder.', undefined, { tone: 'warning' });
        return;
      }
      if (existingReminder?.id) {
        try { await Notifications.cancelScheduledNotificationAsync(existingReminder.id); } catch {}
      }
      const dateLabel = selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
      const note = notes[selectedDateKey];
      const what = [...(selectedInfo?.festivals || []).map((f) => native(f.name, f.nameHi)), ...(selectedInfo?.holidays || []).map(holidayName)].join(', ');
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: what ? `🙏 ${what}` : '🙏 Sadhak',
          body: [dateLabel, note].filter(Boolean).join(' · '),
          sound: true,
          data: { route: '/(tabs)/calendar' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target, channelId: 'sadhak-spiritual' },
      });
      const sameDay = target.toDateString() === selectedDate.toDateString();
      const label = `${sameDay ? '' : target.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + ', '}${fmt12(target.getHours(), target.getMinutes())}`;
      saveReminders({ ...reminders, [selectedDateKey]: { id, time: label } });
      setReminderSheet(false);
      dialog.alert('Reminder set', label, undefined, { tone: 'success' });
    } catch {
      dialog.alert('Error', 'Could not set the reminder. Please try again.');
    }
  };

  // Sensible reminder moments for the selected day (only future ones).
  const reminderPresets = useMemo(() => {
    const d = selectedDate;
    const at = (dayOffset: number, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, m, 0);
    const [sh, sm] = (selectedPanchang?.sunrise || '06:00').split(':').map(Number);
    return [
      { key: 'eve', label: tx('Evening before'), icon: 'weather-sunset-down', date: at(-1, 19, 0) },
      { key: 'rise', label: tx('At sunrise'), icon: 'weather-sunset-up', date: at(0, sh, sm) },
      { key: 'morn', label: tx('Morning'), icon: 'white-balance-sunny', date: at(0, 8, 0) },
      { key: 'eve0', label: tx('Evening'), icon: 'weather-night', date: at(0, 18, 0) },
    ].filter((p) => p.date.getTime() > Date.now());
  }, [selectedDate.toDateString(), selectedPanchang?.sunrise, tx]);


  // Times for the selected day: muhurtas, tithi and nakshatra changes, sun and moon, grahan.
  const isSelToday = selectedDate.toDateString() === new Date().toDateString();
  const dayTimeline = useMemo(() => {
    const p = selectedPanchang;
    const at = (hhmm?: string, nextDay = false) => {
      if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
      const [h, m] = hhmm.split(':').map(Number);
      return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + (nextDay ? 1 : 0), h, m);
    };
    const rise = at(p.sunrise);
    const list: { at: Date; end?: Date; label: string; color?: string }[] = [];
    const push = (a: Date | null, label: string, color?: string, end?: Date | null) => { if (a) list.push({ at: a, end: end || undefined, label, color }); };
    push(at(p.brahmaMuhurta.start), t('mu.brahma'), colors.success, at(p.brahmaMuhurta.end));
    push(rise, t('ui.sunrise'), tones.saffron.fg);
    push(at(p.yamaghanta.start), t('mu.yama'), colors.festival, at(p.yamaghanta.end));
    push(at(p.gulikaKaal.start), t('mu.gulika'), colors.festival, at(p.gulikaKaal.end));
    push(at(p.abhijitMuhurta.start), t('mu.abhijit'), colors.success, at(p.abhijitMuhurta.end));
    push(at(p.rahuKaal.start), t('ui.rahuKaal'), colors.festival, at(p.rahuKaal.end));
    push(at(p.sunset), t('ui.sunset'), tones.plum.fg);
    if (p.moonrise && p.moonrise !== '--:--') push(at(p.moonrise), t('ui.moonrise'), tones.neel.fg);
    // A tithi or nakshatra that ends before sunrise ends on the next morning.
    const endAt = (hhmm: string) => { const d = at(hhmm); return d && rise && d < rise ? at(hhmm, true) : d; };
    const tEnd = p.tithi.endTime !== '--:--' ? endAt(p.tithi.endTime) : null;
    if (tEnd) push(tEnd, `${native(p.tithi.name, p.tithi.nameHi)} ${tx('ends')}`);
    const nEnd = p.nakshatra.endTime !== '--:--' ? endAt(p.nakshatra.endTime) : null;
    if (nEnd) push(nEnd, `${native(p.nakshatra.name, p.nakshatra.nameHi)} ${tx('ends')}`);
    (selectedInfo?.grahan || []).filter((g) => g.visible).forEach((g) => {
      if (g.sutak) push(g.sutak, tx('Sutak begins'), colors.grahan);
      push(g.start, tx(g.kind === 'solar' ? 'Surya grahan' : 'Chandra grahan'), colors.grahan, g.end);
    });
    return list.sort((x, y) => +x.at - +y.at);
  }, [selectedPanchang, selectedInfo, language, colors]);
  const nowIndex = isSelToday ? dayTimeline.findIndex((e) => e.at.getTime() > Date.now()) : -1;

  const groomingColor = getGroomingStatusColor(selectedGrooming.overallStatus);
  const hasNote = !!notes[selectedDateKey];
  const selFestivals = selectedInfo?.festivals || [];

  // Everything notable about the selected day, most important first.
  type DayEvent = { title: string; line?: string; tag?: string; icon: string; tone: { bg: string; fg: string } };
  const dayEvents: DayEvent[] = [];
  selFestivals.forEach((f) => dayEvents.push({
    title: native(f.name, f.nameHi),
    line: tx(f.description),
    tag: f.fasting ? tx('Fast') : f.type === 'major' ? tx('Festival') : undefined,
    icon: 'star-four-points', tone: tones.kumkum,
  }));
  (selectedInfo?.regionalFests || []).forEach((f) => dayEvents.unshift({
    title: language === 'bn' || language === 'as' ? (f.bn || native(f.name, f.hi)) : native(f.name, f.hi),
    line: tx(f.note), tag: tx(regionInfo.label), icon: 'star-four-points', tone: tones.saffron,
  }));
  (selectedInfo?.holidays || []).forEach((h) => dayEvents.push({
    title: holidayName(h),
    tag: h.kind === 'day' ? tx('Important day') : tx('Public holiday'),
    icon: h.kind === 'day' ? 'flag-outline' : 'flag', tone: tones.neel,
  }));
  (selectedInfo?.grahan || []).forEach((g) => dayEvents.unshift({
    title: tx(g.kind === 'solar' ? 'Surya grahan (solar eclipse)' : 'Chandra grahan (lunar eclipse)'),
    line: g.visible
      ? `${tx(g.type === 'total' ? 'Total' : g.type === 'annular' ? 'Annular' : g.type === 'partial' ? 'Partial' : 'Penumbral')}: ${hm(g.start)} – ${hm(g.end)}${g.sutak ? `. ${tx('Sutak from')} ${hm(g.sutak)}${g.sutak.getDate() !== g.start.getDate() ? ` (${g.sutak.toLocaleDateString(locale, { day: 'numeric', month: 'short' })})` : ''}.` : '.'}`
      : tx('Not visible from your place, so no sutak.'),
    tag: g.visible ? tx('Visible') : undefined,
    icon: g.kind === 'solar' ? 'weather-sunny-off' : 'moon-full', tone: { bg: colors.grahanBg, fg: colors.grahan },
  }));
  const covered = (n: string) => selFestivals.some((f) => f.name.toLowerCase().includes(n));
  if (selectedInfo?.isEkadashi && !covered('ekadashi')) dayEvents.push({ title: native('Ekadashi', 'एकादशी'), line: tx('Fasting day dedicated to Lord Vishnu.'), tag: tx('Fast'), icon: 'moon-waxing-crescent', tone: tones.plum });
  if (selectedInfo?.isPurnima && !covered('purnima')) dayEvents.push({ title: native('Purnima', 'पूर्णिमा'), line: tx('Full moon: Satyanarayan puja, charity and holy dips.'), icon: 'moon-full', tone: tones.haldi });
  if (selectedInfo?.isAmavasya && !covered('amavasya')) dayEvents.push({ title: native('Amavasya', 'अमावस्या'), line: tx('New moon: tarpan for ancestors and quiet prayer.'), icon: 'moon-new', tone: tones.neel });

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabContentPadding }}>

        {/* ═══ App bar: title, Today, language + theme ═══ */}
        <View style={{ paddingTop: headerPaddingTop }}>
          <AppBar
            title={t('f.calendar')}
            subtitle={monthSpan}
            right={
              <TouchableOpacity
                onPress={goToToday}
                style={[st.todayPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
                activeOpacity={0.8}
                accessibilityLabel={t('ui.today')}
              >
                <Icon name="calendar-dots" size={14} color={colors.primary} />
                <Text style={[st.todayPillText, { color: colors.primary }]}>{t('ui.today')}</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* ═══ Month navigator (subdued, not the hero) ═══ */}
        <View style={[st.monthRow, { marginTop: 0, marginHorizontal: 0 }]}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={[st.monthArrow, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}
            hitSlop={8}
          >
            <Icon name="caret-left" size={18} color={colors.text} weight="regular" />
          </TouchableOpacity>
          <TouchableOpacity style={st.monthCenter} onPress={() => setMonthPicker(true)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[st.monthText, { color: colors.text }, display]}>{monthNames[month]}</Text>
              <Icon name="caret-down" size={14} color={colors.textTertiary} weight="regular" />
            </View>
            <Text style={[st.yearText, { color: colors.textTertiary }]}>{year}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[st.monthArrow, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}
            hitSlop={8}
          >
            <Icon name="caret-right" size={18} color={colors.text} weight="regular" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setRegionSheet(true)} style={[st.regionChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} activeOpacity={0.8}>
          <Ionicons name="earth-outline" size={15} color={colors.primary} />
          <Text style={[st.regionText, { color: colors.text }]} numberOfLines={1}>{tx(regionInfo.label)} {tx('calendar')}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* ═══ Calendar grid: dates first, small dots for what's on ═══ */}
        <View style={[st.calendarCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={st.dayHeaders}>
            {dayNames.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={[st.dayHeaderText, { color: i === 0 ? colors.festival : colors.textTertiary }, noTrack]}>{d}</Text>
              </View>
            ))}
          </View>
          <View onLayout={(e) => setPageW(Math.floor(e.nativeEvent.layout.width))} style={{ height: ROW_H * 6 }}>
            {pageW > 0 && (
              <FlatList
                ref={pagerRef}
                data={pages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => String(i)}
                initialScrollIndex={curIdx - (nowIdx - PAGE_SPAN)}
                getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                onMomentumScrollEnd={onPageEnd}
                renderItem={({ item }) => (
                  <MonthPage year={Math.floor(item / 12)} month={item % 12} width={pageW} ctx={ctx}
                    selected={selKey} today={todayKey} notes={notes} onSelect={onSelectDay} c={gridColors} />
                )}
                extraData={`${selKey}|${Object.keys(notes).length}|${gridColors.text}`}
              />
            )}
          </View>

          <View style={[st.legend, { borderTopColor: colors.divider }]}>
            {[
              { col: tones.kumkum.fg, label: t('cal.festival') },
              { col: colors.ekadashi, label: t('cal.ekadashi') },
              { col: colors.purnima, label: t('cal.purnima') },
              { col: colors.amavasya, label: t('cal.amavasya') },
              { col: colors.grahan, label: 'Grahan' },
              { col: colors.info, label: 'Holiday' },
            ].map((item, idx) => (
              <View key={idx} style={st.legendItem}>
                <View style={[st.legendDot, { backgroundColor: item.col }]} />
                <Text style={[st.legendText, { color: colors.textTertiary }]}>{tx(item.label)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ Day card: what this day is, then timings and your notes ═══ */}
        <View style={[st.detailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={st.detailHeader}>
            <View style={[st.dateBlock, { backgroundColor: selFestivals.length ? tones.kumkum.bg : colors.surfaceSecondary }]}>
              <Text style={[st.dateBlockDay, { color: selFestivals.length ? tones.kumkum.fg : colors.text }]}>{selectedDate.getDate()}</Text>
              <Text style={[st.dateBlockMon, { color: selFestivals.length ? tones.kumkum.fg : colors.textSecondary }, noTrack]}>{selectedDate.toLocaleDateString(locale, { month: 'short' })}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.detailWeekday, { color: colors.primary }, noTrack]}>
                {selectedDate.toLocaleDateString(locale, { weekday: 'long' })}
              </Text>
              <Text style={[st.detailTithi, { color: colors.text }]} numberOfLines={1}>
                {native(selectedPanchang.tithi.name, selectedPanchang.tithi.nameHi)} · {native(selectedPanchang.nakshatra.name, selectedPanchang.nakshatra.nameHi)}
              </Text>
              <Text style={[st.detailSub, { color: colors.textTertiary }]} numberOfLines={1}>
                {selectedInfo?.regional ? `${selectedInfo.regional.label} · ` : ''}{native((selectedInfo?.month.en || selectedPanchang.hinduMonth.name), (selectedInfo?.month.hi || selectedPanchang.hinduMonth.nameHi))} {native(selectedPanchang.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna', selectedPanchang.tithi.pakshaHi)}
              </Text>
            </View>
          </View>

          {/* What's on: festivals, holidays, special tithis */}
          {dayEvents.length > 0 ? (
            <View style={st.events}>
              {dayEvents.map((e, i) => (
                <View key={i} style={[st.event, { backgroundColor: e.tone.bg }]}>
                  <View style={[st.eventIcon, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name={e.icon as any} size={18} color={e.tone.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[st.eventName, { color: colors.text }]}>{e.title}</Text>
                      {!!e.tag && (
                        <View style={[st.eventTag, { borderColor: e.tone.fg + '55' }]}>
                          <Text style={[st.eventTagText, { color: e.tone.fg }, noTrack]}>{e.tag}</Text>
                        </View>
                      )}
                    </View>
                    {!!e.line && <Text style={[st.eventLine, { color: colors.textSecondary }]}>{e.line}</Text>}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[st.quietDay, { color: colors.textTertiary }]}>{tx('No festival or holiday on this day.')}</Text>
          )}

          {/* Day timeline: everything that has a time, in order */}
          <View style={[st.timeline, { borderColor: colors.divider }]}>
            {dayTimeline.map((ev, i) => {
              const past = isSelToday && ev.at.getTime() < Date.now();
              const nowHere = isSelToday && i === nowIndex;
              return (
                <View key={i}>
                  {nowHere && (
                    <View style={st.nowLine}>
                      <View style={[st.nowDot, { backgroundColor: colors.primary }]} />
                      <View style={[st.nowRule, { backgroundColor: colors.primary }]} />
                      <Text style={{ color: colors.primary, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 }}>{tx('NOW')}</Text>
                    </View>
                  )}
                  <View style={[st.tlRow, past && { opacity: 0.45 }]}>
                    <Text style={[st.tlTime, { color: ev.color || colors.text }]}>{ev.end ? `${hm(ev.at)}–${hm(ev.end)}` : hm(ev.at)}</Text>
                    <View style={[st.tlBar, { backgroundColor: ev.color || colors.divider }]} />
                    <Text style={[st.tlLabel, { color: colors.text }]} numberOfLines={2}>{ev.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* One grooming line; tap for the reason */}
          <TouchableOpacity onPress={() => setGroomOpen((v) => !v)} activeOpacity={0.75} style={[st.groomRow, { backgroundColor: groomingColor + '12', borderColor: groomingColor + '33' }]}>
            <MaterialCommunityIcons name="content-cut" size={15} color={groomingColor} />
            <Text style={[st.groomText, { color: colors.text }]}>{tx('Grooming')}</Text>
            <Text style={[st.groomWord, { color: groomingColor }]}>
              {tx(selectedGrooming.overallStatus === 'allowed' ? 'Good day' : selectedGrooming.overallStatus === 'avoid' ? 'Better to skip' : 'Avoid today')}
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons name={groomOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          {groomOpen && !!selectedGrooming.rules[0] && (
            <Text style={[st.groomingReason, { color: colors.textSecondary }]}>
              {language === 'hi' || language === 'mr' ? selectedGrooming.rules[0].reasonHi : tx(selectedGrooming.rules[0].reason)}
            </Text>
          )}

          {/* Note */}
          {hasNote && (
            <View style={[st.noteDisplay, { backgroundColor: colors.info + '0D', borderColor: colors.info + '26' }]}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.info} />
              <Text style={[st.noteDisplayText, { color: colors.text }]}>{notes[selectedDateKey]}</Text>
              <TouchableOpacity onPress={deleteNote} hitSlop={10}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          <View style={st.actions}>
            <TouchableOpacity
              style={[st.actionBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
              onPress={() => { setNoteText(notes[selectedDateKey] || ''); setNoteModal(true); }}
            >
              <MaterialCommunityIcons name={hasNote ? 'note-edit-outline' : 'note-plus-outline'} size={17} color={colors.primary} />
              <Text style={[st.actionBtnText, { color: colors.primary }]}>{t(hasNote ? 'cal.editNote' : 'cal.addNoteBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.actionBtn, { backgroundColor: existingReminder ? colors.primary : colors.primary + '12', borderColor: colors.primary + '30' }]}
              onPress={openReminderSheet}
            >
              <MaterialCommunityIcons name={existingReminder ? 'bell-check' : 'bell-plus-outline'} size={17} color={existingReminder ? '#FFF' : colors.primary} />
              <Text style={[st.actionBtnText, { color: existingReminder ? '#FFF' : colors.primary }]} numberOfLines={1}>
                {existingReminder ? existingReminder.time : t('cal.reminder')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ This month at a glance ═══ */}
        {monthAgenda.length > 0 && (
          <View style={[st.detailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.agendaTitle, { color: colors.text }, display]}>{tx('This month')}</Text>
            {monthAgenda.map((a, i) => (
              <TouchableOpacity key={a.key} onPress={() => setSelectedDate(new Date(year, month, a.day))} activeOpacity={0.7}
                style={[st.agendaRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                <View style={[st.agendaDate, { backgroundColor: a.tone.bg }]}>
                  <Text style={{ color: a.tone.fg, fontWeight: '800', fontSize: 16 }}>{a.day}</Text>
                  <Text style={{ color: a.tone.fg, fontWeight: '700', fontSize: 9.5 }}>{dayNames[new Date(year, month, a.day).getDay()]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14.5 }} numberOfLines={1}>{a.title}</Text>
                  {!!a.sub && <Text style={{ color: colors.textTertiary, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>{a.sub}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background }} />

      {/* ═══ Note modal ═══ */}
      <Modal visible={noteModal} transparent animationType="slide" onRequestClose={() => setNoteModal(false)} statusBarTranslucent navigationBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={st.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setNoteModal(false)} />
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 30 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>{t(hasNote ? 'cal.editNote' : 'cal.addNoteBtn')}</Text>
              <TouchableOpacity onPress={() => setNoteModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[st.sheetSub, { color: colors.textSecondary }]}>
              {selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <TextInput
              style={[st.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder={tx('Write your note…')}
              placeholderTextColor={colors.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity onPress={addNote} activeOpacity={0.85}>
              <LinearGradient colors={['#C2410C', '#E8743B']} style={st.primaryBtn}>
                <MaterialCommunityIcons name="content-save-outline" size={19} color="#FFF" />
                <Text style={st.primaryBtnText}>{tx('Save Note')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Reminder time sheet ═══ */}
      <Modal visible={reminderSheet} transparent animationType="slide" onRequestClose={() => setReminderSheet(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={st.modalOverlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 30 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>{tx('Set Reminder')}</Text>
              <TouchableOpacity onPress={() => setReminderSheet(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[st.sheetSub, { color: colors.textSecondary }]}>
              {selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>

            {reminderPresets.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => scheduleAt(p.date)}
                activeOpacity={0.8}
                style={[st.presetRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              >
                <View style={[st.presetIcon, { backgroundColor: colors.primary + '14' }]}>
                  <MaterialCommunityIcons name={p.icon as any} size={19} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.presetTitle, { color: colors.text }]}>{p.label}</Text>
                  <Text style={[st.presetSub, { color: colors.textTertiary }]}>
                    {p.date.toDateString() === selectedDate.toDateString() ? '' : p.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · '}{fmt12(p.date.getHours(), p.date.getMinutes())}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowClock(true)}
              activeOpacity={0.8}
              style={[st.presetRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
            >
              <View style={[st.presetIcon, { backgroundColor: colors.primary + '14' }]}>
                <MaterialCommunityIcons name="clock-edit-outline" size={19} color={colors.primary} />
              </View>
              <Text style={[st.presetTitle, { color: colors.text, flex: 1 }]}>{tx('Pick a time')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            {existingReminder && (
              <TouchableOpacity onPress={() => { cancelReminder(); setReminderSheet(false); }} style={st.removeRem} hitSlop={6}>
                <MaterialCommunityIcons name="bell-off-outline" size={17} color={colors.error} />
                <Text style={{ color: colors.error, fontWeight: '700', fontSize: 14 }}>{tx('Remove reminder')}</Text>
              </TouchableOpacity>
            )}
            {showClock && (
              <DateTimePicker
                value={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), remHour, remMinute)}
                mode="time"
                display="clock"
                onChange={(event, date) => {
                  setShowClock(false);
                  if (event.type === 'set' && date) {
                    setRemHour(date.getHours());
                    setRemMinute(date.getMinutes());
                    scheduleAt(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), date.getHours(), date.getMinutes(), 0));
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ═══ Regional calendar picker ═══ */}
      <Modal visible={regionSheet} transparent animationType="slide" onRequestClose={() => setRegionSheet(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={st.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRegionSheet(false)} />
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 24 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[st.sheetTitle, { color: colors.text }]}>{tx('Regional calendar')}</Text>
            <Text style={[st.sheetSub, { color: colors.textSecondary }]}>{tx('Dates, month names and local festivals follow your region.')}</Text>
            {REGIONS.map((r) => {
              const on = r.key === region;
              return (
                <TouchableOpacity key={r.key} onPress={() => { setRegion(r.key); setRegionSheet(false); }} activeOpacity={0.8}
                  style={[st.presetRow, { borderColor: on ? colors.primary : colors.cardBorder, backgroundColor: on ? colors.primary + '10' : colors.background }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.presetTitle, { color: colors.text }]}>{tx(r.label)} <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>{r.native}</Text></Text>
                    <Text style={[st.presetSub, { color: colors.textTertiary }]}>{tx(r.who)}</Text>
                  </View>
                  {on && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ═══ Month / year jump ═══ */}
      <Modal visible={monthPicker} transparent animationType="slide" onRequestClose={() => setMonthPicker(false)}>
        <View style={st.modalOverlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 30 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>{t('cal.jumpTo')}</Text>
              <TouchableOpacity onPress={() => setMonthPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Year stepper */}
            <View style={st.yearStepper}>
              <TouchableOpacity onPress={() => setCurrentDate(new Date(year - 1, month, 1))} style={[st.monthArrow, { backgroundColor: colors.background, borderColor: colors.cardBorder, borderWidth: 1 }]} hitSlop={8}>
                <Icon name="caret-left" size={18} color={colors.text} weight="regular" />
              </TouchableOpacity>
              <Text style={[st.yearStepperText, { color: colors.text }]}>{year}</Text>
              <TouchableOpacity onPress={() => setCurrentDate(new Date(year + 1, month, 1))} style={[st.monthArrow, { backgroundColor: colors.background, borderColor: colors.cardBorder, borderWidth: 1 }]} hitSlop={8}>
                <Icon name="caret-right" size={18} color={colors.text} weight="regular" />
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <View style={st.monthGrid}>
              {monthNames.map((m, i) => {
                const active = i === month;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[st.monthGridItem, { borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary : 'transparent' }]}
                    onPress={() => { setCurrentDate(new Date(year, i, 1)); setMonthPicker(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[st.monthGridText, { color: active ? '#FFF' : colors.text }]}>{monthShort[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 3 },
  regionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 10, paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1 },
  regionText: { fontSize: 13, fontWeight: '700' },
  agendaTitle: { fontSize: 19, lineHeight: 26, marginBottom: 6 },
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  agendaDate: { width: 42, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 12, height: 40, borderRadius: 100 },
  todayPillText: { fontSize: 12, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 22, lineHeight: 30 },
  yearText: { fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Grid
  calendarCard: { marginTop: 14, borderRadius: 20, padding: GRID_PAD, borderWidth: 1 },
  timeline: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  tlTime: { width: 92, fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tlBar: { width: 3, height: 18, borderRadius: 2 },
  tlLabel: { flex: 1, fontSize: 13.5 },
  nowLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowRule: { flex: 1, height: 1.5 },
  dayHeaders: { flexDirection: 'row' },
  dayHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { height: 56, justifyContent: 'center', alignItems: 'center' },
  cellInner: { width: 44, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cellSub: { fontSize: 9.5, fontWeight: '700', marginTop: 1 },
  cellDay: { fontSize: 14.5, fontWeight: '600' },
  statusBar: { position: 'absolute', bottom: 5, width: 14, height: 3, borderRadius: 2 },
  tithiDot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3, borderWidth: 1 },
  noteMark: { position: 'absolute', top: 4, left: 4, width: 5, height: 5, borderRadius: 3 },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6, paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBar: { width: 12, height: 3, borderRadius: 2 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendSquare: { width: 9, height: 9, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '600' },

  // Day sheet
  detailCard: { marginTop: 14, borderRadius: 20, padding: 18, borderWidth: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  dateBlock: { width: 58, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateBlockDay: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  dateBlockMon: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  detailTithi: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  detailSub: { fontSize: 12.5, marginTop: 2 },
  detailWeekday: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  events: { gap: 8, marginBottom: 12 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 16 },
  eventIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 15.5, fontWeight: '800' },
  eventTag: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 7, paddingVertical: 1 },
  eventTagText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  eventLine: { fontSize: 13, lineHeight: 18.5, marginTop: 3 },
  quietDay: { fontSize: 13, marginBottom: 12 },
  groomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, borderWidth: 1 },
  groomText: { fontSize: 13.5, fontWeight: '700' },
  groomWord: { fontSize: 13.5, fontWeight: '800' },
  holidayBar: { position: 'absolute', bottom: 3, width: 16, height: 3, borderRadius: 2 },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  presetIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  presetTitle: { fontSize: 15, fontWeight: '700' },
  presetSub: { fontSize: 12.5, marginTop: 1 },
  removeRem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  detailDate: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },

  festivalBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  festivalIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  festivalName: { fontSize: 14.5, fontWeight: '800' },
  festivalNameHi: { fontSize: 12, marginTop: 1 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  chipText: { fontSize: 12, fontWeight: '600' },

  timingsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 11, marginBottom: 12 },
  timing: { flex: 1, alignItems: 'center', gap: 2 },
  timingDivider: { width: 1, height: 30 },
  timingLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  timingValue: { fontSize: 12.5, fontWeight: '700' },

  groomingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  gChipLabel: { fontSize: 11.5, fontWeight: '600' },
  gChipWord: { fontSize: 10.5, fontWeight: '800' },
  groomingReason: { fontSize: 13, lineHeight: 19, marginTop: 8, paddingHorizontal: 4 },

  noteDisplay: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  noteDisplayText: { flex: 1, fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 13, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  // Sheets
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 30 },
  yearStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 8, marginBottom: 18 },
  yearStepperText: { fontSize: 22, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthGridItem: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  monthGridText: { fontSize: 14, fontWeight: '700' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  sheetSub: { fontSize: 13.5, marginTop: 4, marginBottom: 16 },
  sheetLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },

  remTimeDisplay: { alignItems: 'center', paddingVertical: 22, borderRadius: 20, borderWidth: 1, marginTop: 6, marginBottom: 16 },
  remTimeBig: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  remQuickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  remQuickBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4, borderRadius: 14, borderWidth: 1 },
  remQuickText: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', lineHeight: 14 },


  dialBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 13, borderWidth: 1, marginBottom: 14 },
  dialBtnText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: '700' },
  hourRow: { gap: 7, paddingBottom: 14 },
  hourChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11, borderWidth: 1 },
  hourChipText: { fontSize: 13, fontWeight: '700' },
  minuteRow: { gap: 7, paddingBottom: 18 },
  minuteChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, borderWidth: 1 },

  noteInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, minHeight: 110, marginBottom: 16 },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 52 },
  primaryBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '800' },
});
