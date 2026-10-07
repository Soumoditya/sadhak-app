import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── App shell layout constants ─────────────────────────────────────────────
// The bottom tab bar is docked: it owns the Android navigation area (its
// height includes insets.bottom) and tab scenes end above it, so tab content
// only needs ordinary breathing room at the bottom.
export const TAB_BAR_HEIGHT = 64;
export const HEADER_TOP_GAP = 14; // space between status bar and header content

// A single source of truth for inset-aware paddings, so no screen has to
// hardcode Platform.OS ? 60 : 48 (which breaks under edge-to-edge on Android).
export function useLayoutInsets() {
  const insets = useSafeAreaInsets();
  return {
    insets,
    // Immersive gradient headers bleed to the very top edge; only their inner
    // content is pushed below the status bar.
    headerPaddingTop: insets.top + HEADER_TOP_GAP,
    // Floating back button on full-bleed headers.
    backBtnTop: insets.top + 4,
    // Bottom padding for scroll content inside a tab (the bar is outside it).
    tabContentPadding: 28,
    // Plain bottom safe inset (for non-tab screens / input bars / sheets).
    bottomInset: insets.bottom,
    // Comfortable bottom padding for non-tab scroll screens.
    screenBottomPadding: insets.bottom + 24,
  };
}
