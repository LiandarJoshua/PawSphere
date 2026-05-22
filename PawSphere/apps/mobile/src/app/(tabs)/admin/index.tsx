import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { adminService } from '../../../services/admin';

interface Stats { users: number; pets: number; bookings: number; providers: number; sitters: number; posts: number }
interface Provider { id: string; businessName: string; serviceType: string; isVerified: boolean; rating: number; address?: string }
interface AppUser { id: string; email: string; displayName?: string | null; role: string; createdAt: string }

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingProviders, setPendingProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, u] = await Promise.all([
        adminService.getStats(),
        adminService.listProviders(false),
        adminService.listUsers(),
      ]);
      setStats(s);
      setPendingProviders(p);
      setUsers(u);
    } catch {
      Alert.alert('Error', 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleVerify(provider: Provider, isVerified: boolean) {
    setVerifyingId(provider.id);
    try {
      await adminService.verifyProvider(provider.id, isVerified);
      setPendingProviders((prev) => prev.filter((p) => p.id !== provider.id));
    } catch {
      Alert.alert('Error', 'Failed to update provider.');
    } finally {
      setVerifyingId(null);
    }
  }

  const STAT_CONFIG = [
    { key: 'users', label: 'Users', emoji: '👤' },
    { key: 'pets', label: 'Pets', emoji: '🐾' },
    { key: 'bookings', label: 'Bookings', emoji: '📅' },
    { key: 'providers', label: 'Providers', emoji: '🏥' },
    { key: 'sitters', label: 'Sitters', emoji: '🐶' },
    { key: 'posts', label: 'Posts', emoji: '💬' },
  ] as const;

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: '#6366F1',
    PROVIDER: '#F59E0B',
    OWNER: '#10B981',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Panel</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Platform Management</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {stats && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PLATFORM STATS</Text>
              <View style={styles.statsGrid}>
                {STAT_CONFIG.map(({ key, label, emoji }) => (
                  <View key={key} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.statEmoji}>{emoji}</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats[key]}</Text>
                    <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PENDING VERIFICATION ({pendingProviders.length})</Text>
          {pendingProviders.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>✅</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All providers verified</Text>
            </View>
          ) : (
            pendingProviders.map((provider) => (
              <View key={provider.id} style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.providerInfo}>
                  <Text style={[styles.providerName, { color: colors.text }]}>{provider.businessName}</Text>
                  <Text style={[styles.providerType, { color: colors.textTertiary }]}>
                    {provider.serviceType.replace('_', ' ')}
                    {provider.address ? `  ·  ${provider.address}` : ''}
                  </Text>
                </View>
                <View style={styles.providerActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }, verifyingId === provider.id && { opacity: 0.5 }]}
                    onPress={() => handleVerify(provider, true)}
                    disabled={verifyingId === provider.id}
                    activeOpacity={0.75}
                  >
                    {verifyingId === provider.id
                      ? <ActivityIndicator size="small" color="#16A34A" />
                      : <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>Verify</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => handleVerify(provider, false)}
                    disabled={verifyingId === provider.id}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ALL USERS ({users.length})</Text>
          {users.slice(0, 20).map((user) => (
            <View key={user.id} style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.userInitial, { color: colors.primary }]}>
                  {(user.displayName ?? user.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.displayName ?? user.email.split('@')[0]}</Text>
                <Text style={[styles.userEmail, { color: colors.textTertiary }]}>{user.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] + '20' }]}>
                <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[user.role] }]}>{user.role}</Text>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 10, marginLeft: 4,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '30%', flexGrow: 1, alignItems: 'center', borderRadius: 18, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  emptyBox: {
    borderRadius: 18, padding: 20, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyText: { fontSize: 14, fontWeight: '500' },
  providerCard: {
    borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  providerInfo: { marginBottom: 12 },
  providerName: { fontSize: 15, fontWeight: '700' },
  providerType: { fontSize: 12, marginTop: 2 },
  providerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  userAvatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userInitial: { fontSize: 16, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '700' },
  userEmail: { fontSize: 12, marginTop: 1 },
  roleBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
});
