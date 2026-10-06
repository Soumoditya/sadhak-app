import React from 'react';
import Svg, { Rect, Line, Polygon, Text as SvgText, TSpan, G, Defs, LinearGradient, Stop } from 'react-native-svg';

// Kundli chart in the three regional styles:
//  • north: houses fixed (diamond), signs rotate with the lagna
//  • south: signs fixed in a 4×4 frame, lagna marked
//  • east (Bengal/Odisha): signs fixed, Aries at top, anticlockwise
// Each graha shows its short name plus small marks: R retrograde,
// C combust, V vargottama.

export type ChartStyle = 'north' | 'south' | 'east';
export type ChartGraha = { name: string; signIndex: number; house: number; retro?: boolean };
export type Flags = Record<string, { retro?: boolean; combust?: boolean; vargottama?: boolean }>;

const ABBR: Record<string, Record<string, string>> = {
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
  const line = { stroke: colors.primary, strokeOpacity: 0.45, strokeWidth: 1.2 };
  const bySign: Record<number, ChartGraha[]> = {};
  for (let i = 0; i < 12; i++) bySign[i] = [];
  grahas.forEach((g) => bySign[g.signIndex]?.push(g));

  const label = (g: ChartGraha, x: number, y: number, fs: number, key: string) => {
    const f = flags[g.name] || {};
    const marks = `${f.retro || g.retro ? 'R' : ''}${f.combust ? 'C' : ''}${f.vargottama ? 'V' : ''}`;
    const isLuminary = g.name === 'Sun' || g.name === 'Moon';
    return (
      <SvgText key={key} x={x} y={y} fontSize={fs} fontWeight="700" textAnchor="middle" fill={isLuminary ? colors.primary : colors.text}>
        {abbr[g.name] || g.name.slice(0, 2)}
        {!!marks && <TSpan fontSize={fs * 0.62} dy={-fs * 0.38} fill={colors.textSecondary}>{marks}</TSpan>}
      </SvgText>
    );
  };

  // Lay out the grahas of one cell around its centre.
  const cell = (list: ChartGraha[], cx: number, cy: number, maxW: number, keyBase: string, extraTop = 0, tight = false) => {
    const n = list.length;
    if (!n) return null;
    const gap = tight ? 19 : 26;
    const cols = n > 2 ? Math.min(3, Math.max(2, Math.floor(maxW / gap))) : 1;
    const rows = Math.ceil(n / cols);
    const fs = tight ? (n > 2 ? 9.5 : 11) : n > 4 ? 10.5 : 12.5;
    const lh = fs + (tight ? 2 : 3);
    const y0 = cy - ((rows - 1) * lh) / 2 + fs * 0.35 + extraTop;
    return list.map((g, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const x = cx + (c - (inRow - 1) / 2) * gap;
      return label(g, x, y0 + r * lh, fs, `${keyBase}-${g.name}`);
    });
  };

  const bg = (
    <>
      <Defs>
        <LinearGradient id="kbg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.surface} />
          <Stop offset="1" stopColor={colors.surfaceSecondary} />
        </LinearGradient>
      </Defs>
      <Rect x={1} y={1} width={S - 2} height={S - 2} rx={10} fill="url(#kbg)" stroke={colors.primary} strokeOpacity={0.7} strokeWidth={1.6} />
    </>
  );

  if (style === 'north') {
    const MID = S / 2;
    // Centroids for houses 1..12 and their polygons (for the lagna tint).
    const POS: Record<number, [number, number]> = {
      1: [0.5, 0.25], 2: [0.25, 0.1], 3: [0.1, 0.25], 4: [0.25, 0.5], 5: [0.1, 0.75], 6: [0.25, 0.9],
      7: [0.5, 0.75], 8: [0.75, 0.9], 9: [0.9, 0.75], 10: [0.75, 0.5], 11: [0.9, 0.25], 12: [0.75, 0.1],
    };
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        {bg}
        <Polygon points={`${MID},0 ${S * 0.75},${S * 0.25} ${MID},${MID} ${S * 0.25},${S * 0.25}`} fill={colors.primary} fillOpacity={0.09} />
        <Line x1={0} y1={0} x2={S} y2={S} {...line} />
        <Line x1={S} y1={0} x2={0} y2={S} {...line} />
        <Line x1={MID} y1={0} x2={S} y2={MID} {...line} />
        <Line x1={S} y1={MID} x2={MID} y2={S} {...line} />
        <Line x1={MID} y1={S} x2={0} y2={MID} {...line} />
        <Line x1={0} y1={MID} x2={MID} y2={0} {...line} />
        {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
          const [fx, fy] = POS[house];
          const sign = (lagnaSignIndex + house - 1) % 12;
          const corner = [2, 3, 5, 6, 8, 9, 11, 12].includes(house);
          return (
            <G key={house}>
              <SvgText x={fx * S} y={fy * S + (house === 1 ? -22 : corner ? -12 : -20)} fontSize={9.5} fontWeight="700" fill={colors.textTertiary} textAnchor="middle">
                {sign + 1}
              </SvgText>
              {house === 1 && <SvgText x={MID} y={fy * S + 34} fontSize={9} fontWeight="800" fill={colors.primary} textAnchor="middle">{abbr.Lagna}</SvgText>}
              {cell(bySign[sign], fx * S, fy * S + 2, corner ? 52 : 80, `h${house}`, 0, corner && bySign[sign].length > 2)}
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
        {SLOT.map(([col, row], sign) => {
          const x = col * c, y = row * c;
          const isLagna = sign === lagnaSignIndex;
          return (
            <G key={sign}>
              <Rect x={x} y={y} width={c} height={c} fill={isLagna ? colors.primary : 'transparent'} fillOpacity={isLagna ? 0.09 : 0} stroke={colors.primary} strokeOpacity={0.45} strokeWidth={1.1} />
              {isLagna && <Line x1={x} y1={y + 16} x2={x + 16} y2={y} stroke={colors.primary} strokeWidth={1.6} />}
              <SvgText x={x + c - 6} y={y + 12} fontSize={9} fontWeight="700" fill={colors.textTertiary} textAnchor="end">{sign + 1}</SvgText>
              {cell(bySign[sign], x + c / 2, y + c / 2 + 4, c - 8, `s${sign}`)}
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
      {cells.map(({ sign, pts }) => {
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const tri = pts.length === 3;
        const isLagna = sign === lagnaSignIndex;
        return (
          <G key={sign}>
            <Polygon points={pts.map((p) => p.join(',')).join(' ')} fill={isLagna ? colors.primary : 'transparent'} fillOpacity={isLagna ? 0.1 : 0} stroke={colors.primary} strokeOpacity={0.45} strokeWidth={1.1} />
            <SvgText x={cx} y={cy - (tri ? 10 : 22)} fontSize={9} fontWeight="700" fill={isLagna ? colors.primary : colors.textTertiary} textAnchor="middle">
              {isLagna ? `${sign + 1} · ${abbr.Lagna}` : sign + 1}
            </SvgText>
            {cell(bySign[sign], cx, cy + (tri ? 6 : 2), tri ? 40 : 84, `e${sign}`, 0, tri)}
          </G>
        );
      })}
    </Svg>
  );
}
