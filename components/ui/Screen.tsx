import React from 'react';
import { View, ScrollView, StyleSheet, StatusBar, ScrollViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { DS, useDsInsets } from '../../constants/ds';

/**
 * Standard screen wrapper. One horizontal padding, safe-area handled, and
 * bottom padding that guarantees content is never hidden behind the floating
 * tab bar. Use `scroll` for scrollable screens, `tabbed` = true when the
 * screen sits inside the tab navigator.
 */
type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  tabbed?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
};

export default function Screen({
  children, scroll = false, tabbed = false, edges = { top: true, bottom: true },
  style, contentStyle, scrollProps,
}: Props) {
  const { colors, isDark } = useTheme();
  const { insets, tabScrollBottom, screenBottom } = useDsInsets();
  const paddingTop = edges.top ? insets.top : 0;
  const paddingBottom = tabbed ? tabScrollBottom : (edges.bottom ? screenBottom : 0);

  const container: ViewStyle = { flex: 1, backgroundColor: colors.background };

  if (scroll) {
    return (
      <View style={[container, style]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ScrollView
          {...scrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingTop, paddingBottom, paddingHorizontal: DS.layout.screenPaddingH },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[container, { paddingTop, paddingBottom, paddingHorizontal: DS.layout.screenPaddingH }, style]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({});
