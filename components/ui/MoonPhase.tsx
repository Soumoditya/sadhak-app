import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Moon drawn for a tithi (1–15 Shukla, 16–30 Krishna). The lit part grows
 * from the right in Shukla paksha and shrinks to the left in Krishna paksha.
 */
export default function MoonPhase({ tithi, size = 34, lit = '#FFF4D6', dark = 'rgba(255,255,255,0.18)' }: {
  tithi: number; size?: number; lit?: string; dark?: string;
}) {
  const r = size / 2;
  const waxing = tithi <= 15;
  const f = waxing ? tithi / 15 : (30 - tithi) / 15; // 0 new … 1 full
  if (f <= 0.02) return <Svg width={size} height={size}><Circle cx={r} cy={r} r={r - 0.5} fill={dark} /></Svg>;
  if (f >= 0.98) return <Svg width={size} height={size}><Circle cx={r} cy={r} r={r - 0.5} fill={lit} /></Svg>;
  const rx = Math.abs(1 - 2 * f) * r;
  const side = waxing ? 1 : 0; // outer arc on the right while waxing
  const bulge = f > 0.5 ? side : 1 - side;
  const d = `M ${r} 0 A ${r} ${r} 0 0 ${side} ${r} ${size} A ${rx} ${r} 0 0 ${bulge} ${r} 0 Z`;
  return (
    <Svg width={size} height={size}>
      <Circle cx={r} cy={r} r={r - 0.5} fill={dark} />
      <Path d={d} fill={lit} />
    </Svg>
  );
}
