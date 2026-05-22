import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { sittersService, SPECIALTIES, type SitterProfile } from '../../services/sitters';
import { useTheme } from '../../theme/ThemeContext';

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <Text style={{ fontSize: size, color: '#FF9500' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </Text>
  );
}

function SitterCard({ sitter, onPress }: { sitter: SitterProfile; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.avatarEmoji}>🐾</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {sitter.displayName}
          </Text>
          <View
            style={[
              styles.availBadge,
              { backgroundColor: colors.greenLight },
              !sitter.isAvailable && [styles.unavailBadge, { backgroundColor: colors.surface2 }],
            ]}
          >
            <View
              style={[
                styles.availDot,
                !sitter.isAvailable && [styles.unavailDot, { backgroundColor: colors.textTertiary }],
              ]}
            />
            <Text
              style={[
                styles.availText,
                { color: colors.green },
                !sitter.isAvailable && [styles.unavailText, { color: colors.textTertiary }],
              ]}
            >
              {sitter.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>

        {sitter.reviewCount > 0 && (
          <View style={styles.ratingRow}>
            <StarRow rating={sitter.rating} />
            <Text style={[styles.ratingNum, { color: colors.text }]}> {sitter.rating.toFixed(1)}</Text>
            <Text style={[styles.reviewCount, { color: colors.textTertiary }]}> ({sitter.reviewCount})</Text>
          </View>
        )}

        {sitter.specialties.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
            {sitter.specialties.map((s) => {
              const sp = SPECIALTIES.find((x) => x.key === s);
              return sp ? (
                <View
                  key={s}
                  style={[styles.specialtyChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                >
                  <Text style={[styles.specialtyChipText, { color: colors.textSecondary }]}>
                    {sp.emoji} {sp.label}
                  </Text>
                </View>
              ) : null;
            })}
          </ScrollView>
        )}

        <View style={styles.metaRow}>
          {sitter.city && <Text style={[styles.metaText, { color: colors.textSecondary }]}>📍 {sitter.city}</Text>}
          <Text style={[styles.priceText, { color: colors.primary }]}>AED {sitter.hourlyRate}/hr</Text>
          {sitter.dailyRate && (
            <Text style={[styles.priceText, { color: colors.primary }]}> · AED {sitter.dailyRate}/day</Text>
          )}
        </View>

        {sitter.experience > 0 && (
          <Text style={[styles.expText, { color: colors.textTertiary }]}>
            {sitter.experience} yr{sitter.experience !== 1 ? 's' : ''} experience
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SittersScreen() {
  const { colors } = useTheme();

  const [sitters, setSitters] = useState<SitterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availFilter, setAvailFilter] = useState<boolean | undefined>(undefined);
  const [specialtyFilter, setSpecialtyFilter] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sittersService.list({
        available: availFilter,
        specialty: specialtyFilter,
      });
      setSitters(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load sitters');
    } finally {
      setLoading(false);
    }
  }, [availFilter, specialtyFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const q = searchQuery.trim().toLowerCase();
  const displayedSitters = q
    ? sitters.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          (s.city ?? '').toLowerCase().includes(q),
      )
    : sitters;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.separator },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pet Sitters</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Verified locals who care for your pet at home — book by the hour or day.</Text>
        </View>
        <TouchableOpacity
          style={[styles.becomeBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/sitters/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.becomeBtnText}>Become a Sitter</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Availability */}
      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.surface, borderBottomColor: colors.separator },
        ]}
      >
        <View style={[styles.searchBox, { backgroundColor: colors.surface2 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name or city…"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: colors.surface2, borderColor: 'transparent' },
            availFilter === true && { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
          ]}
          onPress={() => setAvailFilter(availFilter === true ? undefined : true)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: colors.textSecondary },
              availFilter === true && { color: colors.primary },
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>
      </View>

      {/* Specialty pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.specialtyBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.separator },
        ]}
        contentContainerStyle={styles.specialtyBarContent}
      >
        {SPECIALTIES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.filterChip,
              { backgroundColor: colors.surface2, borderColor: 'transparent' },
              specialtyFilter === s.key && { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
            ]}
            onPress={() => setSpecialtyFilter(specialtyFilter === s.key ? undefined : s.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                specialtyFilter === s.key && { color: colors.primary },
              ]}
            >
              {s.emoji} {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]}
            onPress={load}
            activeOpacity={0.75}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sitters.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🐾</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No sitters found</Text>
          <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>
            Be the first to register as a sitter!
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => router.push('/(tabs)/sitters/register')}
            activeOpacity={0.75}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Register Now</Text>
          </TouchableOpacity>
        </View>
      ) : displayedSitters.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No results for "{searchQuery}"</Text>
          <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>Try a different name or city.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {displayedSitters.length} sitter{displayedSitters.length !== 1 ? 's' : ''}{q ? ` for "${searchQuery}"` : ' found'}
          </Text>
          {displayedSitters.map((s) => (
            <SitterCard key={s.id} sitter={s} onPress={() => router.push(`/(tabs)/sitters/${s.id}`)} />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  becomeBtn: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...Platform.select({
      ios: { shadowColor: '#E8A0A0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  becomeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 38, borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 14 },

  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  specialtyBar: { maxHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  specialtyBarContent: { paddingHorizontal: 14, paddingVertical: 9, gap: 8 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyText: { fontSize: 16, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  emptySubText: { fontSize: 13, marginTop: 5, textAlign: 'center', fontWeight: '500' },
  retryBtn: { marginTop: 20, borderRadius: 100, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: '700' },

  countText: { fontSize: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 10, borderRadius: 20, padding: 16, gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  avatar: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarEmoji: { fontSize: 26 },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8, letterSpacing: -0.2 },

  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  unavailBadge: {},
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' },
  unavailDot: {},
  availText: { fontSize: 11, fontWeight: '700' },
  unavailText: {},

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingNum: { fontSize: 13, fontWeight: '700' },
  reviewCount: { fontSize: 12 },

  specialtyChip: {
    borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  specialtyChipText: { fontSize: 12, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: '500' },
  priceText: { fontSize: 13, fontWeight: '700' },
  expText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
});
