import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { bookingsService, type AppointmentBooking } from '../../services/providers';
import { api } from '../../lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB', darkBg: '#2A1F00' },
  CONFIRMED: { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5', darkBg: '#002A1A' },
  COMPLETED: { label: 'Completed', color: '#6366F1', bg: '#EEF2FF', darkBg: '#100A2E' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', darkBg: '#2A0000' },
};

const SERVICE_EMOJI: Record<string, string> = {
  VET: '🏥', GROOMER: '✂️', PET_STORE: '🛍️', PET_HOTEL: '🏨', TRAINER: '🎓',
};

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐶', CAT: '🐱', BIRD: '🐦', RABBIT: '🐰',
  REPTILE: '🦎', FISH: '🐠', OTHER: '🐾',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Past';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h`;
  return 'Soon';
}

export default function BookingsScreen() {
  const { colors, isDark } = useTheme();
  const [bookings, setBookings] = useState<AppointmentBooking[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<AppointmentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'payments'>('bookings');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, payments] = await Promise.all([
        bookingsService.list(),
        api.get<AppointmentBooking[]>('/bookings/payment-history').catch(() => [] as AppointmentBooking[]),
      ]);
      setBookings(data);
      setPaymentHistory(payments);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleCancel(id: string) {
    const doCancel = async () => {
      setCancellingId(id);
      try {
        await bookingsService.cancel(id);
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'CANCELLED' } : b));
        Alert.alert('Cancelled', 'Your booking has been cancelled.');
      } catch {
        Alert.alert('Error', 'Could not cancel booking. Please try again.');
      } finally {
        setCancellingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this appointment?')) doCancel();
    } else {
      Alert.alert('Cancel appointment?', 'This cannot be undone.', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel booking', style: 'destructive', onPress: doCancel },
      ]);
    }
  }

  const upcoming = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED');
  const past = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  function renderPaymentHistoryItem(booking: AppointmentBooking) {
    const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.COMPLETED;
    return (
      <View key={booking.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.serviceIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.serviceIconText}>{SERVICE_EMOJI[booking.provider.serviceType] ?? '🏥'}</Text>
          </View>
          <View style={styles.cardTopInfo}>
            <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
              {booking.provider.businessName}
            </Text>
            <Text style={[styles.serviceType, { color: colors.textSecondary }]}>
              {formatDateTime(booking.scheduledAt)}
            </Text>
          </View>
          <View>
            <Text style={[styles.businessName, { color: colors.text }]}>AED {booking.totalPrice}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isDark ? cfg.darkBg : cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderBooking(booking: AppointmentBooking) {
    const cfg = STATUS_CONFIG[booking.status];
    const isCancelling = cancellingId === booking.id;
    const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
    const bgColor = isDark ? cfg.darkBg : cfg.bg;

    return (
      <View key={booking.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top row: service icon + name + status */}
        <View style={styles.cardTop}>
          <View style={[styles.serviceIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.serviceIconText}>{SERVICE_EMOJI[booking.provider.serviceType] ?? '🏥'}</Text>
          </View>
          <View style={styles.cardTopInfo}>
            <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
              {booking.provider.businessName}
            </Text>
            <Text style={[styles.serviceType, { color: colors.textSecondary }]}>
              {booking.provider.serviceType.replace('_', ' ')}
              {booking.provider.address ? `  ·  ${booking.provider.address}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.detailsBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailIcon]}>📅</Text>
            <View style={styles.detailBody}>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(booking.scheduledAt)}</Text>
              {booking.status === 'PENDING' && (
                <Text style={[styles.detailHint, { color: colors.primary }]}>{timeUntil(booking.scheduledAt)}</Text>
              )}
            </View>
          </View>

          {booking.timeSlot && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {booking.timeSlot.durationMin} min
                {booking.timeSlot.label ? `  ·  ${booking.timeSlot.label}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>{SPECIES_EMOJI[booking.pet.species] ?? '🐾'}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{booking.pet.name}</Text>
          </View>

          {booking.totalPrice > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💰</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>AED {booking.totalPrice}</Text>
            </View>
          )}

          {booking.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📝</Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]} numberOfLines={2}>{booking.notes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => handleCancel(booking.id)}
            disabled={isCancelling}
            activeOpacity={0.7}
          >
            {isCancelling
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Text style={styles.cancelBtnText}>Cancel appointment</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Appointments</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>{bookings.length} total</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        {(['bookings', 'payments'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.textTertiary }]}>
              {tab === 'bookings' ? `Appointments (${bookings.length})` : `Payments (${paymentHistory.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : activeTab === 'payments' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {paymentHistory.length === 0 ? (
            <View style={[styles.centered, { marginTop: 60 }]}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment history</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Payments will appear here after you book and pay.</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PAYMENT HISTORY</Text>
              {paymentHistory.map(renderPaymentHistoryItem)}
            </>
          )}
        </ScrollView>
      ) : bookings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No appointments yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Open the Discover tab and tap 📅 Book on any vet, groomer, or kennel.
          </Text>
          <TouchableOpacity
            style={[styles.discoverBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/discovery')}
            activeOpacity={0.85}
          >
            <Text style={styles.discoverBtnText}>Go to Discover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {upcoming.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>UPCOMING</Text>
              {upcoming.map(renderBooking)}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PAST</Text>
              {past.map(renderBooking)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, fontWeight: '600', marginTop: -1 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1, fontWeight: '500' },

  list: { padding: 16, paddingBottom: 40, gap: 12 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 8, marginBottom: 4, marginLeft: 4,
  },

  card: {
    borderRadius: 20, padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  serviceIconText: { fontSize: 22 },
  cardTopInfo: { flex: 1 },
  businessName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  serviceType: { fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  detailsBox: {
    borderRadius: 14, padding: 12, gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailIcon: { fontSize: 15, width: 20, textAlign: 'center', marginTop: 1 },
  detailBody: { flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500', flex: 1 },
  detailHint: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  cancelBtn: {
    height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  discoverBtn: { height: 50, borderRadius: 16, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  discoverBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
