import React from 'react';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import type { Kundli } from '../../services/jyotish';

// Minimal shape the chart needs (works for D1 grahas and divisional placements).
type ChartGraha = { name: string; house: number; retro: boolean };

// North-Indian diamond chart. The 12 HOUSE positions are fixed; the sign that
// sits in each house rotates with the lagna. We draw the classic square + two
// diagonals + inner diamond (= 12 regions), write the rashi number in each
// house, and the planets that occupy it.
const S = 300;
const MID = S / 2;

// Conventional label centroids for houses 1..12 (fractions of S).
const HOUSE_POS: Record<number, [number, number]> = {
  1: [0.5, 0.26], 2: [0.25, 0.12], 3: [0.12, 0.25], 4: [0.25, 0.5],
  5: [0.12, 0.75], 6: [0.25, 0.88], 7: [0.5, 0.74], 8: [0.75, 0.88],
  9: [0.88, 0.75], 10: [0.75, 0.5], 11: [0.88, 0.25], 12: [0.75, 0.12],
};

const ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

interface Props {
  kundli: Kundli;
  size?: number;
  /** Use a divisional chart's placements instead of D1 (planets already housed). */
  planets?: ChartGraha[];
  lagnaSignIndex?: number;
  accent?: string;
  colors: { text: string; textSecondary: string; primary: string; cardBorder: string; surface: string };
}

export default function NorthChart({ kundli, size = 300, planets, lagnaSignIndex, accent, colors }: Props) {
  const lagnaIdx = lagnaSignIndex ?? kundli.lagna.signIndex;
  const grahas = planets ?? kundli.planets;
  const acc = accent || colors.primary;

  // Group planet abbreviations by house.
  const byHouse: Record<number, { label: string; retro: boolean }[]> = {};
  for (let h = 1; h <= 12; h++) byHouse[h] = [];
  grahas.forEach((p) => {
    byHouse[p.house]?.push({ label: ABBR[p.name] || p.name.slice(0, 2), retro: p.retro });
  });

  const line = { stroke: colors.cardBorder, strokeWidth: 1.25 };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
      <Rect x={1} y={1} width={S - 2} height={S - 2} fill={colors.surface} stroke={colors.text} strokeWidth={1.5} />
      {/* Two diagonals */}
      <Line x1={0} y1={0} x2={S} y2={S} {...line} />
      <Line x1={S} y1={0} x2={0} y2={S} {...line} />
      {/* Inner diamond (edge midpoints) */}
      <Line x1={MID} y1={0} x2={S} y2={MID} {...line} />
      <Line x1={S} y1={MID} x2={MID} y2={S} {...line} />
      <Line x1={MID} y1={S} x2={0} y2={MID} {...line} />
      <Line x1={0} y1={MID} x2={MID} y2={0} {...line} />

      {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
        const [fx, fy] = HOUSE_POS[house];
        const cx = fx * S, cy = fy * S;
        const rashiNum = ((lagnaIdx + house - 1) % 12) + 1;
        const occupants = byHouse[house];
        return (
          <G key={house}>
            {/* Rashi number — small, dim, above the planets */}
            <SvgText x={cx} y={cy - 14} fontSize={9} fill={colors.textSecondary} textAnchor="middle" opacity={0.7}>
              {rashiNum}
            </SvgText>
            {/* Planets in this house */}
            {occupants.map((o, idx) => (
              <SvgText
                key={idx}
                x={cx}
                y={cy + 2 + idx * 13}
                fontSize={12}
                fontWeight="700"
                fill={o.label === 'As' ? acc : colors.text}
                textAnchor="middle"
              >
                {o.label}{o.retro ? '↺' : ''}
              </SvgText>
            ))}
          </G>
        );
      })}
    </Svg>
  );
}
