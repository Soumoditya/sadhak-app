import React from 'react';
import Svg, { Rect, Line, Polygon, Text as SvgText, TSpan, G, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

// Kundli chart in the three regional styles:
//  • north: houses fixed (diamond), signs rotate with the lagna
//  • south: signs fixed in a 4×4 frame, lagna marked
//  • east (Bengal/Odisha): signs fixed, Aries at top, anticlockwise
// Each graha shows its short name plus marks in brackets: R retrograde,
// C combust, V vargottama, e.g. Sa(R) or Me(R,C).

export type ChartStyle = 'north' | 'south' | 'east';
export type ChartGraha = { name: string; signIndex: number; house: number; retro?: boolean };
export type Flags = Record<string, { retro?: boolean; combust?: boolean; vargottama?: boolean }>;

export const ABBR: Record<string, Record<string, string>> = {
  en: { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Lagna: 'As' },
  hi: { Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के', Lagna: 'ल' },
  bn: { Sun: 'র', Moon: 'চ', Mars: 'ম', Mercury: 'বু', Jupiter: 'বৃ', Venus: 'শু', Saturn: 'শ', Rahu: 'রা', Ketu: 'কে', Lagna: 'ল' },
};
const S = 300;

interface Props {
  grahas: ChartGraha[];
  lagnaSignIndex: number;
  flags?: Flags;
  style?: ChartStyle;
  size?: number;
  lang?: string;
  colors: { text: string; textSecondary: string; textTertiary: string; primary: string; cardBorder: string; surface: string; surfaceSecondary: string };
}

export default function KundliChart({ grahas, lagnaSignIndex, flags = {}, style = 'north', size = 300, lang = 'en', colors }: Props) {
  const abbr = ABBR[lang === 'mr' ? 'hi' : lang === 'as' ? 'bn' : lang] || ABBR.en;
  const line = { stroke: colors.primary, strokeWidth: 1.2 };
  const RX = 10;
  const bySign: Record<number, ChartGraha[]> = {};
  for (let i = 0; i < 12; i++) bySign[i] = [];
  grahas.forEach((g) => bySign[g.signIndex]?.push(g));

  // Rough text widths (SVG can't measure): Latin capitals are wider than
  // lower case; Indic glyphs are wider still.
  const textW = (str: string, fs: number) => [...str].reduce((w, c) => w + (/[ऀ-৿]/.test(c) ? fs * 0.78 : /[A-Z]/.test(c) ? fs * 0.7 : fs * 0.56), 0);
  // Marks in brackets after the name: Sa(R), Me(R,C), Ju(V).
  const marksOf = (g: ChartGraha) => {
    const f = flags[g.name] || {};
    const m = [f.retro || g.retro ? 'R' : '', f.combust ? 'C' : '', f.vargottama ? 'V' : ''].filter(Boolean);
    return m.length ? `(${m.join(',')})` : '';
  };
  const MARK = 0.78; // marks font size relative to the name
  const itemW = (g: ChartGraha, fs: number) => {
    const m = marksOf(g);
    return textW(abbr[g.name] || g.name.slice(0, 2), fs) + (m ? textW(m, fs * MARK) * 0.8 + 1 : 0);
  };

  // Name and its bracketed marks on one baseline, centred on x so neighbours
  // never collide.
  const label = (g: ChartGraha, x: number, y: number, fs: number, key: string) => {
    const name = abbr[g.name] || g.name.slice(0, 2);
    const marks = marksOf(g);
    const nameW = textW(name, fs);
    const x0 = x - itemW(g, fs) / 2;
    const isLuminary = g.name === 'Sun' || g.name === 'Moon';
    return (
      <G key={key}>
        <SvgText x={x0} y={y} fontSize={fs} fontWeight="700" textAnchor="start" fill={isLuminary ? colors.primary : colors.text}>{name}</SvgText>
        {!!marks && <SvgText x={x0 + nameW + 1} y={y} fontSize={fs * MARK} fontWeight="700" textAnchor="start" fill={colors.textSecondary}>{marks}</SvgText>}
      </G>
    );
  };

  // Lay out the grahas of one cell in centred rows that fit maxW.
  const cell = (list: ChartGraha[], cx: number, cy: number, maxW: number, keyBase: string, extraTop = 0, tight = false, maxCols = 3) => {
    const n = list.length;
    if (!n) return null;
    const fs = tight ? (n > 2 ? 10 : 11) : n > 4 ? 10.5 : 12.5;
    const gap = tight ? 5 : 8;
    const rows: ChartGraha[][] = [];
    let row: ChartGraha[] = [], w = 0;
    for (const g of list) {
      const iw = itemW(g, fs);
      if (row.length && (w + gap + iw > maxW || row.length >= maxCols)) { rows.push(row); row = []; w = 0; }
      w += (row.length ? gap : 0) + iw; row.push(g);
    }
    if (row.length) rows.push(row);
    const lh = fs + (tight ? 4 : 5);
    const y0 = cy - ((rows.length - 1) * lh) / 2 + fs * 0.35 + extraTop;
    return rows.flatMap((r, ri) => {
      const total = r.reduce((t, g, i) => t + itemW(g, fs) + (i ? gap : 0), 0);
      let x = cx - total / 2;
      return r.map((g) => {
        const iw = itemW(g, fs);
        const el = label(g, x + iw / 2, y0 + ri * lh, fs, `${keyBase}-${g.name}`);
        x += iw + gap;
        return el;
      });
    });
  };

  const bg = (
    <>
      <Defs>
        <LinearGradient id="kbg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surface} />
          <Stop offset="1" stopColor={colors.surfaceSecondary} />
        </LinearGradient>
        <ClipPath id="kclip"><Rect x={0} y={0} width={S} height={S} rx={RX} /></ClipPath>
      </Defs>
      <Rect x={0} y={0} width={S} height={S} rx={RX} fill="url(#kbg)" />
    </>
  );
  // All division lines go in one layer: the opacity is applied to the layer,
  // so crossings and shared edges are never darker than a single line, and
  // the clip makes lines meet the rounded frame exactly.
  const grid = (children: React.ReactNode) => (
    <G clipPath="url(#kclip)" opacity={0.5}>{children}</G>
  );
  const frame = <Rect x={0.9} y={0.9} width={S - 1.8} height={S - 1.8} rx={RX - 0.9} fill="none" stroke={colors.primary} strokeOpacity={0.75} strokeWidth={1.8} />;

  // Sign number, always in brackets and in the same corner of its cell.
  const num = (sign: number, x: number, y: number, anchor: 'start' | 'middle' | 'end' = 'middle', lagna = false, withAs = false) => (
    <SvgText x={x} y={y} fontSize={9.5} fontWeight={lagna ? '800' : '700'} fill={lagna ? colors.primary : colors.textTertiary} textAnchor={anchor}>
      {`${sign + 1}${withAs ? ` ${abbr.Lagna}` : ''}`}
    </SvgText>
  );

  if (style === 'north') {
    const MID = S / 2;
    // Inner corner of each house (towards the centre); the number sits there
    // and the planets keep to the outer, roomier part of the cell.
    const APEX: Record<number, [number, number]> = {
      1: [0.5, 0.5], 4: [0.5, 0.5], 7: [0.5, 0.5], 10: [0.5, 0.5],
      2: [0.25, 0.25], 3: [0.25, 0.25], 5: [0.25, 0.75], 6: [0.25, 0.75],
      8: [0.75, 0.75], 9: [0.75, 0.75], 11: [0.75, 0.25], 12: [0.75, 0.25],
    };
    // Centroids for houses 1..12 and their polygons (for the lagna tint).
    const POS: Record<number, [number, number]> = {
      1: [0.5, 0.25], 2: [0.25, 0.1], 3: [0.1, 0.25], 4: [0.25, 0.5], 5: [0.1, 0.75], 6: [0.25, 0.9],
      7: [0.5, 0.75], 8: [0.75, 0.9], 9: [0.9, 0.75], 10: [0.75, 0.5], 11: [0.9, 0.25], 12: [0.75, 0.1],
    };
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        {bg}
        <Polygon points={`${MID},0 ${S * 0.75},${S * 0.25} ${MID},${MID} ${S * 0.25},${S * 0.25}`} fill={colors.primary} fillOpacity={0.09} />
        {grid(<>
          <Line x1={0} y1={0} x2={S} y2={S} {...line} />
          <Line x1={S} y1={0} x2={0} y2={S} {...line} />
          <Polygon points={`${MID},0 ${S},${MID} ${MID},${S} 0,${MID}`} fill="none" {...line} strokeLinejoin="miter" />
        </>)}
        {frame}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
          const [fx, fy] = POS[house];
          const [ax, ay] = APEX[house];
          const sign = (lagnaSignIndex + house - 1) % 12;
          const diamond = [1, 4, 7, 10].includes(house);
          const side = [3, 5, 9, 11].includes(house);
          const k = diamond ? 0.34 : 0.5;
          const nx = (ax + (fx - ax) * k) * S;
          const ny = (ay + (fy - ay) * k) * S + 3.5;
          const list = bySign[sign];
          // Planets: diamonds stay at the centroid nudged outward; triangles
          // likewise, with side triangles stacking in at most two columns.
          const px = (fx + (fx - ax) * (diamond ? 0.12 : side ? 0.12 : 0)) * S;
          const py = (fy + (fy - ay) * (diamond ? 0.12 : side ? 0 : 0.12)) * S + 2;
          return (
            <G key={house}>
              {num(sign, nx, ny, 'middle', house === 1)}
              {house === 1 && <SvgText x={MID} y={ny - 12} fontSize={9} fontWeight="800" fill={colors.primary} textAnchor="middle">{abbr.Lagna}</SvgText>}
              {cell(list, px, py, diamond ? 80 : side ? 40 : 60, `h${house}`, 0, !diamond && list.length > 2, side ? 2 : 3)}
            </G>
          );
        })}
      </Svg>
    );
  }

  if (style === 'south') {
    const c = S / 4;
    const SLOT: [number, number][] = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]];
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        {bg}
        {SLOT.map(([col, row], sign) => sign === lagnaSignIndex
          ? <Rect key={`f${sign}`} x={col * c} y={row * c} width={c} height={c} fill={colors.primary} fillOpacity={0.09} clipPath="url(#kclip)" />
          : null)}
        {grid(<>
          {[c, 2 * c, 3 * c].map((v) => <Line key={`v${v}`} x1={v} y1={0} x2={v} y2={v === 2 * c ? c : S} {...line} />)}
          <Line x1={2 * c} y1={3 * c} x2={2 * c} y2={S} {...line} />
          {[c, 2 * c, 3 * c].map((v) => <Line key={`h${v}`} x1={0} y1={v} x2={v === 2 * c ? c : S} y2={v} {...line} />)}
          <Line x1={3 * c} y1={2 * c} x2={S} y2={2 * c} {...line} />
        </>)}
        {frame}
        {SLOT.map(([col, row], sign) => {
          const x = col * c, y = row * c;
          const isLagna = sign === lagnaSignIndex;
          return (
            <G key={sign}>
              {isLagna && <Line x1={x} y1={y + 16} x2={x + 16} y2={y} stroke={colors.primary} strokeWidth={1.6} />}
              {num(sign, x + c - 5, y + 12, 'end', isLagna)}
              {cell(bySign[sign], x + c / 2, y + c / 2 + 5, c - 8, `s${sign}`)}
            </G>
          );
        })}
        <SvgText x={S / 2} y={S / 2 + 4} fontSize={12} fontWeight="800" fill={colors.primary} fillOpacity={0.6} textAnchor="middle">{lang === 'en' ? 'Rashi' : lang === 'bn' || lang === 'as' ? 'রাশি' : 'राशि'}</SvgText>
      </Svg>
    );
  }

  // East (Bengali) chart
  const t = S / 3;
  type Cell = { sign: number; pts: [number, number][] };
  const cells: Cell[] = [
    { sign: 0, pts: [[t, 0], [2 * t, 0], [2 * t, t], [t, t]] },
    { sign: 1, pts: [[0, 0], [t, 0], [t, t]] },
    { sign: 2, pts: [[0, 0], [0, t], [t, t]] },
    { sign: 3, pts: [[0, t], [t, t], [t, 2 * t], [0, 2 * t]] },
    { sign: 4, pts: [[0, 2 * t], [0, S], [t, 2 * t]] },
    { sign: 5, pts: [[0, S], [t, S], [t, 2 * t]] },
    { sign: 6, pts: [[t, 2 * t], [2 * t, 2 * t], [2 * t, S], [t, S]] },
    { sign: 7, pts: [[2 * t, S], [S, S], [2 * t, 2 * t]] },
    { sign: 8, pts: [[S, 2 * t], [S, S], [2 * t, 2 * t]] },
    { sign: 9, pts: [[2 * t, t], [S, t], [S, 2 * t], [2 * t, 2 * t]] },
    { sign: 10, pts: [[S, 0], [S, t], [2 * t, t]] },
    { sign: 11, pts: [[2 * t, 0], [S, 0], [2 * t, t]] },
  ];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
      {bg}
      {cells.map(({ sign, pts }) => sign === lagnaSignIndex
        ? <Polygon key={`f${sign}`} points={pts.map((p) => p.join(',')).join(' ')} fill={colors.primary} fillOpacity={0.1} clipPath="url(#kclip)" />
        : null)}
      {grid(<>
        <Line x1={t} y1={0} x2={t} y2={S} {...line} />
        <Line x1={2 * t} y1={0} x2={2 * t} y2={S} {...line} />
        <Line x1={0} y1={t} x2={S} y2={t} {...line} />
        <Line x1={0} y1={2 * t} x2={S} y2={2 * t} {...line} />
        <Line x1={0} y1={0} x2={t} y2={t} {...line} />
        <Line x1={S} y1={0} x2={2 * t} y2={t} {...line} />
        <Line x1={0} y1={S} x2={t} y2={2 * t} {...line} />
        <Line x1={S} y1={S} x2={2 * t} y2={2 * t} {...line} />
      </>)}
      {frame}
      {cells.map(({ sign, pts }) => {
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const tri = pts.length === 3;
        const isLagna = sign === lagnaSignIndex;
        // Triangles: the number goes in the right-angle corner, planets in
        // the opposite (wider) part. Squares: number top-right like South.
        let label: React.ReactNode;
        let px = cx, py = cy + 4;
        if (tri) {
          const v = pts.find((p) => pts.filter((q) => q !== p && (q[0] === p[0] || q[1] === p[1])).length === 2) || pts[0];
          // Tuck the number into the corner: anchor away from the walls.
          const right = v[0] > cx, below = v[1] > cy;
          label = num(sign, v[0] + (right ? -5 : 5), v[1] + (below ? -6 : 13), right ? 'end' : 'start', isLagna, isLagna);
          px = cx + (cx - v[0]) * 0.08;
          py = cy + (cy - v[1]) * 0.08 + 4;
        } else {
          const maxX = Math.max(...pts.map((p) => p[0])), minY = Math.min(...pts.map((p) => p[1]));
          label = num(sign, maxX - 5, minY + 12, 'end', isLagna);
          py = cy + 6;
        }
        return (
          <G key={sign}>
            {label}
            {isLagna && !tri && <SvgText x={Math.min(...pts.map((p) => p[0])) + 6} y={Math.min(...pts.map((p) => p[1])) + 12} fontSize={9} fontWeight="800" fill={colors.primary}>{abbr.Lagna}</SvgText>}
            {cell(bySign[sign], px, py, tri ? 52 : 84, `e${sign}`, 0, tri)}
          </G>
        );
      })}
    </Svg>
  );
}
