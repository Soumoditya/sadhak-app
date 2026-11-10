import React, { memo } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText, Ellipse, Line, Rect } from 'react-native-svg';

// Sadhak's own emblem set: line art of the symbols each deity, scripture or
// idea is known by (Shiva's trishul, Vishnu's chakra, Lakshmi's lotus…), set in
// a medallion. Used instead of photos so every screen has one visual language.

export type EmblemName =
  | 'trishul' | 'chakra' | 'lotus' | 'gada' | 'flute' | 'veena' | 'bow' | 'sun' | 'om'
  | 'diya' | 'kalash' | 'modak' | 'mukut' | 'book' | 'yajna' | 'dharmachakra' | 'scales'
  | 'moon' | 'colours' | 'flame' | 'shani' | 'guru' | 'bell' | 'shankh';

const C = 50;
const rad = (d: number) => (d - 90) * (Math.PI / 180);
const pt = (deg: number, r: number) => `${(C + r * Math.cos(rad(deg))).toFixed(2)} ${(C + r * Math.sin(rad(deg))).toFixed(2)}`;
const spokes = (n: number, r0: number, r1: number, off = 0) =>
  Array.from({ length: n }, (_, i) => `M${pt(off + (i * 360) / n, r0)} L${pt(off + (i * 360) / n, r1)}`).join(' ');
const teeth = (n: number, r0: number, r1: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n, w = 180 / n;
    return `M${pt(a - w * 0.6, r0)} L${pt(a, r1)} L${pt(a + w * 0.6, r0)}`;
  }).join(' ');

/** Line-art glyphs in a 100×100 box. `f` = filled shapes, `s` = strokes. */
function Glyph({ name, ink }: { name: EmblemName; ink: string }) {
  const S = { stroke: ink, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const F = { fill: ink };
  switch (name) {
    case 'trishul':
      return (
        <G>
          <Path {...S} d="M50 34 L50 82" />
          <Path {...F} d="M50 18 C46 25 45 30 50 36 C55 30 54 25 50 18 Z" />
          <Path {...S} d="M33 22 C31 36 39 43 50 43 C61 43 69 36 67 22" />
          <Path {...S} d="M33 22 L30 18 M67 22 L70 18" />
          <Path {...F} d="M43 56 L57 56 L50 61 Z M43 66 L57 66 L50 61 Z" />
          <Path {...S} strokeWidth={2} d="M57 59 C62 58 64 62 61 64" />
        </G>
      );
    case 'chakra':
      return (
        <G>
          <Circle {...S} cx={C} cy={C} r={17} />
          <Circle {...F} cx={C} cy={C} r={4.5} />
          <Path {...S} strokeWidth={2.2} d={spokes(12, 5, 17)} />
          <Path {...S} strokeWidth={2.4} d={teeth(16, 19.5, 26)} />
        </G>
      );
    case 'dharmachakra':
      return (
        <G>
          <Circle {...S} cx={C} cy={C} r={24} />
          <Circle {...S} strokeWidth={2} cx={C} cy={C} r={19} />
          <Circle {...F} cx={C} cy={C} r={5} />
          <Path {...S} strokeWidth={2.6} d={spokes(8, 5, 19)} />
          <Path {...S} strokeWidth={2.6} d={spokes(8, 24, 29)} />
        </G>
      );
    case 'lotus':
      return (
        <G>
          <Path {...S} d="M50 28 C41 40 41 55 50 64 C59 55 59 40 50 28 Z" />
          <Path {...S} d="M50 64 C38 61 30 51 30 39 C40 43 47 52 50 64 Z" />
          <Path {...S} d="M50 64 C62 61 70 51 70 39 C60 43 53 52 50 64 Z" />
          <Path {...S} d="M50 64 C36 67 24 61 19 52 C32 50 42 55 50 64 Z" />
          <Path {...S} d="M50 64 C64 67 76 61 81 52 C68 50 58 55 50 64 Z" />
          <Path {...S} d="M32 72 Q50 78 68 72" />
        </G>
      );
    case 'gada':
      return (
        <G>
          <Path {...S} strokeWidth={4} d="M50 50 L50 84" />
          <Ellipse {...S} cx={C} cy={36} rx={13} ry={15} />
          <Path {...S} strokeWidth={2} d="M38 31 Q50 36 62 31 M37 40 Q50 45 63 40" />
          <Circle {...F} cx={C} cy={18} r={3.4} />
          <Path {...S} d="M44 54 L56 54 M45 76 L55 76" />
        </G>
      );
    case 'flute':
      return (
        <G>
          <Path {...S} strokeWidth={6} d="M20 74 L70 38" />
          <Path stroke="rgba(0,0,0,0.35)" strokeWidth={2.4} strokeLinecap="round" d="M32 66 L33 65 M39 61 L40 60 M46 56 L47 55 M53 51 L54 50" />
          <Path {...S} strokeWidth={2.6} d="M72 16 C82 24 82 36 72 44 C64 36 63 24 72 16 Z" />
          <Ellipse {...F} cx={72} cy={31} rx={3.6} ry={5} />
          <Path {...S} strokeWidth={1.8} d="M72 44 L70 52" />
        </G>
      );
    case 'veena':
      return (
        <G>
          <Circle {...S} cx={30} cy={68} r={11} />
          <Circle {...S} cx={73} cy={30} r={7} />
          <Path {...S} strokeWidth={4} d="M38 60 L67 35" />
          <Path {...S} strokeWidth={1.6} d="M44 52 L48 57 M50 47 L54 52 M56 42 L60 47" />
          <Path {...S} strokeWidth={1.4} d="M26 72 L78 26" />
        </G>
      );
    case 'bow':
      return (
        <G>
          <Path {...S} d="M36 18 Q78 50 36 82" />
          <Path {...S} strokeWidth={1.8} d="M36 18 L36 82" />
          <Path {...S} d="M18 50 L80 50" />
          <Path {...S} d="M80 50 L71 44 M80 50 L71 56" />
          <Path {...S} strokeWidth={2.2} d="M18 50 L13 45 M18 50 L13 55 M24 50 L19 45 M24 50 L19 55" />
        </G>
      );
    case 'sun':
      return (
        <G>
          <Circle {...F} cx={C} cy={C} r={12} />
          <Circle {...S} cx={C} cy={C} r={17} strokeWidth={2} />
          <Path {...S} d={spokes(12, 21, 29)} />
          <Path {...S} strokeWidth={2} d={spokes(12, 22, 26, 15)} />
        </G>
      );
    case 'om':
      return <SvgText x={C} y={70} fontSize={58} fill={ink} textAnchor="middle">ॐ</SvgText>;
    case 'diya':
      return (
        <G>
          <Path {...F} d="M50 22 C43 33 43 42 50 48 C57 42 57 33 50 22 Z" />
          <Path {...S} d="M24 56 Q50 82 76 56 Z" />
          <Path {...S} d="M70 58 L80 54" />
          <Path {...S} d="M40 76 L60 76" />
        </G>
      );
    case 'kalash':
      return (
        <G>
          <Circle {...S} cx={C} cy={28} r={7} />
          <Path {...S} d="M38 38 Q50 30 62 38 M38 38 Q30 33 28 28 M62 38 Q70 33 72 28" />
          <Path {...S} d="M40 40 L60 40 L58 46 L42 46 Z" />
          <Path {...S} d="M42 46 C26 54 28 78 50 80 C72 78 74 54 58 46" />
          <Path {...S} strokeWidth={2} d="M34 62 Q50 68 66 62" />
        </G>
      );
    case 'modak':
      return (
        <G>
          <Path {...S} d="M50 22 C42 36 30 52 31 64 C32 76 68 76 69 64 C70 52 58 36 50 22 Z" />
          <Path {...S} strokeWidth={2} d="M50 22 C46 40 42 56 42 72 M50 22 C54 40 58 56 58 72 M50 22 L50 74" />
          <Path {...S} d="M28 78 L72 78" />
        </G>
      );
    case 'mukut':
      return (
        <G>
          <Path {...S} d="M26 66 L30 38 L40 52 L50 28 L60 52 L70 38 L74 66 Z" />
          <Rect {...S} x={25} y={66} width={50} height={9} rx={2} />
          <Circle {...F} cx={50} cy={50} r={3.5} />
          <Circle {...F} cx={36} cy={58} r={2.4} />
          <Circle {...F} cx={64} cy={58} r={2.4} />
          <Circle {...F} cx={50} cy={24} r={2.6} />
        </G>
      );
    case 'book':
      return (
        <G>
          <Path {...S} d="M50 34 C42 28 30 28 22 32 L22 72 C30 68 42 68 50 74 C58 68 70 68 78 72 L78 32 C70 28 58 28 50 34 Z" />
          <Path {...S} d="M50 34 L50 74" />
          <Path {...S} strokeWidth={1.8} d="M29 42 Q36 39 43 42 M29 50 Q36 47 43 50 M57 42 Q64 39 71 42 M57 50 Q64 47 71 50" />
        </G>
      );
    case 'yajna':
      return (
        <G>
          <Path {...F} d="M50 20 C40 34 40 46 50 54 C60 46 60 34 50 20 Z" />
          <Path {...S} strokeWidth={2.4} d="M38 54 C33 46 36 40 40 36 M62 54 C67 46 64 40 60 36" />
          <Path {...S} d="M28 58 L72 58 L65 76 L35 76 Z" />
          <Path {...S} strokeWidth={2} d="M32 66 L68 66" />
        </G>
      );
    case 'scales':
      return (
        <G>
          <Path {...S} d="M50 22 L50 76 M38 78 L62 78 M24 32 L76 32" />
          <Circle {...F} cx={C} cy={22} r={3} />
          <Path {...S} strokeWidth={1.8} d="M24 32 L16 54 M24 32 L32 54 M76 32 L68 54 M76 32 L84 54" />
          <Path {...S} d="M14 54 Q24 64 34 54 Z M66 54 Q76 64 86 54 Z" />
        </G>
      );
    case 'moon':
      return (
        <G>
          <Path {...F} d="M60 20 C42 22 30 36 30 52 C30 68 44 80 60 80 C48 74 42 64 42 50 C42 36 48 26 60 20 Z" />
          <Path {...S} strokeWidth={2} d="M68 34 L68 42 M64 38 L72 38 M72 56 L72 62 M69 59 L75 59" />
        </G>
      );
    case 'colours':
      return (
        <G>
          <Circle {...F} cx={40} cy={44} r={12} />
          <Circle {...S} cx={60} cy={42} r={12} />
          <Circle {...S} cx={50} cy={60} r={12} />
          <Circle {...F} cx={74} cy={64} r={3} />
          <Circle {...F} cx={26} cy={66} r={2.5} />
          <Circle {...F} cx={70} cy={24} r={2.5} />
        </G>
      );
    case 'flame':
      return (
        <G>
          <Circle {...S} cx={C} cy={C} r={26} strokeWidth={2} />
          <Path {...F} d="M50 26 C38 42 38 56 50 66 C62 56 62 42 50 26 Z" />
          <Path fill="rgba(0,0,0,0.25)" d="M50 44 C45 51 45 57 50 62 C55 57 55 51 50 44 Z" />
        </G>
      );
    case 'shani':
      return (
        <G>
          <Circle {...F} cx={C} cy={C} r={13} />
          <Ellipse {...S} cx={C} cy={C} rx={27} ry={8} transform="rotate(-20 50 50)" />
        </G>
      );
    case 'guru':
      return (
        <G>
          <Path {...S} d="M22 74 L78 74" />
          <Path {...S} d="M30 74 C30 60 40 54 50 54 C60 54 70 60 70 74" />
          <Circle {...S} cx={C} cy={40} r={9} />
          <Path {...S} strokeWidth={2} d="M34 36 A16 16 0 0 1 66 36" />
        </G>
      );
    case 'bell':
      return (
        <G>
          <Path {...S} d="M50 18 L50 26" />
          <Path {...S} d="M36 64 C36 44 38 28 50 28 C62 28 64 44 64 64 Z" />
          <Path {...S} d="M30 66 L70 66" />
          <Circle {...F} cx={C} cy={73} r={4} />
        </G>
      );
    case 'shankh':
      return (
        <G>
          <Path {...S} d="M30 62 C26 44 40 26 58 26 C70 26 76 36 72 46 C68 56 58 54 56 48 C54 42 60 40 62 44" />
          <Path {...S} d="M30 62 C42 70 58 72 72 62 L66 76 C54 80 40 78 30 62 Z" />
          <Path {...S} strokeWidth={2} d="M72 46 L80 52" />
        </G>
      );
  }
}

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

type Props = { name: EmblemName; size?: number; color?: string; plain?: boolean; ink?: string };

/** A medallion with the emblem in cream line art. `plain` drops the medallion. */
function Emblem({ name, size = 56, color = '#C2410C', plain, ink }: Props) {
  const id = `em-${name}-${color.replace('#', '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {!plain && (
        <>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={shade(color, 0.1)} />
              <Stop offset="1" stopColor={shade(color, -0.2)} />
            </LinearGradient>
          </Defs>
          <Circle cx={C} cy={C} r={49} fill={`url(#${id})`} />
          <Circle cx={C} cy={C} r={44} fill="none" stroke="rgba(255,236,200,0.35)" strokeWidth={1.2} />
        </>
      )}
      <G transform={plain ? undefined : 'translate(50 50) scale(0.82) translate(-50 -50)'}>
        <Glyph name={name} ink={ink || (plain ? color : '#FFF1DA')} />
      </G>
    </Svg>
  );
}

export default memo(Emblem);

/** Emblem for a deity name as used across the app ("Lord Shiva", "Shani Dev"…). */
export function emblemForDeity(deity: string): EmblemName {
  const rules: [RegExp, EmblemName][] = [
    [/ganesh|ganapat|vinayak/i, 'modak'], [/shiv|mahadev|shankar|rudra/i, 'trishul'],
    [/lakshmi|laxmi/i, 'lotus'], [/hanuman|bajrang/i, 'gada'], [/durga|devi|ambe|amba|kali/i, 'mukut'],
    [/krishna|kunj|govind|madhav|gopal/i, 'flute'], [/saraswati|sarasvati/i, 'veena'],
    [/surya|savitr|sun/i, 'sun'], [/shani/i, 'shani'], [/rama?\b|raghu|sita/i, 'bow'],
    [/vishnu|satyanarayan|jagdish|hari|narayan/i, 'chakra'], [/guru/i, 'guru'],
    [/peace|shanti/i, 'dharmachakra'], [/morning|pavamana|prayer|surrender/i, 'om'],
  ];
  return rules.find(([rx]) => rx.test(deity))?.[1] || 'om';
}
