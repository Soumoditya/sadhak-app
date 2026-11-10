import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

// ─── Public API types ───────────────────────────────────────────────────────
export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

export type DialogTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface DialogOptions {
  title: string;
  message?: string;
  buttons?: DialogButton[];
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: DialogTone;
  dismissable?: boolean; // tap backdrop to cancel (default true)
}

interface DialogContextValue {
  /** Full-control dialog. */
  show: (opts: DialogOptions) => void;
  /** Alert.alert-compatible signature for near-mechanical migration. */
  alert: (title: string, message?: string, buttons?: DialogButton[], opts?: Partial<DialogOptions>) => void;
  /** Promise-based yes/no confirm. Resolves true if the confirm button is pressed. */
  confirm: (opts: Omit<DialogOptions, 'buttons'> & { confirmText?: string; cancelText?: string; destructive?: boolean }) => Promise<boolean>;
  hide: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_ICON: Record<DialogTone, keyof typeof MaterialCommunityIcons.glyphMap> = {
  default: 'information-outline',
  success: 'check-circle-outline',
  warning: 'alert-outline',
  danger: 'alert-circle-outline',
  info: 'information-outline',
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { tx } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current; // 1 = offscreen bottom, 0 = shown

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    slide.setValue(1);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 12, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [opacity, slide]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setOpts(null);
    });
  }, [opacity, slide]);

  const show = useCallback((o: DialogOptions) => {
    setOpts(o);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (visible) animateIn();
  }, [visible, animateIn]);

  const alert = useCallback<DialogContextValue['alert']>((title, message, buttons, extra) => {
    show({ title, message, buttons, ...extra });
  }, [show]);

  const confirm = useCallback<DialogContextValue['confirm']>((o) => {
    return new Promise<boolean>((resolve) => {
      show({
        ...o,
        tone: o.tone ?? (o.destructive ? 'danger' : 'default'),
        buttons: [
          { text: o.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: o.confirmText ?? 'Confirm', style: o.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
        ],
      });
    });
  }, [show]);

  const handleButton = useCallback((btn: DialogButton) => {
    close();
    // Defer so the close animation is smooth before any navigation the handler triggers.
    setTimeout(() => btn.onPress?.(), 60);
  }, [close]);

  const value: DialogContextValue = { show, alert, confirm, hide: close };

  const buttons: DialogButton[] = opts?.buttons?.length ? opts.buttons : [{ text: 'OK', style: 'default' }];
  const tone: DialogTone = opts?.tone ?? 'default';
  const iconName = opts?.icon ?? TONE_ICON[tone];
  const toneColor =
    tone === 'danger' ? colors.error :
    tone === 'success' ? colors.success :
    tone === 'warning' ? colors.warning :
    tone === 'info' ? colors.info :
    colors.primary;
  const stacked = buttons.length > 2;

  const slideTranslate = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });
  const hasSingleOk = buttons.length === 1 && buttons[0].style !== 'destructive';

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={close}>
        <Animated.View style={[styles.backdrop, { opacity, backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (opts?.dismissable !== false) close(); }}
          />
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.surfaceElevated, paddingBottom: 20 + insets.bottom, transform: [{ translateY: slideTranslate }] },
            ]}
          >
            {/* Grabber handle — makes it feel like a sheet, not a system alert */}
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />

            {/* Content row: tiny inline icon + text (no giant circle) */}
            <View style={styles.body}>
              {tone !== 'default' && (
                <MaterialCommunityIcons name={iconName} size={18} color={toneColor} style={{ marginTop: 3 }} />
              )}
              <View style={{ flex: 1 }}>
                {!!opts?.title && <Text style={[styles.title, { color: colors.text }]}>{tx(opts.title)}</Text>}
                {!!opts?.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{tx(opts.message)}</Text>}
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {buttons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                // Primary style: single-OK OR last action in a multi-button row that isn't cancel.
                const isPrimary = !isCancel && !isDestructive && (hasSingleOk || i === buttons.length - 1);
                const bg = isDestructive ? colors.error : isPrimary ? colors.primary : 'transparent';
                const fg = isPrimary || isDestructive ? '#FFFFFF' : isCancel ? colors.textTertiary : colors.text;
                return (
                  <Pressable
                    key={`${btn.text}-${i}`}
                    onPress={() => handleButton(btn)}
                    style={({ pressed }) => [
                      styles.btn,
                      stacked ? styles.btnStacked : styles.btnRow,
                      {
                        backgroundColor: bg,
                        borderColor: colors.divider,
                        borderWidth: bg === 'transparent' ? 1 : 0,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                    android_ripple={{ color: `${fg}22` }}
                  >
                    <Text style={[styles.btnText, { color: fg }]}>{tx(btn.text)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34, // above system nav bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  body: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, marginBottom: 22 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  message: { fontSize: 14.5, lineHeight: 21, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  actionsStacked: { flexDirection: 'column-reverse' },
  btn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', height: 50, overflow: 'hidden' },
  btnRow: { flex: 1 },
  btnStacked: { width: '100%' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
