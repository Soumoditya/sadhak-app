// ─── Sadhak Design System — Theme Tokens ───────────────────────────────────
// 2026 Premium Design Language
// Hindu temple aesthetics — saffron, vermillion, gold, deep maroon, ivory

export const Colors = {
  light: {
    // ── Primary ──
    primary: '#C2410C',        // Deep kesari saffron (AA on white)
    primaryLight: '#E8743B',
    primaryDark: '#9A3412',
    primaryMuted: '#C2410C16', // For tinted backgrounds
    primaryGradientStart: '#C2410C',
    primaryGradientEnd: '#E8743B',

    // ── Secondary ──
    secondary: '#8B1A1A',      // Deep temple maroon
    secondaryLight: '#A83232',
    secondaryDark: '#6B0F1A',

    // ── Accent ──
    gold: '#B8862B',
    goldLight: '#E8C34A',
    goldMuted: '#C49A2C14',
    vermillion: '#D93025',
    tulsiGreen: '#1B7A42',
    gangesBlue: '#1565C0',
    saffron: '#F5A623',

    // ── Surfaces ──
    background: '#FBF7F1',     // Warm parchment
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#F5EFE6', // Subtle warm sand
    card: '#FFFFFF',
    cardBorder: '#ECE3D7',

    // ── Text ──
    text: '#1F1A16',           // Warm near-black
    textSecondary: '#5C534B',
    textTertiary: '#9E948A',
    textOnPrimary: '#FFFFFF',
    textOnDark: '#FFFFFF',
    textMuted: '#D6D3D1',

    // ── Status ──
    success: '#16A34A',
    successBg: '#16A34A12',
    warning: '#EA580C',
    warningBg: '#EA580C12',
    error: '#DC2626',
    errorBg: '#DC262612',
    info: '#2563EB',
    infoBg: '#2563EB12',

    // ── Calendar ──
    festival: '#D93025',
    ekadashi: '#7C3AED',
    purnima: '#E8C34A',
    amavasya: '#44403C',
    groomingOk: '#16A34A',
    groomingAvoid: '#DC2626',
    personalNote: '#2563EB',

    // ── UI Chrome ──
    border: '#E6DCCE',
    divider: '#F1EADF',
    tabIconDefault: '#9E948A',
    tabIconSelected: '#C2410C',
    ripple: 'rgba(194, 65, 12, 0.10)',
    overlay: 'rgba(28, 25, 23, 0.50)',
    overlayHeavy: 'rgba(28, 25, 23, 0.72)',
    shadow: 'rgba(28, 25, 23, 0.08)',
    shimmer: '#F0EBE3',
    shimmerHighlight: '#FAF7F2',

    // ── Glassmorphism ──
    glass: 'rgba(255, 255, 255, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.45)',
  },

  dark: {
    // ── Primary ──
    primary: '#F08A4B',        // Glowing saffron on warm charcoal
    primaryLight: '#F7B07F',
    primaryDark: '#C2410C',
    primaryMuted: '#F08A4B18',
    primaryGradientStart: '#C2410C',
    primaryGradientEnd: '#F08A4B',

    // ── Secondary ──
    secondary: '#E8899A',
    secondaryLight: '#F0A0B0',
    secondaryDark: '#C06070',

    // ── Accent ──
    gold: '#E8C34A',
    goldLight: '#F5D678',
    goldMuted: '#E8C34A14',
    vermillion: '#FF7B72',
    tulsiGreen: '#4ADE80',
    gangesBlue: '#60A5FA',
    saffron: '#FBB848',

    // ── Surfaces ──
    background: '#13110F',     // Warm charcoal (was cold blue-grey)
    surface: '#1C1916',        // Card surface
    surfaceElevated: '#25211D', // Elevated card
    surfaceSecondary: '#191613',
    card: '#25211D',
    cardBorder: '#332D27',

    // ── Text ──
    text: '#F4EEE7',           // Warm white
    textSecondary: '#B5AA9E',
    textTertiary: '#7D7268',
    textOnPrimary: '#13110F',
    textOnDark: '#F4EEE7',
    textMuted: '#3D3630',

    // ── Status ──
    success: '#4ADE80',
    successBg: '#4ADE8015',
    warning: '#FB923C',
    warningBg: '#FB923C15',
    error: '#F87171',
    errorBg: '#F8717115',
    info: '#60A5FA',
    infoBg: '#60A5FA15',

    // ── Calendar ──
    festival: '#FF7B72',
    ekadashi: '#A78BFA',
    purnima: '#E8C34A',
    amavasya: '#78909C',
    groomingOk: '#4ADE80',
    groomingAvoid: '#F87171',
    personalNote: '#60A5FA',

    // ── UI Chrome ──
    border: '#332D27',
    divider: '#25211D',
    tabIconDefault: '#7D7268',
    tabIconSelected: '#F08A4B',
    ripple: 'rgba(240, 138, 75, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.60)',
    overlayHeavy: 'rgba(0, 0, 0, 0.82)',
    shadow: 'rgba(0, 0, 0, 0.40)',
    shimmer: '#25211D',
    shimmerHighlight: '#332D27',

    // ── Glassmorphism ──
    glass: 'rgba(28, 25, 22, 0.85)',
    glassBorder: 'rgba(51, 45, 39, 0.60)',
  },
};

// ─── Spacing — strict 4px grid ─────────────────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giant: 64,
};

// ─── Border Radius ─────────────────────────────────────────────────────────
export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

// ─── Typography ────────────────────────────────────────────────────────────
export const FontSize = {
  caption: 11,
  footnote: 12,
  subheadline: 13,
  body: 15,
  callout: 16,
  headline: 17,
  title3: 20,
  title2: 22,
  title1: 26,
  largeTitle: 32,
  display: 38,
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
};

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.3,
  wider: 0.6,
  widest: 1.2,
  caps: 1.5,
};

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  devanagari: 'NotoSansDevanagari_400Regular',
  devanagariBold: 'NotoSansDevanagari_700Bold',
};

// ─── Shadows (layered for depth) ───────────────────────────────────────────
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
};

// ─── Animation Constants ───────────────────────────────────────────────────
export const Animation = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    entrance: 600,
  },
  spring: {
    snappy: { friction: 8, tension: 140 },
    gentle: { friction: 10, tension: 80 },
    bouncy: { friction: 6, tension: 120 },
  },
  scale: {
    pressed: 0.97,
    pressedSm: 0.98,
    pressedLg: 0.95,
  },
};

// ─── Icon Sizes ────────────────────────────────────────────────────────────
export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  hero: 48,
};

// ─── Hindu Calendar Data ───────────────────────────────────────────────────
export const HINDU_DAYS = {
  0: { en: 'Sunday', hi: 'रविवार', deity: 'Surya' },
  1: { en: 'Monday', hi: 'सोमवार', deity: 'Chandra/Shiva' },
  2: { en: 'Tuesday', hi: 'मंगलवार', deity: 'Hanuman/Mangal' },
  3: { en: 'Wednesday', hi: 'बुधवार', deity: 'Budha/Vishnu' },
  4: { en: 'Thursday', hi: 'गुरुवार', deity: 'Brihaspati/Vishnu' },
  5: { en: 'Friday', hi: 'शुक्रवार', deity: 'Shukra/Lakshmi' },
  6: { en: 'Saturday', hi: 'शनिवार', deity: 'Shani' },
};

export const HINDU_MONTHS = [
  { en: 'Chaitra', hi: 'चैत्र' },
  { en: 'Vaishakha', hi: 'वैशाख' },
  { en: 'Jyeshtha', hi: 'ज्येष्ठ' },
  { en: 'Ashadha', hi: 'आषाढ़' },
  { en: 'Shravana', hi: 'श्रावण' },
  { en: 'Bhadrapada', hi: 'भाद्रपद' },
  { en: 'Ashvina', hi: 'आश्विन' },
  { en: 'Kartika', hi: 'कार्तिक' },
  { en: 'Margashirsha', hi: 'मार्गशीर्ष' },
  { en: 'Pausha', hi: 'पौष' },
  { en: 'Magha', hi: 'माघ' },
  { en: 'Phalguna', hi: 'फाल्गुन' },
];

export const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
];

export const NAKSHATRAS = [
  { en: 'Ashwini', hi: 'अश्विनी' },
  { en: 'Bharani', hi: 'भरणी' },
  { en: 'Krittika', hi: 'कृत्तिका' },
  { en: 'Rohini', hi: 'रोहिणी' },
  { en: 'Mrigashira', hi: 'मृगशिरा' },
  { en: 'Ardra', hi: 'आर्द्रा' },
  { en: 'Punarvasu', hi: 'पुनर्वसु' },
  { en: 'Pushya', hi: 'पुष्य' },
  { en: 'Ashlesha', hi: 'आश्लेषा' },
  { en: 'Magha', hi: 'मघा' },
  { en: 'Purva Phalguni', hi: 'पूर्वाफाल्गुनी' },
  { en: 'Uttara Phalguni', hi: 'उत्तराफाल्गुनी' },
  { en: 'Hasta', hi: 'हस्त' },
  { en: 'Chitra', hi: 'चित्रा' },
  { en: 'Swati', hi: 'स्वाति' },
  { en: 'Vishakha', hi: 'विशाखा' },
  { en: 'Anuradha', hi: 'अनुराधा' },
  { en: 'Jyeshtha', hi: 'ज्येष्ठा' },
  { en: 'Mula', hi: 'मूल' },
  { en: 'Purva Ashadha', hi: 'पूर्वाषाढ़ा' },
  { en: 'Uttara Ashadha', hi: 'उत्तराषाढ़ा' },
  { en: 'Shravana', hi: 'श्रवण' },
  { en: 'Dhanishta', hi: 'धनिष्ठा' },
  { en: 'Shatabhisha', hi: 'शतभिषा' },
  { en: 'Purva Bhadrapada', hi: 'पूर्वाभाद्रपद' },
  { en: 'Uttara Bhadrapada', hi: 'उत्तराभाद्रपद' },
  { en: 'Revati', hi: 'रेवती' },
];

export const APP_NAME = 'Sadhak';
export const APP_TAGLINE = 'Your Spiritual Companion';

// ─── Tones ─────────────────────────────────────────────────────────────────
// One earthy accent family for icons, chips and categories, replacing the old
// mix of neon purple/blue/green per item. Every tool and category picks one of
// these, so the whole app reads as one palette in both themes.
export type ToneName = 'saffron' | 'kumkum' | 'haldi' | 'tulsi' | 'neel' | 'plum';
export type Tone = { fg: string; bg: string };
export const Tones: Record<'light' | 'dark', Record<ToneName, Tone>> = {
  light: {
    saffron: { fg: '#C2410C', bg: '#FBE8DA' },
    kumkum: { fg: '#B0263E', bg: '#F8E2E5' },
    haldi: { fg: '#9A6508', bg: '#F7EBD2' },
    tulsi: { fg: '#2E7149', bg: '#E1EFE4' },
    neel: { fg: '#24608A', bg: '#DFEAF3' },
    plum: { fg: '#7B3F79', bg: '#F0E3EF' },
  },
  dark: {
    saffron: { fg: '#F59A62', bg: '#3A2418' },
    kumkum: { fg: '#F0909E', bg: '#3A1E24' },
    haldi: { fg: '#E6B65A', bg: '#372B16' },
    tulsi: { fg: '#7FC99A', bg: '#1C3125' },
    neel: { fg: '#86BCE2', bg: '#1A2B39' },
    plum: { fg: '#D59ED3', bg: '#2F2030' },
  },
};

// Older screens and data files carry fixed accent hexes (MUI-style purple,
// blue, green). Map each to the nearest tone so they theme correctly.
const LEGACY_TONE: Record<string, ToneName> = {
  '#C2410C': 'saffron', '#FF6B00': 'saffron', '#FF8C00': 'saffron', '#EA580C': 'saffron', '#EA8C00': 'saffron', '#E8650A': 'saffron', '#F97316': 'saffron', '#FF9933': 'saffron',
  '#D32F2F': 'kumkum', '#8B0000': 'kumkum', '#DC2626': 'kumkum', '#D93025': 'kumkum', '#B71C1C': 'kumkum', '#E91E63': 'kumkum', '#EF4444': 'kumkum', '#8B1A1A': 'kumkum',
  '#1565C0': 'neel', '#0EA5E9': 'neel', '#2563EB': 'neel', '#475569': 'neel', '#37474F': 'neel', '#616161': 'neel', '#0D47A1': 'neel', '#1976D2': 'neel', '#00838F': 'neel',
  '#7C3AED': 'plum', '#9C27B0': 'plum', '#6A1B9A': 'plum', '#8E24AA': 'plum', '#4A148C': 'plum',
  '#2D6A4F': 'tulsi', '#1B7A42': 'tulsi', '#16A34A': 'tulsi', '#2E7D32': 'tulsi', '#388E3C': 'tulsi', '#43A047': 'tulsi',
  '#C49A2C': 'haldi', '#F59E0B': 'haldi', '#FFD700': 'haldi', '#E8C34A': 'haldi', '#B8862B': 'haldi', '#F5A623': 'haldi', '#FFA000': 'haldi',
};
export function toneNameFor(color?: string): ToneName {
  if (!color) return 'saffron';
  if (color in Tones.light) return color as ToneName;
  return LEGACY_TONE[color.toUpperCase()] || 'saffron';
}
/** Strong (light-palette) tone colour for solid fills behind white text. */
export const toneSolid = (color?: string) => Tones.light[toneNameFor(color)].fg;
