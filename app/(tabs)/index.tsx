import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, InteractionManager, ScrollView, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculatePanchang } from '../../services/panchang';
import { getUpcomingObservances, type Observance } from '../../services/upcoming';
import { muhurtaNow } from '../../services/muhurtaNow';
import { liveNow, HORA_HI, HORA_GLYPH, HORA_FOR, CH_HI, TARA_HI, type LiveNow } from '../../services/hora';
import { dayGlance } from '../../services/jyotishExtras';
import { getNatalForHome } from '../../services/natalCache';
import type { Kundli } from '../../services/jyotish';
import MoonPhase from '../../components/ui/MoonPhase';
import { Screen, Icon, ToolTile, ToolGlyph, LanguageChip, ThemeToggle, Sidebar } from '../../components/ui';
import HomeSearch from '../../components/home/HomeSearch';
import { TOOLS } from '../../constants/tools';
import { SHLOKAS, SHLOKA_CARDS, shlokaIndexFor } from '../../constants/shlokas';
import { shareImageAsset, shlokaShareMessage } from '../../services/shareApp';
import { useDialog } from '../../contexts/DialogContext';
import { DS } from '../../constants/ds';

const GRID_COLS = 4;
const MAIN_TOOLS = ['panchang', 'japa', 'aarti', 'ai'];
// Two more that peek in from the right, then a More tile.
const EXTRA_TOOLS = ['vpuja', 'temples'];

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function ordinalFor(n: number, lang: string) {
  if (lang === 'hi' || lang === 'mr') return `${n}वें`;
  if (lang === 'bn' || lang === 'as') return `${n}${n === 1 || n >= 5 && n !== 6 ? 'ম' : n === 2 || n === 3 ? 'য়' : n === 4 ? 'র্থ' : 'ষ্ঠ'}`;
  const v = n % 100;
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
}

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { colors, tones, isDark } = useTheme();
  const { t, tf, tx, locale, noTrack, display, language, native } = useLanguage();
  const today = new Date();
  const lat = profile?.location?.lat || 28.6139;
  const lng = profile?.location?.lng || 77.209;

  const panchang = useMemo(() => calculatePanchang(today, lat, lng), [today.toDateString(), lat, lng]);

  // Live panchang: recomputed every minute (hora, choghadiya, tithi now).
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const id = setInterval(() => setMinute(Math.floor(Date.now() / 60000)), 15000);
    return () => clearInterval(id);
  }, []);
  const live = useMemo<LiveNow | null>(() => { try { return liveNow(new Date(), lat, lng); } catch { return null; } }, [minute, lat, lng]);
  const now = useMemo(() => muhurtaNow(panchang), [panchang, minute]);

  // Upcoming observances scan ~45 days of panchang; do it after first paint.
  const [upcoming, setUpcoming] = useState<Observance[] | null>(null);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      try { setUpcoming(getUpcomingObservances(new Date(), lat, lng, 4)); } catch { setUpcoming([]); }
    });
    return () => task.cancel();
  }, [today.toDateString(), lat, lng]);

  // Device copy of the chart for the Jyotish card; japa progress for "Continue".
  const [natal, setNatal] = useState<Kundli | null>(null);
  const [japa, setJapa] = useState<{ count: number; target: number } | null>(null);
  useFocusEffect(React.useCallback(() => {
    if (user?.uid) getNatalForHome(user.uid, !!profile?.hasBirthChart).then(setNatal).catch(() => {});
    AsyncStorage.getItem('sadhak_japa_state').then((v) => { try { setJapa(v ? JSON.parse(v) : null); } catch {} }).catch(() => {});
  }, [user?.uid, profile?.hasBirthChart]));
  const glance = useMemo(() => { try { return natal ? dayGlance(natal) : null; } catch { return null; } }, [natal, today.toDateString()]);

  const shlokaIdx = shlokaIndexFor(today);
  const shloka = SHLOKAS[shlokaIdx];
  const meaning = language === 'hi' || language === 'mr' ? shloka.hi : language === 'bn' || language === 'as' ? shloka.bn : shloka.en;
  const dialog = useDialog();
  const [sharing, setSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const shareShloka = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const how = await shareImageAsset(SHLOKA_CARDS[shlokaIdx], `Sadhak-Shloka-${shlokaIdx + 1}.jpg`, shlokaShareMessage(shloka.text, shloka.en, shloka.source), 'Share shloka');
      if (how === 'image') dialog.alert('Invite copied', 'The invite message with the link is copied. Paste it as the caption if your app asks for one.', undefined, { tone: 'success' });
    } finally { setSharing(false); }
  };
  const firstName = profile?.displayName?.split(' ')[0] || 'Sadhak';
  const hour = today.getHours();
  const greeting = t(hour < 4 ? 'ui.greet.night' : hour < 12 ? 'ui.greet.morning' : hour < 17 ? 'ui.greet.day' : hour < 20 ? 'ui.greet.evening' : 'ui.greet.night');

  // Muhurta pill: only a window running right now. The "starts within the
  // hour" preview and the next-tithi line were noise on the card.
  const flagged = now.active;
  // Festival pill: only when the festival is today. Near festivals still
  // show in the Coming Up list below.
  const todayFest = upcoming?.find((o) => o.kind === 'festival' && o.daysAway === 0);
  const festLabel = todayFest ? native(todayFest.name, todayFest.nameHi) : '';
  const japaOpen = japa && japa.count > 0 && japa.count < (japa.target || 108);

  const mainTools = MAIN_TOOLS.map((k) => TOOLS.find((x) => x.key === k)!).filter(Boolean);
  const moreTools = EXTRA_TOOLS.map((k) => TOOLS.find((x) => x.key === k)!).filter(Boolean);
  const [gridW, setGridW] = useState(0);
  // 4 tiles fit, the 5th peeks in so the row reads as scrollable.
  const tileW = gridW ? Math.floor(gridW / 4.4) : 0;

  // One gentle nudge on the scrolling row for the first few launches.
  const rowRef = useRef<ScrollView>(null);
  useEffect(() => {
    let timer: any;
    AsyncStorage.getItem('sadhak_tools_nudge').then((v) => {
      const n = Number(v || 0);
      if (n >= 3) return;
      AsyncStorage.setItem('sadhak_tools_nudge', String(n + 1)).catch(() => {});
      timer = setTimeout(() => {
        rowRef.current?.scrollTo({ x: 90, animated: true });
        setTimeout(() => rowRef.current?.scrollTo({ x: 0, animated: true }), 650);
      }, 1200);
    }).catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  const hero = isDark ? (['#6E2A0C', '#2E160B'] as const) : (['#C2410C', '#E3732F'] as const);
  const chTone = live?.choghadiya.quality === 'good' ? '#86EFAC' : live?.choghadiya.quality === 'bad' ? '#FECACA' : '#FDE68A';
  const big = native(live?.tithi.name || panchang.tithi.name, live?.tithi.nameHi || panchang.tithi.nameHi);
  const deva = language === 'hi' || language === 'mr';

  return (
    <Screen scroll tabbed edges={{ top: true, bottom: false }}>
      {/* ═══ Top bar: hamburger + big greeting, language + theme ═══ */}
      <View style={s.top}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={tx('Menu')}
          style={({ pressed }) => [s.burger, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[s.burgerBar, { backgroundColor: colors.text }]} />
          <View style={[s.burgerBar, { backgroundColor: colors.text }]} />
          <View style={[s.burgerBar, { backgroundColor: colors.text }]} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.greeting, { color: colors.text }, display]} numberOfLines={1} adjustsFontSizeToFit>{greeting}</Text>
          <Text style={[s.name, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{firstName}</Text>
        </View>
        <View style={s.topRight}>
          <LanguageChip />
          <ThemeToggle />
        </View>
      </View>

      {/* ═══ Search: tools, aartis, puja guides ═══ */}
      <Pressable
        onPress={() => setSearchOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('home.searchPlaceholder')}
        style={({ pressed }) => [s.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="magnifying-glass" size={17} color={colors.textTertiary} weight="regular" />
        <Text style={[s.searchText, { color: colors.textTertiary }]} numberOfLines={1}>{t('home.searchPlaceholder')}</Text>
      </Pressable>

      {/* ═══ Today: live clock, tithi, hora + choghadiya ═══ */}
      <Pressable onPress={() => router.push('/panchang')} accessibilityRole="button" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        <LinearGradient colors={hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Svg width={220} height={220} style={s.heroRings} pointerEvents="none">
            {[105, 80, 55, 30].map((r, i) => (
              <Circle key={r} cx={160} cy={60} r={r} fill="#FFFFFF" opacity={0.05 + i * 0.025} />
            ))}
          </Svg>
          <View style={s.heroTop}>
            <Text style={[s.heroOver, noTrack]} numberOfLines={1}>
              {today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <MoonPhase tithi={panchang.tithi.number} size={28} />
          </View>

          <View style={s.heroMain}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroTithi, language === 'en' ? { fontFamily: DS.font.display, fontSize: 38, lineHeight: 50 } : (language === 'bn' || language === 'as') ? { fontFamily: undefined, fontWeight: '800', fontSize: 36, lineHeight: 50 } : null]} numberOfLines={1} adjustsFontSizeToFit>{big}</Text>
              <Text style={s.heroSub} numberOfLines={1}>
                {native(panchang.hinduMonth.name, panchang.hinduMonth.nameHi)} {native(panchang.tithi.paksha === 'shukla' ? 'Shukla' : 'Krishna', panchang.tithi.pakshaHi)}
                {live ? ` · ${tf('panch.until', { t: hhmm(live.tithi.end) })}` : ''}
              </Text>
            </View>
            <LiveClock locale={locale} />
          </View>

          {live && (
            <>
              <Text style={[s.nowSection, noTrack]}>{t('home.now')}</Text>
              <View style={s.nowGrid}>
              <View style={s.nowBox}>
                <Text style={[s.nowLabel, noTrack]}>{t('home.hora')}</Text>
                <Text style={s.nowValue} numberOfLines={1}>{HORA_GLYPH[live.hora.name]} {native(live.hora.name, HORA_HI[live.hora.name])}</Text>
                <Text style={s.nowMeta} numberOfLines={1}>{tf('panch.until', { t: hhmm(live.hora.end) })}</Text>
              </View>
              <View style={s.nowBox}>
                <Text style={[s.nowLabel, noTrack]}>{t('home.choghadiya')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.nowDot, { backgroundColor: chTone }]} />
                  <Text style={[s.nowValue, { flexShrink: 1 }]} numberOfLines={1}>{native(live.choghadiya.name, CH_HI[live.choghadiya.name])}</Text>
                </View>
                <Text style={s.nowMeta} numberOfLines={1}>{t(`home.${live.choghadiya.quality}`)} · {tf('panch.until', { t: hhmm(live.choghadiya.end) })}</Text>
              </View>
            </View>
            </>
          )}

          {(!!flagged || !!festLabel) && (
            <View style={s.nowRow}>
              {flagged && (
                <View style={[s.nowPill, { backgroundColor: flagged.good ? 'rgba(134,239,172,0.22)' : 'rgba(254,202,202,0.25)' }]}>
                  <View style={[s.nowDot, { backgroundColor: flagged.good ? '#86EFAC' : '#FECACA' }]} />
                  <Text style={[s.nowText, noTrack]} numberOfLines={1}>
                    {`${tf('panch.activeNow', { name: t(`mu.${flagged.key}`) })} · ${tf('panch.until', { t: flagged.end })}`}
                  </Text>
                </View>
              )}
              {!!festLabel && (
                <View style={[s.nowPill, { backgroundColor: 'rgba(255,236,179,0.25)' }]}>
                  <Icon name="confetti" size={13} color="#FFE7A3" />
                  <Text style={[s.nowText, noTrack]} numberOfLines={1}>{festLabel}</Text>
                </View>
              )}
            </View>
          )}

          <View style={s.heroFoot}>
            <View style={s.footItem}><Icon name="sun-horizon" size={14} color="rgba(255,255,255,0.85)" /><Text style={s.footText}>{panchang.sunrise}</Text></View>
            <View style={s.footItem}><Icon name="moon-stars" size={14} color="rgba(255,255,255,0.85)" /><Text style={s.footText}>{panchang.sunset}</Text></View>
            {live && <View style={[s.footItem, { flexShrink: 1 }]}><Icon name="star-four" size={13} color="rgba(255,255,255,0.85)" /><Text style={s.footText} numberOfLines={1}>{native(live.nakshatra.name, live.nakshatra.nameHi)} → {hhmm(live.nakshatra.end)}</Text></View>}
            <View style={{ flex: 1 }} />
            <Icon name="arrow-right" size={16} color="#FFFFFF" weight="regular" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* ═══ Tools: four main ones, the rest in a scrolling row ═══ */}
      <View style={s.sectionHead}>
        <Text style={[s.sectionTitle, { color: colors.text }, display]}>{t('home.tools')}</Text>
        <Pressable onPress={() => router.push('/(tabs)/tools')} hitSlop={8} style={s.sectionAction}>
          <Text style={[s.sectionActionText, { color: colors.primary }]}>{t('home.allTools')}</Text>
          <Icon name="caret-right" size={13} color={colors.primary} weight="regular" />
        </Pressable>
      </View>
      <View style={[s.grid, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onLayout={(e) => setGridW(e.nativeEvent.layout.width - 16)}>
        {!!tileW && (
          <ScrollView ref={rowRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
            {[...mainTools, ...moreTools].map((tool) => <ToolTile key={tool.key} tool={tool} width={tileW} />)}
            <Pressable
              onPress={() => router.push('/(tabs)/tools')}
              style={({ pressed }) => [s.moreTile, { width: tileW, opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <View style={[s.moreGlyph, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceSecondary }]}>
                <Icon name="squares-four" size={24} color={colors.textSecondary} />
              </View>
              <Text style={[s.moreLabel, { color: colors.text }]} numberOfLines={1}>{t('home.more')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {!!japaOpen && (
        <Pressable onPress={() => router.push('/japa')} style={({ pressed }) => [s.continue, { backgroundColor: tones.haldi.bg, opacity: pressed ? 0.7 : 1 }]}>
          <Icon name="hands-praying" size={16} color={tones.haldi.fg} />
          <Text style={[s.continueText, { color: tones.haldi.fg }]}>{tf('home.continueJapa', { c: japa!.count, t: japa!.target || 108 })}</Text>
          <Icon name="caret-right" size={13} color={tones.haldi.fg} weight="regular" />
        </Pressable>
      )}

      {/* ═══ Jyotish: today's reading from the user's own chart ═══ */}
      <Pressable
        onPress={() => router.push('/jyotish')}
        style={({ pressed }) => [s.astro, { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[s.astroIcon, { backgroundColor: tones.haldi.bg }]}>
          <Icon name="star-four" size={22} color={tones.haldi.fg} />
        </View>
        <View style={{ flex: 1 }}>
          {glance ? (
            <>
              <Text style={[s.astroOver, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{t('home.yourDay')}</Text>
              <Text style={[s.astroTitle, { color: glance.score >= 1 ? colors.success : glance.score <= -1 ? colors.warning : colors.text }]} numberOfLines={1}>
                {t(glance.score >= 1 ? 'home.dayGood' : glance.score <= -1 ? 'home.dayGentle' : 'home.dayMixed')}
              </Text>
              <Text style={[s.astroSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {tf('home.moonHouse', { n: ordinalFor(glance.house, language), tara: native(glance.tara, TARA_HI[glance.tara]) })}
              </Text>
              {!!glance.maha && (
                <Text style={[s.astroSub, { color: colors.textTertiary }]} numberOfLines={1}>
                  {tf('home.dasha', { maha: native(glance.maha, HORA_HI[glance.maha]), antar: glance.antar ? native(glance.antar, HORA_HI[glance.antar]) : '' })}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[s.astroOver, { color: colors.textTertiary }, noTrack]} numberOfLines={1}>{t('f.jyotish')}</Text>
              <Text style={[s.astroTitle, { color: colors.text }]} numberOfLines={1}>{t('home.makeChart')}</Text>
              <Text style={[s.astroSub, { color: colors.textSecondary }]} numberOfLines={1}>{t('home.makeChartSub')}</Text>
            </>
          )}
        </View>
        <Icon name="caret-right" size={16} color={colors.textTertiary} weight="regular" />
      </Pressable>

      {/* ═══ Shloka of the day ═══ */}
      <View style={[s.shloka, { backgroundColor: isDark ? colors.surface : '#FFF8EE', borderColor: isDark ? colors.cardBorder : '#F1DEC4' }]}>
        <Text style={[s.shlokaOm, { color: colors.primary }]}>ॐ</Text>
        <Text style={[s.shlokaLabel, { color: colors.primary }, noTrack]}>{t('home.shlokaOfDay')}</Text>
        <Text style={[s.shlokaText, { color: colors.text }]}>{shloka.text}</Text>
        <Text style={[s.shlokaTrans, { color: colors.textSecondary }]}>{meaning}</Text>
        <Text style={[s.shlokaSrc, { color: colors.textTertiary }]}>{shloka.source}</Text>
        <Pressable
          onPress={shareShloka}
          disabled={sharing}
          accessibilityRole="button"
          accessibilityLabel={tx('Share')}
          hitSlop={10}
          style={({ pressed }) => [s.shareIcon, { opacity: sharing ? 0.5 : pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="paper-plane-outline" size={21} color={colors.primary} />
        </Pressable>
      </View>

      {/* ═══ Coming up ═══ */}
      {upcoming && upcoming.length > 0 && (
        <>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: colors.text }, display]}>{t('home.comingUp')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/calendar')} hitSlop={8} style={s.sectionAction}>
              <Text style={[s.sectionActionText, { color: colors.primary }]}>{t('nav.calendar')}</Text>
              <Icon name="caret-right" size={13} color={colors.primary} weight="regular" />
            </Pressable>
          </View>
          <View style={[s.list, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {upcoming.map((o, i) => {
              const tone = o.kind === 'festival' ? tones.kumkum : o.kind === 'ekadashi' ? tones.plum : o.kind === 'purnima' ? tones.haldi : tones.neel;
              const when = o.daysAway === 0 ? t('ui.today') : o.daysAway === 1 ? t('ui.tomorrow') : tf('home.inDays', { n: o.daysAway });
              return (
                <Pressable
                  key={o.name + o.date.toDateString()}
                  onPress={() => router.push('/(tabs)/calendar')}
                  style={({ pressed }) => [s.obs, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[s.obsDate, { backgroundColor: tone.bg }]}>
                    <Text style={[s.obsDay, { color: tone.fg }]}>{o.date.getDate()}</Text>
                    <Text style={[s.obsMon, { color: tone.fg }, noTrack]}>{o.date.toLocaleDateString(locale, { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.obsName, { color: colors.text }]} numberOfLines={1}>{native(o.name, o.nameHi)}</Text>
                    <Text style={[s.obsSub, { color: colors.textTertiary }]} numberOfLines={1}>
                      {o.date.toLocaleDateString(locale, { weekday: 'long' })}
                    </Text>
                  </View>
                  <View style={[s.obsWhen, { backgroundColor: o.daysAway <= 1 ? tone.bg : colors.surfaceSecondary }]}>
                    <Text style={[s.obsWhenText, { color: o.daysAway <= 1 ? tone.fg : colors.textSecondary }]}>{when}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Sidebar visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <HomeSearch visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </Screen>
  );
}

/** Digital clock that ticks on its own so the rest of Home doesn't re-render. */
function LiveClock({ locale }: { locale: string }) {
  const [d, setD] = useState(new Date());
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const id = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { blink.setValue(d.getSeconds() % 2 ? 0.35 : 1); }, [d]);
  const h12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return (
    <View style={s.clock} accessibilityLabel={d.toLocaleTimeString(locale)}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={s.clockText}>{h12}</Text>
        <Animated.Text style={[s.clockText, { opacity: blink }]}>:</Animated.Text>
        <Text style={s.clockText}>{String(d.getMinutes()).padStart(2, '0')}</Text>
      </View>
      <Text style={s.clockAmPm}>{ampm}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginBottom: 12 },
  burger: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  burgerBar: { width: 18, height: 2, borderRadius: 1 },
  greeting: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  topRight: { flexDirection: 'row', gap: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 46, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, marginBottom: 14 },
  searchText: { fontSize: 14.5 },

  hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  heroRings: { position: 'absolute', top: -20, right: -40 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroOver: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  heroTithi: { color: '#FFFFFF', fontSize: 40, lineHeight: 60, fontFamily: DS.font.deva },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 14.5, lineHeight: 22 },
  clock: { alignItems: 'flex-end' },
  clockText: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontFamily: DS.font.display, fontVariant: ['tabular-nums'] },
  clockAmPm: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: -2 },

  nowSection: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14 },
  nowGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  nowBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  nowLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  nowValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 3 },
  nowMeta: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  nowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  nowPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 100, maxWidth: '100%' },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  continue: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100 },
  continueText: { fontSize: 13.5, fontWeight: '800' },

  astro: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, padding: 16, borderRadius: 22, borderWidth: 1 },
  astroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  astroOver: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  astroTitle: { fontSize: 16.5, fontWeight: '800', marginTop: 2 },
  astroSub: { fontSize: 12.5, marginTop: 2 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 28 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800' },

  grid: { borderRadius: 24, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, gap: 10, overflow: 'hidden' },
  gridRow: { flexDirection: 'row' },
  gridCell: { flex: 1, alignItems: 'center' },
  gridDivider: { height: 1, marginHorizontal: 8 },
  moreTile: { alignItems: 'center', paddingVertical: 6, gap: 8 },
  moreGlyph: { width: 52, height: 52, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  list: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 14 },
  obs: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  obsDate: { width: 46, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  obsDay: { fontSize: 18, fontWeight: '800', lineHeight: 21 },
  obsMon: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  obsName: { fontSize: 15, fontWeight: '800' },
  obsSub: { fontSize: 12.5, marginTop: 2 },
  obsWhen: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  obsWhenText: { fontSize: 11.5, fontWeight: '800' },

  shloka: { marginTop: 14, borderRadius: 24, borderWidth: 1, padding: 20, alignItems: 'center', overflow: 'hidden' },
  shlokaOm: { position: 'absolute', right: 14, top: -14, fontSize: 96, opacity: 0.07, fontFamily: DS.font.deva },
  shlokaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  shlokaText: { fontSize: 24, lineHeight: 42, marginTop: 8, textAlign: 'center', fontFamily: DS.font.deva },
  shlokaTrans: { fontSize: 14, lineHeight: 21, marginTop: 4, textAlign: 'center' },
  shareIcon: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontSize: 13.5, fontWeight: '800' },
  shlokaSrc: { fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
});
