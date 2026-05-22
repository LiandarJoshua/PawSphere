import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Dimensions, ActivityIndicator, RefreshControl, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { petsService, type Pet } from '../../services/pets';
import { PetCard } from '../../components/PetCard';
import { EmergencyButton } from '../../components/EmergencyButton';
import { AIReminderList } from '../../components/AIReminderList';
import { PawBotModal } from '../../components/PawBotModal';
import { useTheme } from '../../theme/ThemeContext';

const TILE_WIDTH = (Dimensions.get('window').width - 48 - 12) / 2;

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Find Vet',     color: '#007AFF', bg: '#EDF5FF', route: '/(tabs)/discovery' },
  { icon: '📅', label: 'Appointments', color: '#8B5CF6', bg: '#EDE9FE', route: '/(tabs)/bookings' },
];

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user, profileAvatarUrl } = useAuthStore();
  const { colors, isDark, setMode } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;

  const loadPets = useCallback(async () => {
    try {
      const data = await petsService.list();
      setPets(data);
      setError(null);
    } catch {
      setError('Could not load pets. Is the API server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPets(); }, [loadPets]));

  const onRefresh = () => { setRefreshing(true); loadPets(); };

  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.91, duration: 70, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    setChatOpen(true);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅 Good morning';
    if (h < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  const displayName = user?.email?.split('@')[0] ?? 'there';
  const initial = displayName[0].toUpperCase();
  const metaAvatar = (user?.user_metadata as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
  const avatarUrl = profileAvatarUrl ?? metaAvatar;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <PawBotModal visible={chatOpen} onClose={() => setChatOpen(false)} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textTertiary }]}>{greeting()}</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Dark mode toggle */}
            <TouchableOpacity
              onPress={() => setMode(isDark ? 'light' : 'dark')}
              style={[styles.themeBtn, { backgroundColor: colors.surface2 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.themeBtnIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>

            {/* Profile avatar */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as never)}
              style={[styles.avatarButton, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
              activeOpacity={0.8}
            >
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                : <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <EmergencyButton />
          <View style={styles.quickActionsRight}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionCard, { backgroundColor: action.bg, borderColor: colors.border }]}
                onPress={() => action.route && router.push(action.route as never)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                </View>
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Pets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('pets.myPets')}</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push('/(tabs)/pets/add' as never)}
              activeOpacity={0.75}
            >
              <Text style={[styles.addButtonText, { color: colors.primary }]}>+ Add Pet</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : error ? (
            <View style={[styles.errorState, { backgroundColor: colors.surface }]}>
              <Text style={styles.errorStateIcon}>🔌</Text>
              <Text style={[styles.errorStateTitle, { color: colors.text }]}>API server not running</Text>
              <Text style={[styles.errorStateText, { color: colors.textSecondary }]}>
                Start it with:{'\n'}
                <Text style={[styles.code, { color: colors.primary }]}>cd apps/api && npm run dev</Text>
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]}
                onPress={loadPets}
                activeOpacity={0.75}
              >
                <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pets.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
              onPress={() => router.push('/(tabs)/pets/add' as never)}
              activeOpacity={0.75}
            >
              <Text style={styles.emptyCardEmoji}>🐾</Text>
              <Text style={[styles.emptyCardTitle, { color: colors.text }]}>Add your first pet</Text>
              <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>Tap to get started</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.petGrid}>
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} onPress={(p) => router.push(`/(tabs)/pets/${p.id}` as never)} />
              ))}
              <TouchableOpacity
                style={[styles.addPetTile, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
                onPress={() => router.push('/(tabs)/pets/add' as never)}
                activeOpacity={0.75}
              >
                <View style={[styles.addPetIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.addPetPlus, { color: colors.primary }]}>+</Text>
                </View>
                <Text style={[styles.addPetLabel, { color: colors.primary }]}>Add Pet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ai.reminders')}</Text>
          <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>Daily care tips generated by AI based on your pets' health records.</Text>
          <View style={{ marginTop: 10 }}>
            <AIReminderList />
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* PawBot FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleFabPress}
          activeOpacity={1}
        >
          <Text style={styles.fabEmoji}>🐾</Text>
          <Text style={styles.fabLabel}>Ask PawBot</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 3 },
  userName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnIcon: { fontSize: 16 },

  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 18, fontWeight: '700' },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 12,
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickActionsRight: { flex: 1, gap: 10 },
  actionCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },

  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  sectionHint: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  addButton: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addButtonText: { fontSize: 13, fontWeight: '700' },

  centeredState: { paddingVertical: 48, alignItems: 'center' },

  errorState: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  errorStateIcon: { fontSize: 36, marginBottom: 12 },
  errorStateTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  errorStateText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  retryBtn: {
    marginTop: 16,
    borderRadius: 100,
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700' },

  emptyCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyCardEmoji: { fontSize: 40, marginBottom: 12 },
  emptyCardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  emptyCardSub: { fontSize: 13, marginTop: 5, fontWeight: '500' },

  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  addPetTile: {
    width: TILE_WIDTH,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 148,
  },
  addPetIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addPetPlus: { fontSize: 24, fontWeight: '300' },
  addPetLabel: { fontSize: 13, fontWeight: '700' },

  fabContainer: {
    position: 'absolute',
    bottom: 92,
    right: 20,
  },
  fab: {
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  fabEmoji: { fontSize: 19 },
  fabLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.1 },
});
