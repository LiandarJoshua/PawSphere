import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Provider, ServiceType } from '../services/providers';

const TYPE_CONFIG: Record<ServiceType, { emoji: string; color: string }> = {
  VET: { emoji: '🏥', color: '#007AFF' },
  GROOMER: { emoji: '✂️', color: '#F4C2C2' },
  PET_STORE: { emoji: '🛍️', color: '#34C759' },
  PET_HOTEL: { emoji: '🏨', color: '#FF9500' },
  TRAINER: { emoji: '🎓', color: '#AF52DE' },
};

interface MapMarkerProps {
  provider: Provider;
  onPress: (provider: Provider) => void;
  selected?: boolean;
}

export function MapMarker({ provider, onPress, selected }: MapMarkerProps) {
  const config = TYPE_CONFIG[provider.serviceType];

  return (
    <Marker
      coordinate={{ latitude: provider.latitude, longitude: provider.longitude }}
      onPress={() => onPress(provider)}
      tracksViewChanges={false}
    >
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  pinSelected: {
    borderColor: '#F4C2C2',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  emoji: { fontSize: 22 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 2,
  },
});
