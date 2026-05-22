import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { providerDashboardService } from '../../../services/providerDashboard';

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  CONFIRMED: { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5' },
  COMPLETED: { label: 'Completed', color: '#6366F1', bg: '#EEF2FF' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ProviderDashboardScreen() {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<number>(0);
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  const [startsAt, setStartsAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, e, t] = await Promise.all([
        providerDashboardService.getMyBookings(),
        providerDashboardService.getMyEarnings(),
        providerDashboardService.getMyTimeslots(),
      ]);
      setBookings(b);
      setEarnings(e.total);
      setTimeslots(t);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleCreateSlot() {
    if (!startsAt.trim() || !price.trim()) {
      Alert.alert('Missing fields', 'Please enter the date/time and price.');
      return;
    }
    setSavingSlot(true);
    try {
      const slot = await providerDashboardService.createTimeslot({
        startsAt,
        durationMin: parseInt(duration, 10) || 30,
        price: parseFloat(price),
        label: label.trim() || undefined,
      });
      setTimeslots((prev) => [...prev, slot]);
      setStartsAt(''); setDuration('30'); setPrice(''); setLabel('');
      setSlotModalVisible(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create slot');
    } finally {
      setSavingSlot(false);
    }
  }

  const upcomingBookings = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Provider Dashboard</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Your business overview</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={[styles.earningsCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.earningsLabel}>Total Earnings (Completed)</Text>
            <Text style={styles.earningsValue}>AED {earnings.toFixed(2)}</Text>
            <Text style={styles.earningsSub}>{bookings.filter((b) => b.status === 'COMPLETED').length} completed bookings</Text>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>UPCOMING BOOKINGS ({upcomingBookings.length})</Text>
          {upcomingBookings.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>📅</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming bookings</Text>
            </View>
          ) : (
            upcomingBookings.map((booking) => {
              const cfg = STATUS_COLORS[booking.status] ?? STATUS_COLORS.PENDING;
              return (
                <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingEmoji}>{booking.pet?.species === 'CAT' ? '🐱' : booking.pet?.species === 'BIRD' ? '🐦' : '🐶'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookingPet, { color: colors.text }]}>{booking.pet?.name ?? 'Unknown pet'}</Text>
                      <Text style={[styles.bookingDate, { color: colors.textTertiary }]}>{formatDate(booking.scheduledAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  {booking.totalPrice > 0 && (
                    <Text style={[styles.bookingPrice, { color: colors.textSecondary }]}>AED {booking.totalPrice}</Text>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.slotHeader}>
            <Text style={[styles.sectionHeader, { color: colors.textTertiary, marginTop: 0 }]}>TIME SLOTS ({timeslots.length})</Text>
            <TouchableOpacity
              style={[styles.addSlotBtn, { backgroundColor: colors.primary }]}
              onPress={() => setSlotModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addSlotBtnText}>+ Add Slot</Text>
            </TouchableOpacity>
          </View>

          {timeslots.slice(0, 15).map((slot) => (
            <View key={slot.id} style={[styles.slotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.slotTime, { color: colors.text }]}>
                {new Date(slot.startsAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                {' '}·{' '}
                {new Date(slot.startsAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
              {slot.label ? <Text style={[styles.slotLabel, { color: colors.textTertiary }]}>{slot.label}</Text> : null}
              <View style={[styles.slotStatus, { backgroundColor: slot.isBooked ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: slot.isBooked ? '#DC2626' : '#16A34A' }}>
                  {slot.isBooked ? 'Booked' : 'Available'}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={slotModalVisible} transparent animationType="slide" onRequestClose={() => setSlotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSlotModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Time Slot</Text>

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Date & Time (ISO format)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={startsAt}
              onChangeText={setStartsAt}
              placeholder="2025-06-15T09:00:00"
              placeholderTextColor={colors.textTertiary}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Duration (min)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="30"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Price (AED)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="150"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Label (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={label}
              onChangeText={setLabel}
              placeholder="Morning Appointment"
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, savingSlot && { opacity: 0.5 }]}
              onPress={handleCreateSlot}
              disabled={savingSlot}
              activeOpacity={0.85}
            >
              {savingSlot ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Create Slot</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  earningsCard: {
    borderRadius: 24, padding: 24, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  earningsLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  earningsValue: { fontSize: 36, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  earningsSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 10, marginLeft: 4,
  },
  emptyBox: { borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  emptyText: { fontSize: 14, fontWeight: '500' },
  bookingCard: {
    borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingEmoji: { fontSize: 28 },
  bookingPet: { fontSize: 15, fontWeight: '700' },
  bookingDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingPrice: { fontSize: 13, fontWeight: '600', marginTop: 8, marginLeft: 40 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  addSlotBtn: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  addSlotBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  slotTime: { fontSize: 14, fontWeight: '700', flex: 1 },
  slotLabel: { fontSize: 12 },
  slotStatus: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldInput: {
    borderRadius: 14, paddingHorizontal: 14, height: 48,
    fontSize: 15, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
