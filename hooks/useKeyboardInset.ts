import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard on Android, 0 when hidden (and always 0 on
 * iOS/web, where KeyboardAvoidingView handles it). Android draws the app
 * edge-to-edge, so the window no longer shrinks for the keyboard and a bottom
 * input bar ends up hidden behind it; pad by this amount instead.
 */
export function useKeyboardInset(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setH(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return h;
}
