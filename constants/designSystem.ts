// ─── Sadhak Design System — Shared Style Presets ───────────────────────────
// Import these across every screen for consistency
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontFamily, Shadows, Animation, LetterSpacing, IconSize } from './theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Reusable style factories (theme-aware) ────────────────────────────────
export const createStyles = (colors: typeof Colors.light, isDark: boolean) => {
  return StyleSheet.create({
    // ── Screen Container ──
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Header Gradient ──
    headerGradient: {
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: Spacing.xxl,
      paddingHorizontal: Spacing.xl,
      borderBottomLeftRadius: BorderRadius.xxl,
      borderBottomRightRadius: BorderRadius.xxl,
    },

    // ── Cards ──
    card: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Shadows.sm,
    },

    cardElevated: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 0,
      ...Shadows.md,
    },

    cardAccent: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderLeftWidth: 3,
      ...Shadows.xs,
    },

    cardGlass: {
      backgroundColor: colors.glass,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },

    // ── Section Title ──
    sectionTitle: {
      fontSize: FontSize.headline,
      fontFamily: FontFamily.bold,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: LetterSpacing.normal,
    },

    sectionSubtitle: {
      fontSize: FontSize.subheadline,
      fontFamily: FontFamily.regular,
      fontWeight: '400' as const,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },

    overline: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
      color: colors.textTertiary,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase' as const,
    },

    // ── Buttons ──
    buttonPrimary: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md + 2,
      paddingHorizontal: Spacing.xxl,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: Spacing.sm,
      ...Shadows.sm,
    },

    buttonPrimaryText: {
      color: colors.textOnPrimary,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
      letterSpacing: LetterSpacing.wide,
    },

    buttonSecondary: {
      backgroundColor: 'transparent',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: Spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },

    buttonSecondaryText: {
      color: colors.primary,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
    },

    buttonGhost: {
      backgroundColor: 'transparent',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: Spacing.sm,
    },

    buttonGhostText: {
      color: colors.primary,
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: '500' as const,
    },

    buttonDanger: {
      backgroundColor: colors.errorBg,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: Spacing.sm,
    },

    buttonDangerText: {
      color: colors.error,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
    },

    // ── Text Inputs ──
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BorderRadius.md,
      paddingVertical: Platform.OS === 'ios' ? Spacing.md + 2 : Spacing.md,
      paddingHorizontal: Spacing.lg,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },

    textInputFocused: {
      borderColor: colors.primary,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },

    textInputLabel: {
      fontSize: FontSize.footnote,
      fontFamily: FontFamily.medium,
      fontWeight: '500' as const,
      color: colors.textSecondary,
      marginBottom: Spacing.xs + 2,
      letterSpacing: LetterSpacing.wide,
    },

    // ── Chips & Badges ──
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
      borderRadius: BorderRadius.pill,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    chipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },

    chipText: {
      fontSize: FontSize.footnote,
      fontFamily: FontFamily.medium,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },

    chipTextActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },

    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.error,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: Spacing.xs + 2,
    },

    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontFamily: FontFamily.bold,
      fontWeight: '700' as const,
    },

    // ── List Items ──
    listItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.md,
    },

    listItemBordered: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: Spacing.md + 2,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },

    listItemIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    listItemContent: {
      flex: 1,
    },

    listItemTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: '500' as const,
      color: colors.text,
    },

    listItemSubtitle: {
      fontSize: FontSize.subheadline,
      fontFamily: FontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // ── Dividers ──
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },

    // ── Empty State ──
    emptyState: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: Spacing.huge,
    },

    emptyStateIcon: {
      marginBottom: Spacing.lg,
      opacity: 0.5,
    },

    emptyStateTitle: {
      fontSize: FontSize.callout,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textAlign: 'center' as const,
    },

    emptyStateSubtitle: {
      fontSize: FontSize.subheadline,
      fontFamily: FontFamily.regular,
      color: colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: Spacing.sm,
      lineHeight: 20,
    },

    // ── Modal / Bottom Sheet ──
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end' as const,
    },

    bottomSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BorderRadius.xxl,
      borderTopRightRadius: BorderRadius.xxl,
      padding: Spacing.xl,
      paddingBottom: Platform.OS === 'ios' ? Spacing.huge : Spacing.xxl,
      maxHeight: '85%' as any,
    },

    bottomSheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center' as const,
      marginBottom: Spacing.lg,
    },

    bottomSheetTitle: {
      fontSize: FontSize.title3,
      fontFamily: FontFamily.bold,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: Spacing.lg,
    },

    // ── Avatar ──
    avatarSm: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    avatarMd: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    avatarLg: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    avatarXl: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    // ── Status Pill ──
    statusPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.pill,
    },

    statusPillText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600' as const,
    },

    // ── FAB ──
    fab: {
      position: 'absolute' as const,
      right: Spacing.xl,
      bottom: Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...Shadows.lg,
    },

    // ── Search Bar ──
    searchBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      height: 44,
    },

    searchBarInput: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: colors.text,
      paddingVertical: 0,
    },

    // ── Back Button ──
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
    },

    // ── Row helpers ──
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },

    rowBetween: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },

    // ── Section Spacing ──
    sectionSpacing: {
      marginTop: Spacing.xxl,
      marginHorizontal: Spacing.xl,
    },

    // ── Tab Bar (Floating) ──
    floatingTabBar: {
      position: 'absolute' as const,
      bottom: Platform.OS === 'ios' ? 24 : 16,
      left: Spacing.lg,
      right: Spacing.lg,
      backgroundColor: colors.glass,
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      height: 64,
      paddingBottom: 0,
      paddingTop: 0,
      ...Shadows.xl,
    },
  });
};

// ─── Header gradient colors helper ─────────────────────────────────────────
export const getHeaderGradient = (isDark: boolean): string[] => {
  return isDark
    ? [Colors.dark.surface, Colors.dark.background]
    : [Colors.light.primary, '#E8743B', '#F5A623'];
};

export const getHeaderGradientSubtle = (isDark: boolean): string[] => {
  return isDark
    ? [Colors.dark.surfaceElevated, Colors.dark.background]
    : ['#FFF8F0', '#FDFAF5'];
};
