import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type SheetAction = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean };

/** Bottom sheet with a short list of actions (post menu, message menu…). */
export default function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.sheet, { backgroundColor: colors.surface, paddingBottom: 12 + insets.bottom }]}>
          <View style={[s.handle, { backgroundColor: colors.divider }]} />
          {!!title && <Text style={[s.title, { color: colors.textTertiary }]} numberOfLines={1}>{title}</Text>}
          {actions.map((a) => (
            <TouchableOpacity key={a.label} style={s.row} onPress={() => { onClose(); setTimeout(a.onPress, 120); }} activeOpacity={0.7}>
              <Ionicons name={a.icon} size={21} color={a.danger ? colors.error : colors.text} />
              <Text style={[s.label, { color: a.danger ? colors.error : colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  label: { fontSize: 16, fontWeight: '600' },
});
