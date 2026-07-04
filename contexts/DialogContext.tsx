import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

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
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setOpts(null);
    });
  }, [opacity, scale]);

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

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={close}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlayHeavy, opacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (opts?.dismissable !== false) close(); }}
          />
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder, transform: [{ scale }] },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${toneColor}1A` }]}>
              <MaterialCommunityIcons name={iconName} size={30} color={toneColor} />
            </View>

            {!!opts?.title && <Text style={[styles.title, { color: colors.text }]}>{opts.title}</Text>}
            {!!opts?.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{opts.message}</Text>}

            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {buttons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const filled = !isCancel;
                const bg = isDestructive ? colors.error : isCancel ? 'transparent' : colors.primary;
                const fg = isCancel ? colors.textSecondary : '#FFFFFF';
                return (
                  <Pressable
                    key={`${btn.text}-${i}`}
                    onPress={() => handleButton(btn)}
                    style={({ pressed }) => [
                      styles.btn,
                      stacked ? styles.btnStacked : styles.btnRow,
                      {
                        backgroundColor: filled ? bg : 'transparent',
                        borderColor: isCancel ? colors.cardBorder : bg,
                        borderWidth: isCancel ? 1 : 0,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    android_ripple={{ color: `${fg}22` }}
                  >
                    <Text style={[styles.btnText, { color: fg }]}>{btn.text}</Text>
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
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    // subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  message: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  actionsStacked: { flexDirection: 'column-reverse' },
  btn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, overflow: 'hidden' },
  btnRow: { flex: 1 },
  btnStacked: { width: '100%' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
