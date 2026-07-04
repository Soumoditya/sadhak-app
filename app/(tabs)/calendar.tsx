import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, Dimensions, Platform, Animated,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { calculatePanchang } from '../../services/panchang';
import { getDailyGroomingAdvice, getGroomingStatusColor } from '../../services/groomingRules';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_W - 40) / 7; // Better use of horizontal space
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const NOTES_KEY = 'sadhak_calendar_notes';

export default function CalendarScreen() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load notes from AsyncStorage on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTES_KEY);
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) {}
  };

  const saveNotes = async (updated: Record<string, string>) => {
    setNotes(updated);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: { day: number; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const selectedPanchang = useMemo(() => {
    const lat = profile?.location?.lat || 28.6139;
    const lon = profile?.location?.lng || 77.209;
    return calculatePanchang(selectedDate, lat, lon);
  }, [selectedDate.toDateString()]);

  const selectedGrooming = useMemo(() => {
    return getDailyGroomingAdvice(
      selectedDate,
      profile?.gender || 'male',
      profile?.marriageStatus || 'unmarried',
      selectedPanchang?.tithi.name,
    );
  }, [selectedDate.toDateString(), selectedPanchang?.tithi.name]);

  const getDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const getDayGroomingStatus = useCallback((day: number) => {
    const d = new Date(year, month, day);
    const p = calculatePanchang(d, profile?.location?.lat || 28.6139, profile?.location?.lng || 77.209);
    const g = getDailyGroomingAdvice(d, profile?.gender || 'male', profile?.marriageStatus || 'unmarried', p.tithi.name);
    return g.overallStatus;
  }, [year, month, profile?.gender, profile?.marriageStatus]);

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const addNote = () => {
    if (!noteText.trim()) return;
    const key = getDateKey(selectedDate);
    const updated = { ...notes, [key]: noteText.trim() };
    saveNotes(updated);
    setNoteText('');
    setNoteModal(false);
  };

  const deleteNote = () => {
    const key = getDateKey(selectedDate);
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const updated = { ...notes };
        delete updated[key];
        saveNotes(updated);
      }},
    ]);
  };

  const groomingColor = getGroomingStatusColor(selectedGrooming.overallStatus);
  const selectedDateKey = getDateKey(selectedDate);
  const hasNote = !!notes[selectedDateKey];

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ─── Header ──── */}
        <LinearGradient
          colors={isDark ? [colors.surfaceElevated, colors.background] : ['#D94F00', '#F07830']}
          style={st.header}
        >
          <Text style={st.headerTitle}>{t('cal.title')}</Text>
          <Text style={st.headerSub}>
            {selectedPanchang ? `${selectedPanchang.hinduMonth.nameHi} • ${selectedPanchang.tithi.pakshaHi}` : ''}
          </Text>
        </LinearGradient>

        {/* ─── Month Navigator ──── */}
        <View style={[st.monthNav, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={goToPrevMonth} style={[st.navBtn, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={st.monthCenter}>
            <Text style={[st.monthText, { color: colors.text }]}>{MONTHS[month]}</Text>
            <Text style={[st.yearText, { color: colors.primary }]}>{year}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={[st.navBtn, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── Calendar Grid ──── */}
        <View style={[st.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Day headers */}
          <View style={st.dayHeaders}>
            {DAYS_SHORT.map((d, i) => (
              <View key={i} style={[st.dayHeaderCell, { width: CELL_SIZE }]}>
                <Text style={[st.dayHeaderText, { color: i === 0 ? '#EF4444' : colors.textTertiary }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={st.grid}>
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <View key={idx} style={[st.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                    <Text style={[st.cellDay, { color: colors.textTertiary, opacity: 0.3 }]}>{item.day}</Text>
                  </View>
                );
              }

              const day = item.day;
              const today = isToday(day);
              const selected = isSelected(day);
              const status = getDayGroomingStatus(day);
              const dateKey = getDateKey(new Date(year, month, day));
              const dayHasNote = !!notes[dateKey];
              const isSunday = new Date(year, month, day).getDay() === 0;
              const statusColor = getGroomingStatusColor(status);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    st.cell,
                    { width: CELL_SIZE, height: CELL_SIZE },
                    selected && { backgroundColor: colors.primary, borderRadius: 14 },
                    today && !selected && { borderColor: colors.primary, borderWidth: 2, borderRadius: 14 },
                  ]}
                  onPress={() => setSelectedDate(new Date(year, month, day))}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    st.cellDay,
                    { color: selected ? '#FFF' : isSunday ? '#EF4444' : colors.text },
                    today && !selected && { color: colors.primary, fontWeight: '800' },
                  ]}>
                    {day}
                  </Text>
                  {/* Status dot */}
                  <View style={[st.statusDot, { backgroundColor: selected ? 'rgba(255,255,255,0.6)' : statusColor }]} />
                  {/* Note indicator */}
                  {dayHasNote && (
                    <View style={[st.noteIndicator, { backgroundColor: selected ? '#FFD700' : colors.gangesBlue || '#1565C0' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={[st.legend, { borderTopColor: colors.divider }]}>
            {[
              { color: '#2D6A4F', label: 'Safe' },
              { color: '#F59E0B', label: 'Caution' },
              { color: '#DC2626', label: 'Avoid' },
            ].map((item, idx) => (
              <View key={idx} style={st.legendItem}>
                <View style={[st.legendDot, { backgroundColor: item.color }]} />
                <Text style={[st.legendText, { color: colors.textTertiary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Selected Date Details ──── */}
        <View style={[st.detailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Date header */}
          <View style={st.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[st.detailDay, { color: colors.primary }]}>
                {selectedDate.toLocaleDateString('en-IN', { weekday: 'long' })}
              </Text>
              <Text style={[st.detailFullDate, { color: colors.text }]}>
                {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={[st.detailBadge, { backgroundColor: groomingColor + '15' }]}>
              <MaterialCommunityIcons
                name={selectedGrooming.overallStatus === 'allowed' ? 'check-decagram' : selectedGrooming.overallStatus === 'avoid' ? 'alert-decagram' : 'close-octagon'}
                size={20} color={groomingColor}
              />
            </View>
          </View>

          {/* Panchang mini */}
          <View style={[st.detailPanchang, { backgroundColor: isDark ? colors.surfaceElevated : '#F8F4F0', borderColor: colors.divider }]}>
            <Text style={[st.detailHindu, { color: colors.text }]}>
              {selectedPanchang.hinduMonth.nameHi} {selectedPanchang.tithi.pakshaHi} {selectedPanchang.tithi.nameHi}
            </Text>
            <Text style={[st.detailNak, { color: colors.textSecondary }]}>
              {selectedPanchang.nakshatra.nameHi} • {selectedPanchang.yoga.nameHi} • {selectedPanchang.karana.nameHi}
            </Text>
            <View style={st.detailTimings}>
              <View style={st.detailTimingItem}>
                <MaterialCommunityIcons name="weather-sunset-up" size={14} color="#FF8C00" />
                <Text style={[st.detailTimingText, { color: colors.textSecondary }]}>{selectedPanchang.sunrise}</Text>
              </View>
              <View style={st.detailTimingItem}>
                <MaterialCommunityIcons name="weather-sunset-down" size={14} color="#7C3AED" />
                <Text style={[st.detailTimingText, { color: colors.textSecondary }]}>{selectedPanchang.sunset}</Text>
              </View>
              <View style={st.detailTimingItem}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
                <Text style={[st.detailTimingText, { color: '#EF4444' }]}>Rahu {selectedPanchang.rahuKaal.start}-{selectedPanchang.rahuKaal.end}</Text>
              </View>
            </View>
          </View>

          {/* Grooming */}
          <View style={[st.groomingRow, { borderLeftColor: groomingColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={[st.groomingStatus, { color: groomingColor }]}>{selectedGrooming.summary}</Text>
              {selectedGrooming.rules.slice(0, 2).map((rule, idx) => (
                <View key={idx} style={st.ruleItem}>
                  <MaterialCommunityIcons
                    name={rule.type === 'haircut' ? 'content-cut' : rule.type === 'shaving' ? 'razor-double-edge' : 'hand-back-right-outline'}
                    size={12} color={getGroomingStatusColor(rule.status)}
                  />
                  <Text style={[st.ruleText, { color: colors.textTertiary }]} numberOfLines={1}>{rule.reason}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Note */}
          {hasNote && (
            <View style={[st.noteDisplay, { backgroundColor: (colors.gangesBlue || '#1565C0') + '08' }]}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.gangesBlue || '#1565C0'} />
              <Text style={[st.noteDisplayText, { color: colors.text }]}>{notes[selectedDateKey]}</Text>
              <TouchableOpacity onPress={deleteNote} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={st.actions}>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: colors.primary + '12' }]} onPress={() => { setNoteText(notes[selectedDateKey] || ''); setNoteModal(true); }}>
              <MaterialCommunityIcons name={hasNote ? 'note-edit-outline' : 'note-plus-outline'} size={18} color={colors.primary} />
              <Text style={[st.actionBtnText, { color: colors.primary }]}>{hasNote ? 'Edit Note' : 'Add Note'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#7C3AED12' }]} onPress={async () => {
              try {
                const Notifications = require('expo-notifications');
                const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 6, 0, 0);
                if (targetDate.getTime() <= Date.now()) {
                  Alert.alert('📅 Reminder', 'Cannot set reminder for past dates.');
                  return;
                }
                await Notifications.scheduleNotificationAsync({
                  content: { title: '🙏 Sadhak Reminder', body: `Don't forget your spiritual activities for ${selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`, sound: true },
                  trigger: { date: targetDate },
                });
                Alert.alert('✅ Reminder Set', `You'll be reminded on ${selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} at 6:00 AM`);
              } catch (e) { Alert.alert('Error', 'Could not set reminder.'); }
            }}>
              <MaterialCommunityIcons name="bell-plus-outline" size={18} color="#7C3AED" />
              <Text style={[st.actionBtnText, { color: '#7C3AED' }]}>Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ─── Note Modal ──── */}
      <Modal visible={noteModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.surface }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{hasNote ? 'Edit Note' : 'Add Note'}</Text>
              <TouchableOpacity onPress={() => setNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[st.modalDate, { color: colors.textSecondary }]}>
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <TextInput
              style={[st.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Write your note..."
              placeholderTextColor={colors.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity onPress={addNote} activeOpacity={0.8}>
              <LinearGradient colors={['#D94F00', '#F07830']} style={st.saveBtn}>
                <MaterialCommunityIcons name="content-save-outline" size={20} color="#FFF" />
                <Text style={st.saveBtnText}>Save Note</Text>
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
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // Month nav
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, padding: 8, borderRadius: 16, borderWidth: 1 },
  navBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 18, fontWeight: '800' },
  yearText: { fontSize: 12, fontWeight: '600' },

  // Calendar
  calendarContainer: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 8, borderWidth: 1, overflow: 'hidden' },
  dayHeaders: { flexDirection: 'row' },
  dayHeaderCell: { alignItems: 'center', paddingVertical: 8 },
  dayHeaderText: { fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cellDay: { fontSize: 14, fontWeight: '600' },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  noteIndicator: { position: 'absolute', top: 4, right: 6, width: 6, height: 6, borderRadius: 3 },

  // Legend
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 10, marginTop: 4, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },

  // Detail card
  detailCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailDay: { fontSize: 13, fontWeight: '700' },
  detailFullDate: { fontSize: 17, fontWeight: '800' },
  detailBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  detailPanchang: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  detailHindu: { fontSize: 15, fontWeight: '700' },
  detailNak: { fontSize: 12, marginTop: 2 },
  detailTimings: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailTimingItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailTimingText: { fontSize: 11, fontWeight: '500' },

  // Grooming
  groomingRow: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 },
  groomingStatus: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ruleText: { flex: 1, fontSize: 11, lineHeight: 14 },

  // Note display
  noteDisplay: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  noteDisplayText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Actions
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalDate: { fontSize: 14, marginBottom: 16 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 100, marginBottom: 16 },
  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, height: 50 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
