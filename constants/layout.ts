import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── App shell layout constants ─────────────────────────────────────────────
// The bottom tab bar floats above the Android system navigation bar.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_FLOATING_GAP = 10; // gap between the floating bar and the system nav
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
    // Where the floating tab bar sits from the bottom edge.
    tabBarBottom: insets.bottom + TAB_BAR_FLOATING_GAP,
    // Scroll/list content padding so nothing hides behind the floating tab bar.
    tabContentPadding: insets.bottom + TAB_BAR_FLOATING_GAP + TAB_BAR_HEIGHT + 20,
    // Plain bottom safe inset (for non-tab screens / input bars / sheets).
    bottomInset: insets.bottom,
    // Comfortable bottom padding for non-tab scroll screens.
    screenBottomPadding: insets.bottom + 24,
  };
}
