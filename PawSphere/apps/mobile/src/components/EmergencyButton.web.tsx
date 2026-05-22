import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';

const EMERGENCY_PHONE = '+97143373737';

export function EmergencyButton() {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/discovery' as never)}
        onLongPress={() => Linking.openURL(`tel:${EMERGENCY_PHONE}`)}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>🚨</Text>
        <Text style={styles.label}>Emergency</Text>
        <Text style={styles.sub}>Find nearest vet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: 100 },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  icon: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  sub: { fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
