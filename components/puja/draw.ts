/**
 * Everything that moves in a puja, drawn by Skia on the UI thread, sixty times a second.
 *
 * Nothing here keeps particle state. Each offering is an event with a start time, and every
 * frame redraws every event from its age: a flower's fall, a stream's length and a flame's
 * flicker are all functions of time and a per-piece seed. That keeps it cheap, makes it
 * impossible for particles to drift out of sync, and means a flower that has landed simply
 * stays drawn where its fall ended.
 */
import { BlendMode, PaintStyle, Skia, StrokeCap, TileMode, vec, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

export const K = { POUR: 1, SHOWER: 2, PLACE: 3, LIGHT: 4, SMOKE: 5, BELL: 6, CONCH: 7, AHUTI: 8, BLESS: 9 } as const;

export interface StageEvent {
  kind: number;
  /** Seconds on the stage clock. */
  t0: number;
  /** Index into the sprite list. */
  sprite: number;
  /** Where the offering starts (its tray button), in screen px. */
  sx: number;
  sy: number;
  colour: string;
  seed: number;
  grain: number;
  /** Pour from the left of the target (the kalash) rather than the right. */
  left: number;
}

/** The scene's points already mapped to screen px, and the unit size (the screen width). */
export interface Geo {
  W: number;
  H: number;
  U: number;
  tx: number;
  ty: number;
  rx0: number;
  rx1: number;
  ry: number;
  lx: number;
  ly: number;
  ix: number;
  iy: number;
  bx: number;
  by: number;
  fx: number;
  fy: number;
  fw: number;
  hasFire: number;
}

export interface Aarti {
  on: number;
  x: number;
  y: number;
}

/* ------------------------------------------------------------------------------------------ */

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};
const ease = (v: number) => {
  'worklet';
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};
const hash = (n: number) => {
  'worklet';
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function sprite(c: SkCanvas, img: SkImage | null, cx: number, cy: number, w: number, rot: number, alpha: number, flip = false) {
  'worklet';
  if (!img || alpha <= 0.01) return;
  const iw = img.width();
  const ih = img.height();
  const h = (w * ih) / iw;
  const p = Skia.Paint();
  p.setAlphaf(clamp01(alpha));
  c.save();
  c.translate(cx, cy);
  if (rot) c.rotate(rot, 0, 0);
  if (flip) c.scale(-1, 1);
  c.drawImageRect(img, Skia.XYWHRect(0, 0, iw, ih), Skia.XYWHRect(-w / 2, -h / 2, w, h), p);
  c.restore();
}

function spriteH(img: SkImage | null, w: number) {
  'worklet';
  return img ? (w * img.height()) / img.width() : w;
}

function glow(c: SkCanvas, x: number, y: number, r: number, colour: string, alpha: number, add = true) {
  'worklet';
  if (r <= 0.5 || alpha <= 0.01) return;
  const p = Skia.Paint();
  p.setShader(Skia.Shader.MakeRadialGradient(vec(x, y), r, [Skia.Color(colour), Skia.Color('rgba(0,0,0,0)')], null, TileMode.Clamp));
  p.setAlphaf(clamp01(alpha));
  if (add) p.setBlendMode(BlendMode.Plus);
  c.drawCircle(x, y, r, p);
}

function dot(c: SkCanvas, x: number, y: number, r: number, colour: string, alpha: number) {
  'worklet';
  if (r <= 0.2 || alpha <= 0.01) return;
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(colour));
  p.setAlphaf(clamp01(alpha));
  c.drawCircle(x, y, r, p);
}

/** A lamp flame: warm glow, an orange outer tongue and a pale core, flickering and swaying. */
export function flame(c: SkCanvas, x: number, y: number, s: number, t: number, seed: number, grow = 1) {
  'worklet';
  if (grow <= 0.01) return;
  const f = (1 + 0.1 * Math.sin(t * 13 + seed) + 0.06 * Math.sin(t * 31 + seed * 2.3)) * grow;
  const sway = s * 0.2 * Math.sin(t * 7 + seed * 1.7);
  glow(c, x, y - s * 0.9, s * 4.5 * f, 'rgba(255,170,70,0.55)', 0.85);
  const h = s * 2.5 * f;
  const w = s * 0.62 * grow;
  const outer = Skia.Path.Make();
  outer.moveTo(x, y + s * 0.25);
  outer.cubicTo(x - w * 1.25, y - h * 0.1, x - w * 0.4 + sway * 0.5, y - h * 0.62, x + sway, y - h);
  outer.cubicTo(x + w * 0.4 + sway * 0.5, y - h * 0.62, x + w * 1.25, y - h * 0.1, x, y + s * 0.25);
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeLinearGradient(vec(x, y + s * 0.3), vec(x, y - h), [Skia.Color('#ff5a00'), Skia.Color('#ffb000'), Skia.Color('rgba(255,140,0,0.05)')], [0, 0.5, 1], TileMode.Clamp),
  );
  c.drawPath(outer, p);
  const h2 = h * 0.55;
  const w2 = w * 0.5;
  const inner = Skia.Path.Make();
  inner.moveTo(x, y + s * 0.15);
  inner.cubicTo(x - w2 * 1.2, y - h2 * 0.1, x - w2 * 0.3 + sway * 0.3, y - h2 * 0.6, x + sway * 0.6, y - h2);
  inner.cubicTo(x + w2 * 0.3 + sway * 0.3, y - h2 * 0.6, x + w2 * 1.2, y - h2 * 0.1, x, y + s * 0.15);
  const q = Skia.Paint();
  q.setAntiAlias(true);
  q.setShader(Skia.Shader.MakeLinearGradient(vec(x, y + s * 0.2), vec(x, y - h2), [Skia.Color('#fffdf0'), Skia.Color('#ffe07a')], null, TileMode.Clamp));
  c.drawPath(inner, q);
}

/** One broad tongue of havan fire, drawn additively so overlapping tongues burn brighter. */
function fireTongue(c: SkCanvas, x: number, y: number, s: number, t: number, seed: number) {
  'worklet';
  const sway = s * 0.35 * Math.sin(t * 5 + seed) + s * 0.15 * Math.sin(t * 11 + seed * 2);
  const h = s * (2.6 + 0.5 * Math.sin(t * 7 + seed * 1.3));
  const w = s * 1.05;
  const path = Skia.Path.Make();
  path.moveTo(x - w, y);
  path.cubicTo(x - w * 1.1, y - h * 0.35, x - w * 0.3 + sway * 0.4, y - h * 0.55, x + sway, y - h);
  path.cubicTo(x + w * 0.3 + sway * 0.4, y - h * 0.55, x + w * 1.1, y - h * 0.35, x + w, y);
  path.close();
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setBlendMode(BlendMode.Plus);
  p.setShader(
    Skia.Shader.MakeLinearGradient(vec(x, y), vec(x, y - h), [Skia.Color('rgba(255,90,10,0.9)'), Skia.Color('rgba(255,160,30,0.75)'), Skia.Color('rgba(255,120,20,0)')], [0, 0.45, 1], TileMode.Clamp),
  );
  c.drawPath(path, p);
  const core = Skia.Path.Make();
  const h2 = h * 0.5;
  const w2 = w * 0.5;
  core.moveTo(x - w2, y);
  core.cubicTo(x - w2, y - h2 * 0.4, x + sway * 0.2, y - h2 * 0.6, x + sway * 0.5, y - h2);
  core.cubicTo(x + sway * 0.2 + w2 * 0.2, y - h2 * 0.6, x + w2, y - h2 * 0.4, x + w2, y);
  core.close();
  const q = Skia.Paint();
  q.setAntiAlias(true);
  q.setBlendMode(BlendMode.Plus);
  q.setShader(Skia.Shader.MakeLinearGradient(vec(x, y), vec(x, y - h2), [Skia.Color('rgba(255,240,180,0.85)'), Skia.Color('rgba(255,200,80,0)')], null, TileMode.Clamp));
  c.drawPath(core, q);
}

/** The havan fire: a bed of embers, rising tongues of flame and sparks; `k` is how fed it is. */
function fire(c: SkCanvas, x: number, y: number, w: number, t: number, k: number) {
  'worklet';
  glow(c, x, y - w * 0.35, w * (1.1 + 0.5 * k), 'rgba(255,120,30,0.55)', 0.85);
  glow(c, x, y, w * 0.55, 'rgba(255,60,10,0.8)', 0.7);
  const n = Math.round(26 + 24 * Math.min(k, 1.6));
  for (let i = 0; i < n; i++) {
    const life = (t * (0.85 + hash(i) * 0.7) + hash(i + 7)) % 1;
    const spread = (hash(i + 13) - 0.5) * w * 0.9 * (1 - life * 0.75);
    const px = x + spread + Math.sin(t * 4 + i) * w * 0.05 * life;
    const py = y - life * w * (0.8 + 0.6 * k) * (0.75 + hash(i + 3) * 0.5);
    const r = w * 0.2 * (1 - life) * (0.6 + hash(i + 5) * 0.6) * (0.8 + 0.25 * Math.min(k, 1.6));
    const col = life < 0.22 ? 'rgba(255,248,210,0.95)' : life < 0.5 ? 'rgba(255,175,45,0.9)' : 'rgba(235,75,20,0.7)';
    glow(c, px, py, Math.max(1, r), col, 1 - life * 0.55);
  }
  // Tongues of flame over the particle bed, so it reads as fire and not only as glow.
  // Irregular: each tongue has its own place, size and rhythm, taller in the middle, and they
  // overlap, so the row never reads as a line of candles.
  const tongues = 9 + Math.round(3 * Math.min(k, 1.5));
  for (let i = 0; i < tongues; i++) {
    const off = (hash(i + 300) - 0.5) * w * 0.8;
    const centre = 1 - Math.min(1, Math.abs(off) / (w * 0.42));
    const pulse = 0.75 + 0.35 * Math.sin(t * (3 + hash(i + 310) * 4) + i * 1.9);
    const size = w * (0.04 + 0.09 * centre * centre + 0.03 * hash(i + 320)) * pulse * (0.8 + 0.3 * Math.min(k, 1.6));
    fireTongue(c, x + off, y + w * (0.03 - 0.03 * hash(i + 330)), size * 1.45, t * (1.1 + hash(i + 340) * 0.6), i * 2.7);
  }
  for (let i = 0; i < 10; i++) {
    const life = (t * 0.55 + hash(i + 40)) % 1;
    const px = x + (hash(i + 50) - 0.5) * w * 0.7 + Math.sin(t * 2 + i * 3) * w * 0.12 * life;
    const py = y - w * (0.25 + life * (0.9 + 0.5 * k));
    dot(c, px, py, w * 0.012 * (1 - life), '#ffd98a', 1 - life);
  }
}

/** Incense smoke: soft puffs that rise, widen, drift and thin out. */
function smoke(c: SkCanvas, x: number, y: number, U: number, t: number, grow: number) {
  'worklet';
  if (grow <= 0.01) return;
  for (let i = 0; i < 12; i++) {
    const life = (t * 0.2 + hash(i + 60)) % 1;
    const px = x + Math.sin(t * 1.2 + i * 1.7 + life * 5) * U * 0.03 * (1 + life * 3);
    const py = y - life * U * 0.6;
    const r = U * (0.014 + life * 0.075);
    const a = 0.75 * (1 - life) * Math.min(1, life * 6) * grow;
    glow(c, px, py, r, 'rgba(205,200,195,0.95)', a, false);
  }
  dot(c, x, y, U * 0.006, '#ff7a2a', 0.9 * grow);
  glow(c, x, y, U * 0.02, 'rgba(255,110,40,0.8)', 0.6 * grow);
}

/** The vessel's pose while pouring: out from its tray button, tilt, pour, tilt back, home. */
function vesselPose(a: number, sx: number, sy: number, px: number, py: number, left: boolean) {
  'worklet';
  const tilt = left ? 28 : -62;
  if (a < 0.7) {
    const k = ease(a / 0.7);
    return { x: lerp(sx, px, k), y: lerp(sy, py, k) - Math.sin(Math.PI * k) * 40, s: lerp(0.45, 1, k), r: 0, alpha: 1 };
  }
  if (a < 1.1) return { x: px, y: py, s: 1, r: tilt * ease((a - 0.7) / 0.4), alpha: 1 };
  if (a < 3.3) return { x: px, y: py, s: 1, r: tilt + Math.sin(a * 6) * 2, alpha: 1 };
  if (a < 3.7) return { x: px, y: py, s: 1, r: tilt * (1 - ease((a - 3.3) / 0.4)), alpha: 1 };
  const k = ease((a - 3.7) / 0.6);
  return { x: lerp(px, sx, k), y: lerp(py, sy, k), s: lerp(1, 0.45, k), r: 0, alpha: 1 - k };
}

function pour(c: SkCanvas, e: StageEvent, a: number, t: number, g: Geo, img: SkImage | null) {
  'worklet';
  const U = g.U;
  const left = e.left === 1;
  const vw = U * 0.3;
  const vh = spriteH(img, vw);
  const px = g.tx + (left ? -1 : 1) * U * 0.22;
  const py = g.ty - U * 0.32;
  // The stone stays wet for a while after: a sheen in the liquid's colour and a few drips.
  if (a > 1.2 && a < 9) {
    const fade = a < 3.3 ? clamp01((a - 1.2) / 0.6) : 1 - clamp01((a - 3.3) / 5.7);
    glow(c, g.tx, g.ty + U * 0.03, U * 0.1, e.colour, 0.55 * fade, false);
    for (let i = 0; i < 5; i++) {
      const d = ((a - 1.4 - i * 0.35) % 1.6) / 1.6;
      if (a - 1.4 - i * 0.35 < 0) continue;
      const dx = g.tx + (hash(e.seed + i) - 0.5) * U * 0.1;
      dot(c, dx, g.ty + U * 0.02 + d * U * 0.2, U * 0.007, e.colour, (1 - d) * fade);
    }
  }
  const pose = vesselPose(a, e.sx, e.sy, px, py, left);
  if (a >= 1.1 && a <= 3.4) {
    const pa = (a - 1.1) / 2.2;
    const rad = (pose.r * Math.PI) / 180;
    const lxl = left ? vw * 0.42 : -vw * 0.46;
    const lyl = left ? -vh * 0.36 : -vh * 0.28;
    const lx = pose.x + lxl * Math.cos(rad) - lyl * Math.sin(rad);
    const ly = pose.y + lxl * Math.sin(rad) + lyl * Math.cos(rad);
    const head = clamp01(pa / 0.12);
    const tail = clamp01((pa - 0.88) / 0.12);
    const y0 = lerp(ly, g.ty, tail);
    const y1 = lerp(ly, g.ty, head);
    const xAt = (yy: number) => lerp(lx, g.tx, Math.pow(clamp01((yy - ly) / (g.ty - ly)), 0.55)) + Math.sin(yy * 0.08 + t * 22) * U * 0.002;
    const path = Skia.Path.Make();
    path.moveTo(xAt(y0), y0);
    for (let k2 = 1; k2 <= 14; k2++) {
      const yy = lerp(y0, y1, k2 / 14);
      path.lineTo(xAt(yy), yy);
    }
    const body = Skia.Paint();
    body.setAntiAlias(true);
    body.setStyle(PaintStyle.Stroke);
    body.setStrokeCap(StrokeCap.Round);
    body.setStrokeWidth(U * 0.018);
    body.setColor(Skia.Color(e.colour));
    body.setAlphaf(0.95);
    c.drawPath(path, body);
    const shine = Skia.Paint();
    shine.setAntiAlias(true);
    shine.setStyle(PaintStyle.Stroke);
    shine.setStrokeCap(StrokeCap.Round);
    shine.setStrokeWidth(U * 0.005);
    shine.setColor(Skia.Color('#ffffff'));
    shine.setAlphaf(0.55);
    c.save();
    c.translate(-U * 0.004, 0);
    c.drawPath(path, shine);
    c.restore();
    for (let i = 0; i < 8; i++) {
      const f = (t * 2.4 + hash(e.seed + i + 80)) % 1;
      const yy = lerp(y0, y1, f);
      dot(c, xAt(yy) + (hash(i + 81) - 0.5) * U * 0.025, yy, U * 0.006, e.colour, 0.9);
    }
    if (head >= 1 && tail < 1) {
      for (let i = 0; i < 16; i++) {
        const life = (t * 1.8 + hash(e.seed + i + 90)) % 1;
        const vx = (hash(i + 91) - 0.5) * U * 0.3;
        const vy = -U * (0.1 + hash(i + 92) * 0.12);
        dot(c, g.tx + vx * life, g.ty + vy * life + U * 0.7 * life * life, U * 0.007 * (1 - life), e.colour, 1 - life);
      }
    }
  }
  sprite(c, img, pose.x, pose.y, vw * pose.s, pose.r, pose.alpha);
}

/** Where piece `i` of a shower lands. */
function landing(e: StageEvent, i: number, g: Geo) {
  'worklet';
  return { x: lerp(g.rx0, g.rx1, hash(e.seed * 3.1 + i)), y: g.ry + (hash(e.seed * 7.7 + i) - 0.5) * g.U * 0.03 };
}

function shower(c: SkCanvas, e: StageEvent, a: number, g: Geo, img: SkImage | null, marigold: SkImage | null) {
  'worklet';
  const U = g.U;
  const px = g.tx;
  const py = g.ty - U * 0.42;
  const n = e.grain ? 44 : e.sprite === 2 ? 3 : 9;
  const pieceW = e.sprite === 2 ? U * 0.11 : U * 0.075;
  for (let i = 0; i < n; i++) {
    const ts = 0.7 + (i * 0.9) / n;
    if (a < ts) continue;
    const d = 0.8 + hash(e.seed + i + 20) * 0.3;
    const k = clamp01((a - ts) / d);
    const land = landing(e, i, g);
    const sx = px + (hash(e.seed + i + 30) - 0.5) * U * 0.08;
    const x = lerp(sx, land.x, k);
    const y = lerp(py + U * 0.05, land.y, k * k);
    const spin = (hash(e.seed + i + 40) - 0.5) * 540;
    if (e.grain) {
      dot(c, x, y, U * 0.0065, e.colour, 1);
      if (i % 5 === 0) dot(c, x + U * 0.004, y, U * 0.004, '#c8102e', 0.9);
    } else {
      sprite(c, e.sprite === 2 ? img : marigold, x, y, pieceW * (0.85 + hash(i) * 0.3), spin * k, 1);
    }
  }
  // The dish itself: out, a gentle shake while the pieces fall, and back.
  if (a < 2.3) {
    const k = ease(a / 0.6);
    const back = ease((a - 1.8) / 0.5);
    const x = lerp(lerp(e.sx, px, k), e.sx, back);
    const y = lerp(lerp(e.sy, py, k), e.sy, back);
    sprite(c, img, x, y, U * lerp(0.2, 0.26, k), a > 0.6 && a < 1.8 ? Math.sin(a * 18) * 8 - 18 : 0, 1 - back);
  }
}

function flyTo(a: number, dur: number, sx: number, sy: number, x: number, y: number) {
  'worklet';
  const k = ease(a / dur);
  return { x: lerp(sx, x, k), y: lerp(sy, y, k) - Math.sin(Math.PI * k) * 50, k };
}

/** Draws one frame. */
export function drawStage(c: SkCanvas, t: number, events: readonly StageEvent[], g: Geo, imgs: readonly (SkImage | null)[], aarti: Aarti) {
  'worklet';
  const U = g.U;
  const marigold = imgs[18];
  // The havan fire burns from the start and grows with every offering.
  if (g.hasFire) {
    let k = 0.35;
    for (const e of events) {
      if (e.kind !== K.AHUTI) continue;
      const a = t - e.t0;
      if (a > 0.8) k += 0.09 + 0.9 * Math.exp(-(a - 0.8) * 1.6);
    }
    fire(c, g.fx, g.fy, g.fw, t, Math.min(k, 2));
  }

  // Everything that has come to rest, then what is moving over it.
  for (const e of events) {
    const a = t - e.t0;
    if (a < 0) continue;
    const img = imgs[e.sprite];
    if (e.kind === K.PLACE) {
      const spot = { x: lerp(g.rx0, g.rx1, 0.25 + hash(e.seed) * 0.5), y: g.ry - U * 0.02 };
      const p = flyTo(a, 0.9, e.sx, e.sy, spot.x, spot.y);
      sprite(c, img, p.x, p.y, U * lerp(0.2, 0.14, p.k), 0, 1);
    } else if (e.kind === K.LIGHT) {
      const p = flyTo(a, 0.8, e.sx, e.sy, g.lx, g.ly);
      const w = U * lerp(0.24, 0.2, p.k);
      sprite(c, img, p.x, p.y, w, 0, 1);
      const h = spriteH(img, w);
      flame(c, p.x - w * 0.36, p.y - h * 0.22, U * 0.03, t, e.seed, ease((a - 0.9) / 0.5));
    } else if (e.kind === K.SMOKE) {
      const p = flyTo(a, 0.8, e.sx, e.sy, g.ix, g.iy);
      const w = U * 0.1;
      sprite(c, img, p.x, p.y, w, 0, 1);
      const h = spriteH(img, w);
      smoke(c, p.x - w * 0.1, p.y - h * 0.47, U, t + e.seed, ease((a - 0.9) / 0.6));
      smoke(c, p.x + w * 0.12, p.y - h * 0.47, U, t + e.seed + 3.3, ease((a - 1.1) / 0.6));
    }
  }
  for (const e of events) {
    const a = t - e.t0;
    if (a < 0) continue;
    const img = imgs[e.sprite];
    if (e.kind === K.POUR && a < 9) pour(c, e, a, t, g, img);
    else if (e.kind === K.SHOWER) shower(c, e, a, g, img, marigold);
    else if (e.kind === K.AHUTI && a < 2.2) {
      const p = flyTo(a, 0.8, e.sx, e.sy, g.fx, g.fy - U * 0.05);
      sprite(c, img, p.x, p.y, U * lerp(0.22, 0.1, p.k), p.k * 30, 1 - clamp01((a - 0.65) / 0.2));
      if (a > 0.8) {
        for (let i = 0; i < 18; i++) {
          const life = clamp01((a - 0.8) / (0.7 + hash(e.seed + i) * 0.6));
          const vx = (hash(e.seed + i + 5) - 0.5) * U * 0.35;
          const vy = -U * (0.25 + hash(e.seed + i + 6) * 0.35);
          dot(c, g.fx + vx * life, g.fy - U * 0.05 + vy * life + U * 0.25 * life * life, U * 0.008 * (1 - life), '#ffd27a', 1 - life);
        }
      }
    } else if (e.kind === K.CONCH && a < 3.4) {
      const fadeIn = ease(a / 0.4);
      const out = 1 - clamp01((a - 2.8) / 0.6);
      const cx = g.W * 0.5;
      const cy = g.H * 0.36;
      for (let r = 0; r < 3; r++) {
        const rr = (a * 0.7 + r / 3) % 1;
        const p = Skia.Paint();
        p.setAntiAlias(true);
        p.setStyle(PaintStyle.Stroke);
        p.setStrokeWidth(U * 0.006);
        p.setColor(Skia.Color('#ffd98a'));
        p.setAlphaf(0.6 * (1 - rr) * out);
        c.drawCircle(cx, cy, U * (0.16 + 0.5 * rr), p);
      }
      glow(c, cx, cy, U * 0.3, 'rgba(255,220,150,0.5)', 0.8 * out);
      sprite(c, img, cx, cy, U * 0.34 * lerp(0.6, 1, fadeIn), Math.sin(a * 2) * 4 - 20, fadeIn * out);
    } else if (e.kind === K.BLESS && a < 8) {
      glow(c, g.tx, g.ty, U * 0.45, 'rgba(255,215,120,0.6)', 0.9 * Math.sin(Math.min(1, a / 5) * Math.PI));
      for (let i = 0; i < 36; i++) {
        const ts = hash(i + 200) * 3;
        const k = (a - ts) / 3.5;
        if (k < 0 || k > 1) continue;
        const x = hash(i + 210) * g.W + Math.sin(a * 2 + i) * U * 0.05;
        sprite(c, marigold, x, lerp(-U * 0.1, g.H * 0.92, k), U * 0.06, k * 400 * (hash(i + 220) - 0.5), 1 - clamp01((k - 0.85) / 0.15));
      }
    }
  }

  // The bell hangs once rung, and swings from its top with each ring.
  let lastBell = -1;
  for (const e of events) if (e.kind === K.BELL && t >= e.t0) lastBell = e.t0;
  if (lastBell >= 0) {
    const a = t - lastBell;
    const w = U * 0.14;
    const h = spriteH(imgs[3], w);
    const swing = 24 * Math.sin(a * 10) * Math.exp(-a * 1.2);
    c.save();
    c.rotate(swing, g.bx, g.by - h * 0.5);
    sprite(c, imgs[3], g.bx, g.by, w, 0, 1);
    c.restore();
    if (a < 1.4) {
      for (let r = 0; r < 3; r++) {
        const rr = clamp01(a / 1.4 - r * 0.18);
        if (rr <= 0) continue;
        const p = Skia.Paint();
        p.setAntiAlias(true);
        p.setStyle(PaintStyle.Stroke);
        p.setStrokeWidth(U * 0.005);
        p.setColor(Skia.Color('#ffe2a0'));
        p.setAlphaf(0.7 * (1 - rr));
        c.drawCircle(g.bx, g.by + h * 0.3, U * (0.08 + rr * 0.18), p);
      }
    }
  }

  // Aarti: the lit thali follows the reader's finger around the deity.
  if (aarti.on) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(U * 0.004);
    p.setColor(Skia.Color('#ffe2a0'));
    p.setAlphaf(0.45);
    p.setPathEffect(Skia.PathEffect.MakeDash([U * 0.02, U * 0.018], t * 20));
    c.drawCircle(g.tx, g.ty, U * 0.26, p);
    const w = U * 0.3;
    const h = spriteH(imgs[0], w);
    glow(c, aarti.x, aarti.y, U * 0.25, 'rgba(255,190,90,0.5)', 0.7);
    sprite(c, imgs[0], aarti.x, aarti.y, w, 0, 1);
    flame(c, aarti.x - w * 0.21, aarti.y - h * 0.12, U * 0.032, t, 5);
  }
}
