/**
 * One puja, played: the painted place fills the screen, the offerings sit in two trays down
 * the sides, and each one tapped is carried to the deity and offered — poured, showered, set
 * down and lit — while the mantra for it shows along the bottom. Aarti is done with a finger:
 * the lit thali follows it around the deity, three circles.
 *
 * All motion is drawn by `draw.ts` on the UI thread; this file only lays out the stage and
 * turns taps into timed events. The bell and the conch play real sounds (expo-audio).
 */
import { Canvas, Picture, createPicture, useImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text as RNText, type TextProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useLanguage } from '../../contexts/LanguageContext';
import { logEvent } from '../../services/diagnostics';
import type { Lang } from './scenes';
import { BG, BG_ASPECT, SPRITE } from './art';
import { drawStage, K, type Aarti, type Geo, type StageEvent } from './draw';
import { SCENES, SPRITES, type Offering, type Scene } from './scenes';
import { recordPuja } from './streak';

// Satya Jyotish's AppText, reduced to what this screen uses.
const SIZE = { large: 20, body: 15, small: 13 } as const;
function AppText({ variant, weight, style, ...rest }: TextProps & { variant?: keyof typeof SIZE; weight?: '600' | '700' }) {
  return <RNText {...rest} style={[variant ? { fontSize: SIZE[variant], lineHeight: SIZE[variant] * 1.35 } : null, weight ? { fontWeight: weight } : null, style]} />;
}

const BUTTON = 56;
const ROW = 76;
const AARTI_CIRCLES = 3;

/** How long each kind of offering keeps the trays busy, in seconds. */
const BUSY: Record<Offering['kind'], number> = {
  pour: 4.2,
  shower: 2.3,
  place: 1,
  light: 1.4,
  smoke: 1,
  bell: 0,
  conch: 3.1,
  aarti: 0,
  ahuti: 1.2,
};

const KIND: Record<Offering['kind'], number> = {
  pour: K.POUR,
  shower: K.SHOWER,
  place: K.PLACE,
  light: K.LIGHT,
  smoke: K.SMOKE,
  bell: K.BELL,
  conch: K.CONCH,
  aarti: 0,
  ahuti: K.AHUTI,
};

const buzz = (style: 'light' | 'medium' | 'heavy' | 'done') => {
  if (Platform.OS === 'web') return;
  if (style === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else void Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
};


/** The picture is cropped to fill the screen ("cover"); this maps its fractions to screen px. */
function cover(W: number, H: number) {
  const dh = Math.max(H, W / BG_ASPECT);
  const dw = dh * BG_ASPECT;
  return { ox: (W - dw) / 2, oy: (H - dh) / 2, dw, dh };
}

function Stage({ scene }: { scene: Scene }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const lang: Lang = language === 'hi' || language === 'mr' ? 'hi' : language === 'bn' || language === 'as' ? 'bn' : 'en';
  const bellPlayer = useAudioPlayer(require('../../assets/sounds/bell.wav'));
  const conchPlayer = useAudioPlayer(require('../../assets/sounds/shankh.wav'));
  const playSound = (name: 'bell' | 'conch') => {
    const p = name === 'bell' ? bellPlayer : conchPlayer;
    try { p.seekTo(0); p.play(); } catch {}
  };
  const [size, setSize] = useState<{ W: number; H: number } | undefined>();
  const [used, setUsed] = useState<string[]>([]);
  const [mantra, setMantra] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aartiOn, setAartiOn] = useState(false);
  const [circles, setCircles] = useState(0);
  const [done, setDone] = useState<number | undefined>();

  const now = useSharedValue(0);
  const events = useSharedValue<StageEvent[]>([]);
  const aarti = useSharedValue<Aarti>({ on: 0, x: 0, y: 0 });
  const turn = useSharedValue({ last: 0, total: 0, circles: 0 });

  // The stage clock must never go back: every event's age is measured against it. A frame
  // callback that is re-registered (an inline one is, on every render) restarts its
  // `timeSinceFirstFrame` at 0, which replayed every offering and delayed new ones. So the
  // callback is stable, and the clock runs from the first frame's timestamp, kept aside.
  const start = useSharedValue(-1);
  const tick = useCallback((frame: FrameInfo) => {
    'worklet';
    if (start.value < 0) start.value = frame.timestamp;
    now.value = (frame.timestamp - start.value) / 1000;
  }, []);
  useFrameCallback(tick);

  // Twenty hooks, always the same twenty: the sprite list is fixed.
  const imgs = [
    useImage(SPRITE['aarti-thali']), useImage(SPRITE.akshat), useImage(SPRITE['bel-patra']), useImage(SPRITE.bell),
    useImage(SPRITE['bowl-curd']), useImage(SPRITE['bowl-ghee']), useImage(SPRITE['bowl-honey']), useImage(SPRITE['bowl-milk']),
    useImage(SPRITE['bowl-sandal']), useImage(SPRITE['bowl-water']), useImage(SPRITE.coconut), useImage(SPRITE.conch),
    useImage(SPRITE.diya), useImage(SPRITE.firewood), useImage(SPRITE.guggal), useImage(SPRITE.incense),
    useImage(SPRITE.kalash), useImage(SPRITE.lotus), useImage(SPRITE.marigold), useImage(SPRITE.paddy),
  ];
  const ready = imgs.every(Boolean);

  const geo = useMemo<Geo | undefined>(() => {
    if (!size) return undefined;
    const { W, H } = size;
    const m = cover(W, H);
    const X = (x: number) => m.ox + x * m.dw;
    const Y = (y: number) => m.oy + y * m.dh;
    return {
      W,
      H,
      U: Math.min(W, H * 0.6),
      tx: X(scene.target.x),
      ty: Y(scene.target.y),
      rx0: X(scene.rest.x0),
      rx1: X(scene.rest.x1),
      ry: Y(scene.rest.y),
      lx: X(scene.lamp.x),
      ly: Y(scene.lamp.y),
      ix: X(scene.incense.x),
      iy: Y(scene.incense.y),
      bx: X(scene.bell.x),
      by: Y(scene.bell.y),
      fx: scene.fire ? X(scene.fire.x) : 0,
      fy: scene.fire ? Y(scene.fire.y) : 0,
      fw: scene.fire ? scene.fire.w * m.dw : 0,
      hasFire: scene.fire ? 1 : 0,
    };
  }, [size, scene]);

  const picture = useDerivedValue(() => {
    const t = now.value;
    const evs = events.value;
    const a = aarti.value;
    return createPicture(
      (c) => {
        if (geo && ready) drawStage(c, t, evs, geo, imgs, a);
      },
      { width: geo?.W ?? 1, height: geo?.H ?? 1 },
    );
  }, [geo, ready, ...imgs]);

  const half = Math.ceil(scene.offerings.length / 2);
  const columns = [scene.offerings.slice(0, half), scene.offerings.slice(half)];
  const top = size ? Math.max(insets.top + 70, size.H * 0.5 - (half * ROW) / 2 - 20) : 0;
  const buttonCentre = (col: number, row: number) => ({
    x: col === 0 ? 12 + BUTTON / 2 : (size?.W ?? 0) - 12 - BUTTON / 2,
    y: top + row * ROW + BUTTON / 2,
  });

  const finishIfAll = (nextUsed: string[]) => {
    const all = scene.offerings.every((o) => nextUsed.includes(o.id));
    if (!all || done !== undefined) return;
    setTimeout(() => {
      events.value = [...events.value, { kind: K.BLESS, t0: now.value, sprite: 18, sx: 0, sy: 0, colour: '', seed: 1, grain: 0, left: 0 }];
      buzz('done');
      playSound('conch');
      logEvent('puja_done', { scene: scene.id });
      void recordPuja().then(setDone);
    }, 1500);
  };

  const offer = (o: Offering, col: number, row: number) => {
    const t = now.value;
    if (o.kind !== 'bell' && busy) return;
    const nextUsed = used.includes(o.id) ? used : [...used, o.id];
    setUsed(nextUsed);
    if (o.kind === 'aarti') {
      if (!geo) return;
      aarti.value = { on: 1, x: geo.tx + geo.U * 0.26, y: geo.ty };
      turn.value = { last: 0, total: 0, circles: 0 };
      setCircles(0);
      setAartiOn(true);
      buzz('medium');
      return;
    }
    const at = buttonCentre(col, row);
    events.value = [
      ...events.value,
      {
        kind: KIND[o.kind],
        t0: t,
        sprite: SPRITES.indexOf(o.sprite),
        sx: at.x,
        sy: at.y,
        colour: o.colour ?? '#ffffff',
        seed: events.value.length * 13 + 7,
        grain: o.grain ? 1 : 0,
        left: o.sprite === 'kalash' ? 1 : 0,
      },
    ];
    if (BUSY[o.kind] > 0) {
      setBusy(true);
      setTimeout(() => setBusy(false), BUSY[o.kind] * 1000);
    }
    if (o.kind !== 'bell') setMantra((m) => (m + 1) % scene.mantras.length);
    if (o.kind === 'bell') {
      buzz('heavy');
      setTimeout(() => buzz('medium'), 180);
      setTimeout(() => buzz('light'), 380);
      playSound('bell');
    } else if (o.kind === 'conch') {
      buzz('heavy');
      playSound('conch');
    } else if (o.kind === 'pour') {
      setTimeout(() => buzz('light'), 1100);
      setTimeout(() => buzz('light'), 2200);
    } else {
      setTimeout(() => buzz(o.kind === 'ahuti' ? 'medium' : 'light'), 800);
    }
    finishIfAll(nextUsed);
  };

  const onCircle = (n: number) => {
    setCircles(n);
    buzz('medium');
    setMantra((m) => (m + 1) % scene.mantras.length);
    if (n >= AARTI_CIRCLES) {
      setTimeout(() => {
        aarti.value = { on: 0, x: 0, y: 0 };
        setAartiOn(false);
        finishIfAll(used.includes('aarti') ? used : [...used, 'aarti']);
      }, 500);
    }
  };

  const tx = geo?.tx ?? 0;
  const ty = geo?.ty ?? 0;
  const pan = Gesture.Pan()
    .enabled(aartiOn)
    .onBegin((e) => {
      turn.value = { ...turn.value, last: Math.atan2(e.y - ty, e.x - tx) };
      aarti.value = { on: 1, x: e.x, y: e.y };
    })
    .onUpdate((e) => {
      aarti.value = { on: 1, x: e.x, y: e.y };
      const ang = Math.atan2(e.y - ty, e.x - tx);
      let d = ang - turn.value.last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const total = turn.value.total + d;
      const full = Math.floor(Math.abs(total) / (Math.PI * 2));
      if (full > turn.value.circles) runOnJS(onCircle)(full);
      turn.value = { last: ang, total, circles: Math.max(full, turn.value.circles) };
    });

  const line = scene.mantras[mantra];

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill} onLayout={(e: LayoutChangeEvent) => setSize({ W: e.nativeEvent.layout.width, H: e.nativeEvent.layout.height })}>
        <Image source={BG[scene.bg]} style={styles.bg} resizeMode="cover" />
        <Canvas style={CANVAS_STYLE}>
          <Picture picture={picture} />
        </Canvas>

        {/* Top: back, the puja's name, and how many offerings are made. */}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.round} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff6e0" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText style={styles.title}>{scene.title[lang]}</AppText>
          </View>
          <View style={styles.pill}>
            <AppText style={styles.pillText}>{`${used.length}/${scene.offerings.length}`}</AppText>
          </View>
        </View>

        {aartiOn ? (
          <View style={[styles.hint, { top: insets.top + 64 }]} pointerEvents="none">
            <AppText style={styles.hintText}>{`${HINT[lang].replace('{d}', scene.deity[lang])} · ${Math.min(circles, AARTI_CIRCLES)}/${AARTI_CIRCLES}`}</AppText>
          </View>
        ) : null}

        {/* The two trays. */}
        {size && !aartiOn
          ? columns.map((list, col) =>
              list.map((o, row) => {
                const at = buttonCentre(col, row);
                const waiting = o.kind !== 'bell' && busy;
                const isUsed = used.includes(o.id);
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="button"
                    accessibilityLabel={o.label[lang]}
                    onPress={() => offer(o, col, row)}
                    style={[styles.item, { left: at.x - BUTTON / 2 - 8, top: at.y - BUTTON / 2, opacity: waiting ? 0.55 : 1 }]}
                  >
                    <View style={[styles.button, isUsed && styles.buttonUsed]}>
                      <Image source={SPRITE[o.sprite]} style={{ width: BUTTON - 12, height: BUTTON - 12 }} resizeMode="contain" />
                    </View>
                    <AppText numberOfLines={1} style={styles.label}>
                      {o.label[lang]}
                    </AppText>
                  </Pressable>
                );
              }),
            )
          : null}

        {/* The mantra for this offering. */}
        <View style={[styles.mantra, { paddingBottom: insets.bottom + 14 }]} pointerEvents="none">
          <AppText style={styles.dev}>{line.dev}</AppText>
          <AppText style={styles.latin}>{line.latin}</AppText>
        </View>

        {done !== undefined ? (
          <View style={[styles.done, { bottom: insets.bottom + 110 }]}>
            <AppText variant="large" weight="600" style={{ color: '#fff6e0', textAlign: 'center' }}>
              {`🙏 ${DONE[lang].title}`}
            </AppText>
            <AppText variant="body" style={{ color: '#f3e6c8', textAlign: 'center' }}>
              {DONE[lang].body.replace('{d}', scene.deity[lang])}
            </AppText>
            {done > 1 ? (
              <AppText variant="small" weight="600" style={{ color: '#ffd27a', textAlign: 'center' }}>
                {DONE[lang].streak.replace('{n}', String(done))}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 6 }}>
              <Pressable onPress={() => router.back()} style={styles.cta}>
                <AppText style={styles.ctaText}>{DONE[lang].close}</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const HINT = { en: 'Circle the aarti around {d}', hi: '{d} के चारों ओर आरती घुमाएँ', bn: '{d}-কে ঘিরে আরতি ঘোরান' } as const;
const DONE = {
  en: { title: 'Puja complete', body: 'May {d} bless you and your family.', streak: '{n} days in a row', close: 'Done' },
  hi: { title: 'पूजा संपन्न', body: '{d} आपको और आपके परिवार को आशीर्वाद दें।', streak: 'लगातार {n} दिन', close: 'ठीक है' },
  bn: { title: 'পূজা সম্পন্ন', body: '{d} আপনাকে আর আপনার পরিবারকে আশীর্বাদ করুন।', streak: 'টানা {n} দিন', close: 'ঠিক আছে' },
} as const;

const CANVAS_STYLE = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' } as const;

const shadow = { textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#120c08', overflow: 'hidden' },
  bg: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff6e0', fontSize: 20, fontWeight: '700', ...shadow },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,210,122,0.6)' },
  pillText: { color: '#ffd27a', fontSize: 13, fontWeight: '700' },
  hint: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
  hintText: { color: '#ffe7b0', fontSize: 14, fontWeight: '600' },
  item: { position: 'absolute', width: BUTTON + 16, alignItems: 'center' },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,18,10,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(230,170,80,0.85)',
  },
  buttonUsed: { borderColor: '#ffd27a', backgroundColor: 'rgba(90,50,10,0.6)' },
  label: { color: '#fff3d6', fontSize: 11.5, fontWeight: '600', marginTop: 3, ...shadow },
  mantra: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, paddingHorizontal: 18, backgroundColor: 'rgba(12,6,2,0.62)', alignItems: 'center', gap: 2 },
  dev: { color: '#fff3d6', fontSize: 17, fontWeight: '600', textAlign: 'center', ...shadow },
  latin: { color: '#e8d4a8', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center' },
  done: { position: 'absolute', left: 24, right: 24, padding: 16, gap: 6, borderRadius: 18, backgroundColor: 'rgba(30,14,4,0.82)', borderWidth: 1, borderColor: 'rgba(255,210,122,0.7)' },
  cta: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20, backgroundColor: '#e8a33c' },
  ctaText: { color: '#2a1606', fontSize: 15, fontWeight: '700' },
});

export default function PujaStage({ sceneId }: { sceneId: string }) {
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  return <Stage scene={scene} />;
}
