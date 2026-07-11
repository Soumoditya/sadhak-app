// Sadhak Design System v2 — the single source of truth for the redesigned app.
// One scale for spacing, radius, typography, elevation. Screens compose from
// this, not inline magic numbers.

export const DS = {
  // ─── SPACING (4pt base) ───
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 56,
  },
  // ─── RADIUS ───
  radius: {
    sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, pill: 999,
  },
  // ─── TYPE SCALE ───
  type: {
    // Displays (rare, hero-only)
    display: { size: 34, lineHeight: 40, weight: '800' as const, letterSpacing: -0.5 },
    // Titles
    title1: { size: 26, lineHeight: 32, weight: '800' as const, letterSpacing: -0.3 },
    title2: { size: 20, lineHeight: 26, weight: '700' as const, letterSpacing: -0.2 },
    title3: { size: 17, lineHeight: 22, weight: '700' as const, letterSpacing: 0 },
    // Body — bumped from tiny 12/13 to readable 15/14
    body: { size: 15, lineHeight: 22, weight: '400' as const, letterSpacing: 0 },
    bodyStrong: { size: 15, lineHeight: 22, weight: '600' as const, letterSpacing: 0 },
    caption: { size: 13, lineHeight: 18, weight: '500' as const, letterSpacing: 0 },
    // Overlines (all-caps labels)
    overline: { size: 11, lineHeight: 14, weight: '700' as const, letterSpacing: 1.2 },
    // Button
    button: { size: 15, lineHeight: 20, weight: '700' as const, letterSpacing: 0.2 },
    // ─── DEVANAGARI ───
    // Devanagari glyphs carry top matras (ि ी े ै ो ौ) and stacked conjuncts, so
    // they need ~1.5–1.9× line-height or they clip/read cramped next to Latin.
    // Use these for ANY Hindi/Sanskrit text so the treatment never drifts.
    deva: {
      title: { size: 15, lineHeight: 24, weight: '600' as const },     // list-row Hindi title
      heroTitle: { size: 17, lineHeight: 28, weight: '600' as const }, // detail hero Hindi
      lyric: { size: 17.5, lineHeight: 34, weight: '500' as const },   // aarti/mantra lyrics
    },
  },
  // ─── ELEVATION ───
  elevation: {
    none: { elevation: 0, shadowOpacity: 0, shadowRadius: 0 },
    sm: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    md: { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 10 },
    lg: { elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 18 },
  },
  // ─── LAYOUT PRIMITIVES ───
  layout: {
    screenPaddingH: 20, // one horizontal padding across every screen
    sectionGap: 20,     // vertical gap between top-level sections
    cardPadding: 16,    // inner card padding
    fieldHeight: 52,    // form fields
    buttonHeightLg: 52,
    buttonHeightMd: 44,
    tabBarHeight: 64,
    tabBarFloatingGap: 8,
  },
} as const;

// Screen bottom padding for scroll views — accounts for the floating tab bar
// so content NEVER hides behind nav. Screens pull this via useDsInsets().
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export function useDsInsets() {
  const insets = useSafeAreaInsets();
  const TAB = DS.layout.tabBarHeight + DS.layout.tabBarFloatingGap;
  return {
    insets,
    headerTop: insets.top + 12,
    tabBarBottom: insets.bottom + DS.layout.tabBarFloatingGap,
    // Bottom padding for tab-nested screens (never behind the floating tab bar).
    tabScrollBottom: insets.bottom + TAB + 24,
    // Bottom padding for non-tab screens.
    screenBottom: insets.bottom + DS.space['3xl'],
  };
}
