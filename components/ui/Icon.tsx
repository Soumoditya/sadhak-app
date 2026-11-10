import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { GLYPHS, type IconName, type IconGlyph } from './iconGlyphs';

export type { IconName };

// Many screens and stored records (chat rooms, settings rows) still carry
// Material icon names. Map the ones that have a Phosphor equivalent.
const MATERIAL_TO_PHOSPHOR: Record<string, IconName> = {
  web: 'globe', 'trash-can-outline': 'trash', translate: 'translate', 'theme-light-dark': 'moon-stars',
  'star-outline': 'star', 'shield-outline': 'shield-check', 'shield-crown-outline': 'crown',
  'share-variant-outline': 'share-network', 'party-popper': 'confetti', 'moon-waning-crescent': 'moon',
  'message-outline': 'chat-circle', logout: 'sign-out', 'lock-reset': 'lock-key', 'information-outline': 'info',
  'help-circle-outline': 'question', 'format-list-bulleted': 'list-bullets', 'file-document-outline': 'file-text',
  'eye-outline': 'eye', 'email-outline': 'envelope-simple', 'content-cut': 'scissors',
  'bell-ring-outline': 'bell-ringing', 'bell-check-outline': 'bell', 'bell-outline': 'bell',
  'forum-outline': 'chats-circle', 'book-open-variant': 'book-open-text', 'star-four-points-outline': 'star-four',
  'star-four-points': 'star-four', 'temple-hindu': 'temple-hindu', 'account-group-outline': 'users-three',
  'bullhorn-outline': 'chat-centered-text', 'leaf': 'leaf', 'fire': 'fire', 'compass-outline': 'compass',
};

export function fromMaterial(name: string): IconName | undefined {
  return MATERIAL_TO_PHOSPHOR[name];
}

interface Props {
  name: IconName;
  size?: number;
  color: string;
  /**
   * duotone: outline + soft 20% tint (default, the premium look)
   * regular: outline only
   * fill:    solid (used for the active tab); falls back to duotone
   */
  weight?: 'duotone' | 'regular' | 'fill';
}

function Icon({ name, size = 22, color, weight = 'duotone' }: Props) {
  const g = GLYPHS[name] as IconGlyph;
  if (!g) return null;
  const solid = weight === 'fill' && g.f;
  const tint = weight !== 'regular' && !solid;
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      {tint && g.t.map((d, i) => <Path key={`t${i}`} d={d} fill={color} opacity={weight === 'fill' ? 0.45 : 0.2} />)}
      {g.s
        ? g.d.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          ))
        : (solid ? g.f! : g.d).map((d, i) => <Path key={i} d={d} fill={color} />)}
    </Svg>
  );
}

export default memo(Icon);
