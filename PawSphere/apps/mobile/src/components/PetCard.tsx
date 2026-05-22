import { TouchableOpacity, View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import type { Pet, Species } from '../services/pets';
import { useTheme } from '../theme/ThemeContext';

const CARD_GAP = 12;
const CARD_SIZE = (Dimensions.get('window').width - 48 - CARD_GAP) / 2;

type SpeciesCfg = { emoji: string; color: string; lightBg: string; darkBg: string };

const SPECIES_CONFIG: Record<Species, SpeciesCfg> = {
  DOG:     { emoji: '🐶', color: '#E8900A', lightBg: '#FFF4E5', darkBg: '#261800' },
  CAT:     { emoji: '🐱', color: '#9D7FEA', lightBg: '#F0EAFF', darkBg: '#1A0D38' },
  BIRD:    { emoji: '🐦', color: '#4A9EFF', lightBg: '#EDF5FF', darkBg: '#071528' },
  RABBIT:  { emoji: '🐰', color: '#E8453A', lightBg: '#FFF0F0', darkBg: '#280A08' },
  REPTILE: { emoji: '🦎', color: '#2EBD54', lightBg: '#EDFFF3', darkBg: '#061810' },
  FISH:    { emoji: '🐟', color: '#4A9EFF', lightBg: '#EDF9FF', darkBg: '#071520' },
  OTHER:   { emoji: '🐾', color: '#9D7FEA', lightBg: '#EDE9FE', darkBg: '#1E1040' },
};

function getAge(dob: string | null): string {
  if (!dob) return '—';
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
  if (years === 0) {
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    return `${months}mo`;
  }
  return `${years}yr`;
}

interface PetCardProps {
  pet: Pet;
  onPress: (pet: Pet) => void;
}

export function PetCard({ pet, onPress }: PetCardProps) {
  const { colors, isDark } = useTheme();
  const cfg = SPECIES_CONFIG[pet.species];
  const speciesBg = isDark ? cfg.darkBg : cfg.lightBg;

  return (
    <TouchableOpacity
      onPress={() => onPress(pet)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.78}
    >
      <View style={[styles.avatarBox, { backgroundColor: speciesBg }]}>
        <Text style={styles.avatarEmoji}>{cfg.emoji}</Text>
      </View>

      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{pet.name}</Text>
      <Text style={[styles.breed, { color: colors.textTertiary }]} numberOfLines={1}>
        {pet.breed ?? pet.species.charAt(0) + pet.species.slice(1).toLowerCase()}
      </Text>

      <View style={[styles.ageBadge, { backgroundColor: speciesBg }]}>
        <Text style={[styles.ageText, { color: cfg.color }]}>{getAge(pet.dob)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarEmoji: { fontSize: 32 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: '100%',
  },
  breed: {
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },
  ageBadge: {
    marginTop: 12,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  ageText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
