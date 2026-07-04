import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#D94F00" />
        <Text style={styles.title}>Page Not Found</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#FFF8F0' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 16 },
  link: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24 },
  linkText: { fontSize: 16, color: '#D94F00', fontWeight: '600' },
});
