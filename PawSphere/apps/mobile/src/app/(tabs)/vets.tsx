import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { petsService, type Pet } from '../../services/pets';
import { placesService, getPhotoUrl, type PlaceResult } from '../../services/places';
import { providersService, type Provider } from '../../services/providers';
import { setPendingDiscoveryPlace, providerToDiscovery } from '../../store/pendingDiscovery';
import { useTheme } from '../../theme/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_H_PADDING = 16;
const PET_CARD_W = (SCREEN_W - CARD_H_PADDING * 2 - CARD_GAP) / 2;
const DOCTOR_CARD_W = SCREEN_W * 0.72;

const DUBAI = { lat: 25.2048, lng: 55.2708 };

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐶', CAT: '🐱', BIRD: '🐦', RABBIT: '🐰',
  REPTILE: '🦎', FISH: '🐟', OTHER: '🐾',
};
const SPECIES_COLOR: Record<string, string> = {
  DOG: '#4A9EFF', CAT: '#9D7FEA', BIRD: '#2EBD54',
  RABBIT: '#E8900A', REPTILE: '#34C759', FISH: '#00BCD4', OTHER: '#8B8B8B',
};
const SPECIES_BG_LIGHT: Record<string, string> = {
  DOG: '#EDF5FF', CAT: '#EDE9FE', BIRD: '#EDFFF3',
  RABBIT: '#FFF4E5', REPTILE: '#EDFFF3', FISH: '#E0F7FA', OTHER: '#F2F2F7',
};
const SPECIES_BG_DARK: Record<string, string> = {
  DOG: '#0D1E38', CAT: '#1E1040', BIRD: '#0C2018',
  RABBIT: '#2A1A00', REPTILE: '#0C2018', FISH: '#003240', OTHER: '#1A1A2E',
};
const SPECIES_SPECIALTY: Record<string, string> = {
  DOG: 'Canine Specialist',
  CAT: 'Feline Specialist',
  BIRD: 'Avian Specialist',
  RABBIT: 'Small & Exotic Animal',
  REPTILE: 'Exotic Animal Care',
  FISH: 'Aquatic Animal Care',
  OTHER: 'General Veterinary',
};

// Avatar colour palette for doctor initials
const AVATAR_COLORS = [
  '#8B5CF6', '#4A9EFF', '#2EBD54', '#E8900A',
  '#E84F3A', '#00BCD4', '#9D7FEA', '#34C759',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <Text style={{ fontSize: 12, color: '#E8900A' }}>
      {'★'.repeat(full)}{half ? '⯨' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </Text>
  );
}

// ─── Pet Card ─────────────────────────────────────────────────────────────────

function PetCard({ pet, onPress, colors, isDark }: { pet: Pet; onPress: () => void; colors: any; isDark: boolean }) {
  const emoji = SPECIES_EMOJI[pet.species] ?? '🐾';
  const color = SPECIES_COLOR[pet.species] ?? '#8B8B8B';
  const bg = isDark
    ? (SPECIES_BG_DARK[pet.species] ?? '#1A1A2E')
    : (SPECIES_BG_LIGHT[pet.species] ?? '#F2F2F7');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.petCard,
        { backgroundColor: colors.surface, width: PET_CARD_W },
        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <View style={[styles.petCardTop, { backgroundColor: bg }]}>
        <Text style={styles.petCardEmoji}>{emoji}</Text>
      </View>
      <View style={styles.petCardBody}>
        <Text style={[styles.petCardName, { color: colors.text }]} numberOfLines={1}>
          {pet.name}
        </Text>
        {pet.breed ? (
          <Text style={[styles.petCardBreed, { color: colors.textSecondary }]} numberOfLines={1}>
            {pet.breed}
          </Text>
        ) : null}
        <View style={[styles.speciesBadge, { backgroundColor: bg }]}>
          <Text style={[styles.speciesBadgeText, { color }]}>{pet.species}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Doctor Card (platform providers) ────────────────────────────────────────

function DoctorCard({
  provider, specialty, speciesEmoji, speciesColor, speciesBg, onPress, colors,
}: {
  provider: Provider; specialty: string; speciesEmoji: string;
  speciesColor: string; speciesBg: string; onPress: () => void; colors: any;
}) {
  const bg = avatarColor(provider.businessName);
  const letters = initials(provider.businessName);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.doctorCard,
        { backgroundColor: colors.surface, width: DOCTOR_CARD_W },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      {/* Avatar + verified */}
      <View style={styles.doctorTop}>
        <View style={[styles.doctorAvatar, { backgroundColor: bg }]}>
          <Text style={styles.doctorAvatarText}>{letters}</Text>
        </View>
        {provider.isVerified && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.blueLight }]}>
            <Text style={[styles.verifiedText, { color: colors.blue }]}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={2}>
        {provider.businessName}
      </Text>

      {/* Specialty badge */}
      <View style={[styles.specialtyBadge, { backgroundColor: speciesBg }]}>
        <Text style={styles.specialtyEmoji}>{speciesEmoji}</Text>
        <Text style={[styles.specialtyText, { color: speciesColor }]}>{specialty}</Text>
      </View>

      {/* Qualifications / description */}
      {provider.description ? (
        <Text style={[styles.doctorQuals, { color: colors.textSecondary }]} numberOfLines={2}>
          {provider.description}
        </Text>
      ) : null}

      {/* Rating */}
      {provider.rating > 0 && (
        <View style={styles.ratingRow}>
          <StarRating rating={provider.rating} />
          <Text style={[styles.ratingNum, { color: colors.text }]}>
            {' '}{provider.rating.toFixed(1)}
          </Text>
        </View>
      )}

      {/* Hospital address */}
      {provider.address ? (
        <View style={styles.addressRow}>
          <Text style={{ fontSize: 12 }}>🏥</Text>
          <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
            {provider.address}
          </Text>
        </View>
      ) : null}

      {/* Distance */}
      {provider.distance_km != null && (
        <Text style={[styles.distText, { color: colors.textTertiary }]}>
          📍 {provider.distance_km.toFixed(1)} km away
        </Text>
      )}

      {/* CTA */}
      <Pressable style={[styles.viewMapBtn, { backgroundColor: colors.primary }]} onPress={onPress}>
        <Text style={styles.viewMapBtnText}>View Clinic on Map  →</Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Clinic Card (Google Places) ──────────────────────────────────────────────

function ClinicCard({
  place, specialty, speciesEmoji, speciesColor, speciesBg, onPress, colors,
}: {
  place: PlaceResult; specialty: string; speciesEmoji: string;
  speciesColor: string; speciesBg: string; onPress: () => void; colors: any;
}) {
  const photoUrl = place.photoRef ? getPhotoUrl(place.photoRef, 600) : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.clinicCard,
        { backgroundColor: colors.surface },
        pressed && { opacity: 0.92 },
      ]}
      onPress={onPress}
    >
      {/* Photo */}
      <View style={styles.clinicPhotoWrapper}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.clinicPhoto} resizeMode="cover" />
        ) : (
          <View style={[styles.clinicPhotoPlaceholder, { backgroundColor: speciesBg }]}>
            <Text style={styles.clinicPhotoEmoji}>🏥</Text>
          </View>
        )}
        {place.isOpen !== null && (
          <View style={[styles.openPill, { backgroundColor: place.isOpen ? '#2EBD54' : '#FF3B30' }]}>
            <Text style={styles.openPillText}>{place.isOpen ? '● Open' : '● Closed'}</Text>
          </View>
        )}
        <View style={styles.distPill}>
          <Text style={styles.distPillText}>📍 {place.distanceKm} km</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.clinicBody}>
        <View style={[styles.specialtyBadge, { backgroundColor: speciesBg }]}>
          <Text style={styles.specialtyEmoji}>{speciesEmoji}</Text>
          <Text style={[styles.specialtyText, { color: speciesColor }]}>{specialty}</Text>
        </View>

        <Text style={[styles.clinicName, { color: colors.text }]} numberOfLines={2}>
          {place.name}
        </Text>

        {place.rating != null && (
          <View style={styles.ratingRow}>
            <StarRating rating={place.rating} />
            <Text style={[styles.ratingNum, { color: colors.text }]}>{' '}{place.rating.toFixed(1)}</Text>
            {place.reviewCount != null && (
              <Text style={[styles.reviewCount, { color: colors.textTertiary }]}>
                {' '}({place.reviewCount})
              </Text>
            )}
          </View>
        )}

        <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
          {place.address}
        </Text>

        <Pressable style={[styles.viewMapBtn, { backgroundColor: colors.primary }]} onPress={onPress}>
          <Text style={styles.viewMapBtnText}>View on Map  →</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ title, count, colors }: { title: string; count: number; colors: any }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {count > 0 && (
        <View style={[styles.sectionCount, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.sectionCountText, { color: colors.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function VetsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = colors.statusBar === 'light';

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const [doctors, setDoctors] = useState<Provider[]>([]);
  const [clinics, setClinics] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const userCoords = useRef(DUBAI);

  useEffect(() => {
    petsService.list()
      .then(setPets)
      .catch(() => {})
      .finally(() => setPetsLoading(false));

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        userCoords.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    })();
  }, []);

  const loadRecommendations = useCallback(async (pet: Pet) => {
    setSelectedPet(pet);
    setDoctors([]);
    setClinics([]);
    setLoadError(null);
    setLoading(true);
    try {
      const { lat, lng } = userCoords.current;
      const [providerData, placeData] = await Promise.all([
        providersService.nearby(lat, lng, 50, 'VET'),
        placesService.nearby(lat, lng, 15, 'VET'),
      ]);
      setDoctors(providerData);
      setClinics(placeData);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not load results');
    } finally {
      setLoading(false);
    }
  }, []);

  const openDoctorOnMap = useCallback((provider: Provider) => {
    const { place, detail } = providerToDiscovery(provider);
    setPendingDiscoveryPlace(place, detail);
    router.push('/(tabs)/discovery' as never);
  }, [router]);

  const openClinicOnMap = useCallback((place: PlaceResult) => {
    setPendingDiscoveryPlace(place);
    router.push('/(tabs)/discovery' as never);
  }, [router]);

  // ── Step 1: Pet Selection ──────────────────────────────────────────────────
  if (!selectedPet) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />

        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Find a Vet</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Which pet needs care today?
          </Text>
        </View>

        {petsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : pets.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>🐾</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No pets yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add a pet to get personalised vet recommendations
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/pets/add')}
            >
              <Text style={styles.primaryBtnText}>+ Add a Pet</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={pets}
            keyExtractor={(p) => p.id}
            numColumns={2}
            contentContainerStyle={styles.petGrid}
            columnWrapperStyle={styles.petRow}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: pet }) => (
              <PetCard
                pet={pet}
                onPress={() => loadRecommendations(pet)}
                colors={colors}
                isDark={isDark}
              />
            )}
          />
        )}
      </View>
    );
  }

  // ── Step 2: Vet Recommendations ────────────────────────────────────────────
  const species = selectedPet.species ?? 'OTHER';
  const specialty = SPECIES_SPECIALTY[species] ?? 'General Veterinary';
  const speciesEmoji = SPECIES_EMOJI[species] ?? '🐾';
  const speciesColor = SPECIES_COLOR[species] ?? '#8B8B8B';
  const speciesBg = isDark
    ? (SPECIES_BG_DARK[species] ?? '#1A1A2E')
    : (SPECIES_BG_LIGHT[species] ?? '#F2F2F7');

  const doctorsHeader = (
    <>
      {/* Back + selected pet chip */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedPet(null)}>
            <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
          </Pressable>
          <View style={[styles.petChip, { backgroundColor: speciesBg }]}>
            <Text style={styles.petChipEmoji}>{speciesEmoji}</Text>
            <Text style={[styles.petChipName, { color: speciesColor }]} numberOfLines={1}>
              {selectedPet.name}
            </Text>
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recommended Vets</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          {specialty}s near you for {selectedPet.name}
        </Text>
      </View>

      {loading ? null : (
        <>
          {/* ── Doctors section ── */}
          <View style={styles.sectionBlock}>
            <SectionLabel title="Registered Doctors" count={doctors.length} colors={colors} />

            {doctors.length === 0 ? (
              <View style={[styles.emptySection, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.emptySectionText, { color: colors.textTertiary }]}>
                  No registered vets on PawSphere near you yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={doctors}
                keyExtractor={(d) => d.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.doctorList}
                snapToInterval={DOCTOR_CARD_W + 12}
                decelerationRate="fast"
                renderItem={({ item: provider }) => (
                  <DoctorCard
                    provider={provider}
                    specialty={specialty}
                    speciesEmoji={speciesEmoji}
                    speciesColor={speciesColor}
                    speciesBg={speciesBg}
                    onPress={() => openDoctorOnMap(provider)}
                    colors={colors}
                  />
                )}
              />
            )}
          </View>

          {/* ── Clinics section header ── */}
          <View style={styles.sectionBlock}>
            <SectionLabel title="Nearby Clinics" count={clinics.length} colors={colors} />
          </View>
        </>
      )}
    </>
  );

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
        {doctorsHeader}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Finding the best vets near you…
          </Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
        {doctorsHeader}
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Could not load results</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{loadError}</Text>
          <Pressable
            style={[styles.outlineBtn, { borderColor: colors.primary }]}
            onPress={() => loadRecommendations(selectedPet)}
          >
            <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      {/* Clinics list with doctors + headers as ListHeaderComponent */}
      <FlatList
        data={clinics}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.clinicList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={doctorsHeader}
        ListEmptyComponent={
          <View style={styles.centeredInline}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No clinics found nearby</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try opening the full map to explore your area
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/discovery')}
            >
              <Text style={styles.primaryBtnText}>Open Map</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: place }) => (
          <ClinicCard
            place={place}
            specialty={specialty}
            speciesEmoji={speciesEmoji}
            speciesColor={speciesColor}
            speciesBg={speciesBg}
            onPress={() => openClinicOnMap(place)}
            colors={colors}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 14, lineHeight: 20 },

  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 15, fontWeight: '600' },

  petChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 50, gap: 6, maxWidth: 180,
  },
  petChipEmoji: { fontSize: 16 },
  petChipName: { fontSize: 14, fontWeight: '700' },

  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  centeredInline: {
    alignItems: 'center', paddingHorizontal: 32,
    paddingTop: 24, paddingBottom: 40, gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },

  primaryBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },

  // ── Section labels ────────────────────────────────────────────────────────
  sectionBlock: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 },
  sectionCountText: { fontSize: 12, fontWeight: '700' },

  emptySection: {
    borderRadius: 14, paddingVertical: 20, paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptySectionText: { fontSize: 13, textAlign: 'center' },

  // ── Pet grid ──────────────────────────────────────────────────────────────
  petGrid: { padding: 16, paddingBottom: 32 },
  petRow: { gap: CARD_GAP, marginBottom: CARD_GAP },

  petCard: {
    borderRadius: 18, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  petCardTop: { height: PET_CARD_W * 0.75, alignItems: 'center', justifyContent: 'center' },
  petCardEmoji: { fontSize: 52 },
  petCardBody: { padding: 12, gap: 4 },
  petCardName: { fontSize: 15, fontWeight: '700' },
  petCardBreed: { fontSize: 12 },
  speciesBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 50, marginTop: 2,
  },
  speciesBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // ── Doctor cards (horizontal scroll) ─────────────────────────────────────
  doctorList: { paddingLeft: 16, paddingRight: 6, paddingBottom: 4, gap: 12 },

  doctorCard: {
    borderRadius: 20, padding: 16, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  doctorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doctorAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  doctorAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  verifiedBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 50,
  },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  doctorName: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  doctorQuals: { fontSize: 12, lineHeight: 17 },

  // ── Clinic cards (vertical list) ──────────────────────────────────────────
  clinicList: { paddingBottom: 40 },

  clinicCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  clinicPhotoWrapper: { position: 'relative' },
  clinicPhoto: { width: '100%', height: 170 },
  clinicPhotoPlaceholder: { width: '100%', height: 170, alignItems: 'center', justifyContent: 'center' },
  clinicPhotoEmoji: { fontSize: 56 },

  openPill: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
  },
  openPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  distPill: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  distPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  clinicBody: { padding: 14, gap: 7 },
  clinicName: { fontSize: 17, fontWeight: '800', lineHeight: 22 },

  // ── Shared ────────────────────────────────────────────────────────────────
  specialtyBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, gap: 5,
  },
  specialtyEmoji: { fontSize: 12 },
  specialtyText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingNum: { fontSize: 13, fontWeight: '600' },
  reviewCount: { fontSize: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText: { flex: 1, fontSize: 13, lineHeight: 18 },
  distText: { fontSize: 12 },
  viewMapBtn: {
    marginTop: 4, paddingVertical: 11, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  viewMapBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
