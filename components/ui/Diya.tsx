import React from 'react';
import Svg, { Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * Diya (oil lamp) icon — a proper cultural replacement for the generic
 * MaterialCommunityIcons "candle". MCI has no diya glyph, so this is a
 * hand-built SVG: a curved clay lamp bowl with a lit flame.
 *
 * `color` tints the flame + bowl accent so it can adopt each deity's accent,
 * matching how the old candle icon was tinted.
 */
interface Props {
  size?: number;
  color?: string;
}

export default function Diya({ size = 28, color = '#EA580C' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="flame" x1="24" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFD54A" />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
      </Defs>
      {/* Flame */}
      <Path
        d="M24 7c3.2 3.4 5 6.3 5 9.4 0 3.1-2.2 5.6-5 5.6s-5-2.5-5-5.6C19 13.3 20.8 10.4 24 7z"
        fill="url(#flame)"
      />
      {/* Wick glow core */}
      <Path d="M24 13c1.3 1.6 2 3 2 4.4 0 1.5-.9 2.6-2 2.6s-2-1.1-2-2.6c0-1.4.7-2.8 2-4.4z" fill="#FFF4C2" />
      {/* Lamp bowl */}
      <Path
        d="M8 30c0 0 5 6 16 6s16-6 16-6c0-1.2-1-2-2.2-2H10.2C9 28 8 28.8 8 30z"
        fill={color}
      />
      {/* Oil surface highlight on the bowl rim */}
      <Ellipse cx="24" cy="28.4" rx="15" ry="1.7" fill="#FFFFFF" opacity={0.25} />
    </Svg>
  );
}
