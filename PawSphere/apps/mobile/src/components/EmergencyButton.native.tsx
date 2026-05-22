import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';

// UAE 24/7 emergency vet hotline (Dubai Municipality Animal Services)
const EMERGENCY_PHONE = '+97143373737';

export function EmergencyButton() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const handlePress = async () => {
    // Try to get location and route to nearest vet on the map
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      router.push('/(tabs)/discovery' as never);
    } else {
      // Fallback: call UAE emergency vet line directly
      Linking.openURL(`tel:${EMERGENCY_PHONE}`);
    }
  };

  const handleLongPress = () => {
    Linking.openURL(`tel:${EMERGENCY_PHONE}`);
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]} />
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessibilityLabel="Emergency — find nearest vet"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>🚨</Text>
        <Text style={styles.label}>Emergency</Text>
        <Text style={styles.sub}>Find nearest vet</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  icon: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  sub: { fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
