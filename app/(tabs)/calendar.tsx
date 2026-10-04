import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput,
} from 'react-native';
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
import { getFestivalsForDate, getFixedFestivals, type Festival } from '../../services/festivals';
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
}

function fmt12(h: number, m: number): string {
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function CalendarScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const dialog = useDialog();
  const { t, locale, noTrack, display } = useLanguage();
  // Weekday/month names in the chosen language (1 Jan 2023 was a Sunday).
  const dayNames = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })), [locale]);
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2023, i, 1).toLocaleDateString(locale, { month: 'long' })), [locale]);
  const monthShort = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2023, i, 1).toLocaleDateString(locale, { month: 'short' })), [locale]);
  const { headerPaddingTop, tabContentPadding, bottomInset } = useLayoutInsets();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<Record<string, { id: string; time: string }>>({});
  const [reminderSheet, setReminderSheet] = useState(false);
  const [remHour, setRemHour] = useState(6);
  const [remMinute, setRemMinute] = useState(0);
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

  // One pass per month (was: full panchang for every day on EVERY render).
  const monthInfo = useMemo(() => {
    const map: Record<number, DayInfo> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      try {
        const p = calculatePanchang(date, lat, lon);
        const g = getDailyGroomingAdvice(date, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', p.tithi.name);
        const tn = (p.tithi.name || '').toLowerCase();
        // Only day-precise festivals mark the grid: an entry must carry a tithi
        // (or be a fixed Gregorian date). Month-wide observances without a tithi
        // were matching EVERY day and gold-washing half the calendar.
        const dayFestivals = [
          ...getFestivalsForDate(p.hinduMonth.name, p.tithi.name, p.tithi.paksha).filter(f => !!f.tithi),
          ...getFixedFestivals(month + 1, d),
        ].filter(f => f.type === 'major' || f.type === 'minor' || f.type === 'sankranti');
        map[d] = {
          status: g.overallStatus,
          isPurnima: tn.includes('purnima'),
          isAmavasya: tn.includes('amavasya'),
          isEkadashi: tn.includes('ekadashi'),
          festivals: dayFestivals,
        };
      } catch {
        map[d] = { status: 'allowed', isPurnima: false, isAmavasya: false, isEkadashi: false, festivals: [] };
      }
    }
    return map;
  }, [year, month, lat, lon, profile?.gender, profile?.marriageStatus]);

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

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
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

  const openReminderSheet = () => {
    if (existingReminder) {
      dialog.alert(
        'Reminder set',
        `A reminder is set for ${existingReminder.time}. What would you like to do?`,
        [
          { text: 'Keep it', style: 'cancel' },
          { text: 'Remove reminder', style: 'destructive', onPress: cancelReminder },
          { text: 'Change time', onPress: () => setReminderSheet(true) },
        ],
      );
      return;
    }
    setReminderSheet(true);
  };

  const cancelReminder = async () => {
    try {
      if (existingReminder?.id) await Notifications.cancelScheduledNotificationAsync(existingReminder.id);
    } catch {}
    const updated = { ...reminders };
    delete updated[selectedDateKey];
    saveReminders(updated);
  };

  const scheduleReminder = async () => {
    try {
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        dialog.alert('Notifications off', 'Please allow notifications so reminders can reach you.', undefined, { tone: 'warning' });
        return;
      }
      const target = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), remHour, remMinute, 0);
      if (target.getTime() <= Date.now()) {
        dialog.alert('Time has passed', 'Pick a future time for this reminder.', undefined, { tone: 'warning' });
        return;
      }
      // Replace any previous reminder for this date.
      if (existingReminder?.id) {
        try { await Notifications.cancelScheduledNotificationAsync(existingReminder.id); } catch {}
      }
      const dateLabel = selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
      const note = notes[selectedDateKey];
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🙏 Sadhak Reminder',
          body: note ? `${dateLabel}: ${note}` : `Your reminder for ${dateLabel}`,
          sound: true,
          data: { route: '/(tabs)/calendar' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target, channelId: 'sadhak-spiritual' },
      });
      saveReminders({ ...reminders, [selectedDateKey]: { id, time: fmt12(remHour, remMinute) } });
      setReminderSheet(false);
      dialog.alert('Reminder set', `${dateLabel} at ${fmt12(remHour, remMinute)}.`, undefined, { tone: 'success' });
    } catch {
      dialog.alert('Error', 'Could not set the reminder. Please try again.');
    }
  };

  const groomingColor = getGroomingStatusColor(selectedGrooming.overallStatus);
  const hasNote = !!notes[selectedDateKey];
  const selFestivals = selectedInfo?.festivals || [];

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabContentPadding }}>

        {/* ═══ App bar: title, Today, language + theme ═══ */}
        <View style={{ paddingTop: headerPaddingTop }}>
          <AppBar
            title={t('f.calendar')}
            subtitle={selectedPanchang ? `${selectedPanchang.hinduMonth.nameHi} · ${selectedPanchang.tithi.pakshaHi}` : ''}
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

        {/* ═══ Calendar grid — clean by default, markers only when meaningful ═══ */}
        <View style={[st.calendarCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={st.dayHeaders}>
            {dayNames.map((d, i) => (
              <View key={i} style={{ width: CELL, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={[st.dayHeaderText, { color: i === 0 ? colors.festival : colors.textTertiary }, noTrack]}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={st.grid}>
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <View key={idx} style={[st.cell, { width: CELL }]}>
                    <Text style={[st.cellDay, { color: colors.textTertiary, opacity: 0.25 }]}>{item.day}</Text>
                  </View>
                );
              }
              const day = item.day;
              const info = monthInfo[day];
              const today = isToday(day);
              const selected = isSelected(day);
              const isSunday = new Date(year, month, day).getDay() === 0;
              const hasFestival = (info?.festivals.length || 0) > 0;
              const dayHasNote = !!notes[getDateKey(new Date(year, month, day))];
              const restricted = info?.status === 'forbidden';
              // Only hard "avoid" days get a mark — amber caution bars on most
              // days made the grid read as noise. Caution stays in the day sheet.
              const caution = false;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[st.cell, { width: CELL }]}
                  onPress={() => setSelectedDate(new Date(year, month, day))}
                  activeOpacity={0.6}
                >
                  <View
                    style={[
                      st.cellInner,
                      hasFestival && !selected && { backgroundColor: colors.purnima + '1E' },
                      today && !selected && { borderColor: colors.primary, borderWidth: 1.5 },
                      selected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        st.cellDay,
                        { color: isSunday ? colors.festival : colors.text },
                        hasFestival && !selected && { color: isDark ? colors.purnima : '#8A6A10', fontWeight: '800' },
                        today && !selected && { color: colors.primary, fontWeight: '800' },
                        selected && { color: '#FFF', fontWeight: '800' },
                      ]}
                    >
                      {day}
                    </Text>
                    {/* Grooming underlines removed — they made the grid look noisy.
                        Grooming guidance now lives only in the day sheet below. */}
                    {/* Special tithi micro-marks */}
                    {info?.isPurnima && <View style={[st.tithiDot, { backgroundColor: colors.purnima, borderColor: selected ? '#FFF' : 'transparent' }]} />}
                    {info?.isAmavasya && <View style={[st.tithiDot, { backgroundColor: colors.amavasya, borderColor: colors.textTertiary }]} />}
                    {info?.isEkadashi && <View style={[st.tithiDot, { backgroundColor: colors.ekadashi, borderColor: selected ? '#FFF' : 'transparent' }]} />}
                    {dayHasNote && <View style={[st.noteMark, { backgroundColor: selected ? '#FFD700' : colors.info || '#1565C0' }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[st.legend, { borderTopColor: colors.divider }]}>
            {[
              { swatch: <View style={[st.legendDot, { backgroundColor: colors.purnima }]} />, label: t('cal.purnima') },
              { swatch: <View style={[st.legendDot, { backgroundColor: colors.amavasya, borderWidth: 1, borderColor: colors.textTertiary }]} />, label: t('cal.amavasya') },
              { swatch: <View style={[st.legendDot, { backgroundColor: colors.ekadashi }]} />, label: t('cal.ekadashi') },
              { swatch: <View style={[st.legendSquare, { backgroundColor: colors.purnima + '3D' }]} />, label: t('cal.festival') },
            ].map((item, idx) => (
              <View key={idx} style={st.legendItem}>
                {item.swatch}
                <Text style={[st.legendText, { color: colors.textTertiary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ Day sheet ═══ */}
        <View style={[st.detailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={st.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[st.detailWeekday, { color: colors.primary }]}>
                {selectedDate.toLocaleDateString(locale, { weekday: 'long' }).toUpperCase()}
              </Text>
              <Text style={[st.detailDate, { color: colors.text }]}>
                {selectedDate.getDate()} {selectedDate.toLocaleDateString(locale, { month: 'long' })}
                <Text style={{ color: colors.textTertiary, fontSize: 16 }}>  {selectedDate.getFullYear()}</Text>
              </Text>
            </View>
            {/* Grooming badge — scissors + OK/Caution/Avoid, identical to Home so
                it clearly reads as grooming guidance (not a verdict on the day). */}
            <View style={[st.statusBadge, { backgroundColor: groomingColor + '14', borderColor: groomingColor + '3D' }]}>
              <MaterialCommunityIcons name="content-cut" size={14} color={groomingColor} />
              <Text style={[st.statusBadgeText, { color: groomingColor }]}>
                {t(selectedGrooming.overallStatus === 'allowed' ? 'grooming.ok' : selectedGrooming.overallStatus === 'avoid' ? 'grooming.caution' : 'grooming.avoid')}
              </Text>
            </View>
          </View>

          {/* Festival banner */}
          {selFestivals.length > 0 && (
            <LinearGradient
              colors={isDark ? ['#3A2E08', '#241E08'] : ['#FBF3D8', '#F7E9BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[st.festivalBanner, { borderColor: colors.purnima + '55' }]}
            >
              <View style={[st.festivalIcon, { backgroundColor: colors.purnima + '2E' }]}>
                <MaterialCommunityIcons name="star-four-points" size={18} color={isDark ? colors.purnima : '#8A6A10'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.festivalName, { color: isDark ? colors.purnima : '#6B520C' }]}>
                  {selFestivals.map(f => f.name).join(' · ')}
                </Text>
                <Text style={[st.festivalNameHi, { color: isDark ? 'rgba(232,195,74,0.75)' : '#8A6A10' }]}>
                  {selFestivals.map(f => f.nameHi).join(' · ')}
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* Panchang chips */}
          <View style={st.chipsRow}>
            <View style={[st.chip, { backgroundColor: colors.ekadashi + '14' }]}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={13} color={colors.ekadashi} />
              <Text style={[st.chipText, { color: colors.text }]}>{selectedPanchang.tithi.nameHi}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: '#FF6B0014' }]}>
              <MaterialCommunityIcons name="star-four-points-outline" size={13} color="#FF6B00" />
              <Text style={[st.chipText, { color: colors.text }]}>{selectedPanchang.nakshatra.nameHi}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: '#2D6A4F14' }]}>
              <MaterialCommunityIcons name="yoga" size={13} color="#2D6A4F" />
              <Text style={[st.chipText, { color: colors.text }]}>{selectedPanchang.yoga.nameHi}</Text>
            </View>
          </View>

          {/* Timings */}
          <View style={[st.timingsRow, { backgroundColor: isDark ? colors.surfaceElevated : '#F8F4F0', borderColor: colors.divider }]}>
            <View style={st.timing}>
              <MaterialCommunityIcons name="weather-sunset-up" size={15} color="#FF8C00" />
              <Text style={[st.timingLabel, { color: colors.textTertiary }]}>{t('ui.sunrise')}</Text>
              <Text style={[st.timingValue, { color: colors.text }]}>{selectedPanchang.sunrise}</Text>
            </View>
            <View style={[st.timingDivider, { backgroundColor: colors.divider }]} />
            <View style={st.timing}>
              <MaterialCommunityIcons name="weather-sunset-down" size={15} color="#7C3AED" />
              <Text style={[st.timingLabel, { color: colors.textTertiary }]}>{t('ui.sunset')}</Text>
              <Text style={[st.timingValue, { color: colors.text }]}>{selectedPanchang.sunset}</Text>
            </View>
            <View style={[st.timingDivider, { backgroundColor: colors.divider }]} />
            <View style={st.timing}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.festival} />
              <Text style={[st.timingLabel, { color: colors.textTertiary }]}>{t('ui.rahuKaal')}</Text>
              <Text style={[st.timingValue, { color: colors.festival }]}>{selectedPanchang.rahuKaal.start}–{selectedPanchang.rahuKaal.end}</Text>
            </View>
          </View>

          {/* Grooming per-activity chips (consistent with Home) */}
          <View style={st.groomingChips}>
            {selectedGrooming.rules.slice(0, 3).map((rule, idx) => {
              const label = t(rule.type === 'haircut' ? 'grooming.haircut' : rule.type === 'shaving' ? 'grooming.shaving' : 'grooming.nails');
              const word = t(rule.status === 'allowed' ? 'grooming.ok' : rule.status === 'avoid' ? 'grooming.caution' : 'grooming.avoid');
              const c = getGroomingStatusColor(rule.status);
              return (
                <View key={idx} style={[st.gChip, { backgroundColor: c + '12', borderColor: c + '30' }]}>
                  <MaterialCommunityIcons
                    name={rule.type === 'haircut' ? 'content-cut' : rule.type === 'shaving' ? 'razor-double-edge' : 'hand-back-right-outline'}
                    size={12} color={c}
                  />
                  <Text style={[st.gChipLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={[st.gChipWord, { color: c }]}>{word}</Text>
                </View>
              );
            })}
          </View>
          {!!selectedGrooming.rules[0]?.reason && (
            <Text style={[st.groomingReason, { color: colors.textTertiary }]} numberOfLines={2}>
              {selectedGrooming.rules[0].reason}
            </Text>
          )}

          {/* Note */}
          {hasNote && (
            <View style={[st.noteDisplay, { backgroundColor: (colors.info || '#1565C0') + '0D', borderColor: (colors.info || '#1565C0') + '26' }]}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.info || '#1565C0'} />
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
              style={[st.actionBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
              onPress={openReminderSheet}
            >
              <MaterialCommunityIcons name={existingReminder ? 'bell-check' : 'bell-plus-outline'} size={17} color={colors.primary} />
              <Text style={[st.actionBtnText, { color: colors.primary }]}>
                {existingReminder ? `Reminds ${existingReminder.time}` : t('cal.reminder')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ═══ Note modal ═══ */}
      <Modal visible={noteModal} transparent animationType="slide" onRequestClose={() => setNoteModal(false)}>
        <View style={st.modalOverlay}>
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
              placeholder="Write your note…"
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
                <Text style={st.primaryBtnText}>Save Note</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ Reminder time sheet ═══ */}
      <Modal visible={reminderSheet} transparent animationType="slide" onRequestClose={() => setReminderSheet(false)}>
        <View style={st.modalOverlay}>
          <View style={[st.sheet, { backgroundColor: colors.surface, paddingBottom: 30 + bottomInset }]}>
            <View style={[st.sheetHandle, { backgroundColor: colors.divider }]} />
            <View style={st.sheetHeader}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>Set Reminder</Text>
              <TouchableOpacity onPress={() => setReminderSheet(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[st.sheetSub, { color: colors.textSecondary }]}>
              {selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>

            {/* Big time display — tap to open native clock dial */}
            <TouchableOpacity
              style={[st.remTimeDisplay, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
              onPress={() => setShowClock(true)}
              activeOpacity={0.85}
            >
              <Text style={[st.remTimeBig, { color: colors.primary }]}>{fmt12(remHour, remMinute)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <MaterialCommunityIcons name="clock-edit-outline" size={13} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Tap to change</Text>
              </View>
            </TouchableOpacity>
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
                  }
                }}
              />
            )}

            <TouchableOpacity onPress={scheduleReminder} activeOpacity={0.85}>
              <LinearGradient colors={['#C2410C', '#E8743B']} style={st.primaryBtn}>
                <MaterialCommunityIcons name="bell-check-outline" size={19} color="#FFF" />
                <Text style={st.primaryBtnText}>Set for {fmt12(remHour, remMinute)}</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 12, height: 40, borderRadius: 100 },
  todayPillText: { fontSize: 12, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 22, lineHeight: 30 },
  yearText: { fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Grid
  calendarCard: { marginTop: 14, borderRadius: 20, padding: GRID_PAD, borderWidth: 1 },
  dayHeaders: { flexDirection: 'row' },
  dayHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { height: 48, justifyContent: 'center', alignItems: 'center' },
  cellInner: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
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
  legendText: { fontSize: 10, fontWeight: '600' },

  // Day sheet
  detailCard: { marginTop: 14, borderRadius: 20, padding: 18, borderWidth: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  detailWeekday: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
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
  groomingReason: { fontSize: 11.5, lineHeight: 16, marginTop: 8 },

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
