import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform, TextInput,
  Pressable, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { petsService, type Pet } from '../services/pets';
import { providersService, bookingsService, type Provider, type TimeSlot } from '../services/providers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐶', CAT: '🐱', BIRD: '🐦', RABBIT: '🐰',
  REPTILE: '🦎', FISH: '🐠', OTHER: '🐾',
};

function getNextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dayLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  provider: Provider | null;
  onClose: () => void;
  onBooked: () => void;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step, colors }: { step: number; colors: any }) {
  const labels = ['Date', 'Time', 'Confirm'];
  return (
    <View style={sb.row}>
      {labels.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <View key={label} style={sb.item}>
            <View style={[sb.circle,
              done && { backgroundColor: colors.primary },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
              !done && !active && { backgroundColor: colors.surface2, borderColor: colors.border },
            ]}>
              <Text style={[sb.circleText, { color: done || active ? '#FFF' : colors.textTertiary }]}>
                {done ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[sb.label, { color: active ? colors.primary : colors.textTertiary }]}>{label}</Text>
            {i < labels.length - 1 && (
              <View style={[sb.line, { backgroundColor: done ? colors.primary : colors.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 0 },
  item: { alignItems: 'center', flex: 1, position: 'relative' },
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  circleText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  line: { position: 'absolute', top: 13, left: '60%', right: '-60%', height: 2 },
});

// ─── Main modal ───────────────────────────────────────────────────────────────

export function BookingModal({ visible, provider, onClose, onBooked }: Props) {
  const { colors } = useTheme();

  const [step, setStep] = useState(0);
  const [days] = useState(getNextDays(7));
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStep(0);
      setSelectedDay(days[0]);
      setSlots([]);
      setSelectedSlot(null);
      setPets([]);
      setSelectedPet(null);
      setNotes('');
      setError(null);
      setSuccess(false);
    }
  }, [visible]);

  // Fetch slots when day changes on step 0/1
  const loadSlots = useCallback(async (day: Date) => {
    if (!provider) return;
    setSlotsLoading(true);
    setError(null);
    try {
      const data = await providersService.getSlots(provider.id, formatDate(day));
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [provider]);

  // Fetch pets on step 2
  const loadPets = useCallback(async () => {
    setPetsLoading(true);
    try {
      const data = await petsService.list();
      setPets(data);
      if (data.length === 1) setSelectedPet(data[0]);
    } catch {
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, []);

  async function handleGenerateDemo() {
    if (!provider) return;
    setGeneratingDemo(true);
    try {
      await providersService.generateDemoSlots(provider.id);
      await loadSlots(selectedDay);
    } catch { /* silent */ } finally {
      setGeneratingDemo(false);
    }
  }

  function goToStep1() {
    setStep(1);
    loadSlots(selectedDay);
  }

  function goToStep2() {
    if (!selectedSlot) return;
    setStep(2);
    loadPets();
  }

  async function handleConfirm() {
    if (!provider || !selectedSlot || !selectedPet) return;
    setSubmitting(true);
    setError(null);
    try {
      await bookingsService.create({
        providerId: provider.id,
        petId: selectedPet.id,
        timeSlotId: selectedSlot.id,
        scheduledAt: selectedSlot.startsAt,
        totalPrice: selectedSlot.price ?? 0,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!provider) return null;

  const SERVICE_EMOJI: Record<string, string> = {
    VET: '🏥', GROOMER: '✂️', PET_STORE: '🛍️', PET_HOTEL: '🏨', TRAINER: '🎓',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerEmoji, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.headerEmojiText}>{SERVICE_EMOJI[provider.serviceType] ?? '🏥'}</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{provider.businessName}</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Book an appointment</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surface2 }]} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {success ? (
          // ── Success state ──────────────────────────────────────────────────
          <View style={styles.successWrap}>
            <View style={[styles.successIconBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Appointment Requested!</Text>
            <Text style={[styles.successSub, { color: colors.textSecondary }]}>
              Your booking request has been sent to {provider.businessName}.{'\n'}
              You'll be notified when they confirm.
            </Text>
            <View style={styles.successDetail}>
              <Text style={[styles.successDetailText, { color: colors.text }]}>
                📅  {new Date(selectedSlot!.startsAt).toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={[styles.successDetailText, { color: colors.text }]}>
                🕐  {formatTime(selectedSlot!.startsAt)} · {selectedSlot!.durationMin} min
              </Text>
              <Text style={[styles.successDetailText, { color: colors.text }]}>
                🐾  {selectedPet?.name}
              </Text>
              {(selectedSlot?.price ?? 0) > 0 && (
                <Text style={[styles.successDetailText, { color: colors.text }]}>
                  💰  AED {selectedSlot!.price}
                </Text>
              )}
            </View>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => { onBooked(); onClose(); }} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StepBar step={step} colors={colors} />

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

              {/* ── Step 0: Pick a date ──────────────────────────────────────── */}
              {step === 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Select a date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
                    {days.map((day, i) => {
                      const isSelected = formatDate(day) === formatDate(selectedDay);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.dayChip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
                          onPress={() => setSelectedDay(day)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dayName, { color: isSelected ? '#FFF' : isWeekend ? colors.primary : colors.textTertiary }]}>{dayLabel(day)}</Text>
                          <Text style={[styles.dayNum, { color: isSelected ? '#FFF' : colors.text }]}>{day.getDate()}</Text>
                          <Text style={[styles.dayMonth, { color: isSelected ? 'rgba(255,255,255,0.75)' : colors.textTertiary }]}>
                            {day.toLocaleString('default', { month: 'short' })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={goToStep1}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>View Available Times →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Step 1: Pick a time slot ─────────────────────────────────── */}
              {step === 1 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {selectedDay.toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>

                  {slotsLoading ? (
                    <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
                  ) : slots.length === 0 ? (
                    <View style={[styles.emptySlots, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.emptySlotsEmoji}>📅</Text>
                      <Text style={[styles.emptySlotsTitle, { color: colors.text }]}>No slots available</Text>
                      <Text style={[styles.emptySlotsSub, { color: colors.textSecondary }]}>
                        No appointment times found for this date.
                      </Text>
                      <TouchableOpacity
                        style={[styles.demoBtn, { backgroundColor: colors.primaryLight }]}
                        onPress={handleGenerateDemo}
                        disabled={generatingDemo}
                        activeOpacity={0.75}
                      >
                        {generatingDemo
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Text style={[styles.demoBtnText, { color: colors.primary }]}>✨ Generate Demo Slots</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.slotsGrid}>
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[styles.slotChip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
                            onPress={() => setSelectedSlot(slot)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.slotTime, { color: isSelected ? '#FFF' : colors.text }]}>{formatTime(slot.startsAt)}</Text>
                            <Text style={[styles.slotDur, { color: isSelected ? 'rgba(255,255,255,0.75)' : colors.textTertiary }]}>{slot.durationMin} min</Text>
                            {(slot.price ?? 0) > 0 && (
                              <Text style={[styles.slotPrice, { color: isSelected ? 'rgba(255,255,255,0.9)' : colors.primary }]}>
                                AED {slot.price}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.rowBtns}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => setStep(0)} activeOpacity={0.75}>
                      <Text style={[styles.backBtnText, { color: colors.text }]}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, styles.nextBtnFlex, { backgroundColor: colors.primary }, !selectedSlot && { opacity: 0.4 }]}
                      onPress={goToStep2}
                      disabled={!selectedSlot}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.nextBtnText}>Select Pet →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Step 2: Select pet + confirm ─────────────────────────────── */}
              {step === 2 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Select your pet</Text>

                  {petsLoading ? (
                    <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
                  ) : pets.length === 0 ? (
                    <View style={[styles.emptySlots, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={styles.emptySlotsEmoji}>🐾</Text>
                      <Text style={[styles.emptySlotsTitle, { color: colors.text }]}>No pets added yet</Text>
                      <Text style={[styles.emptySlotsSub, { color: colors.textSecondary }]}>Add a pet from the Home tab first.</Text>
                    </View>
                  ) : (
                    <View style={styles.petList}>
                      {pets.map((pet) => {
                        const isSelected = selectedPet?.id === pet.id;
                        return (
                          <TouchableOpacity
                            key={pet.id}
                            style={[styles.petRow, { backgroundColor: isSelected ? colors.primaryLight : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
                            onPress={() => setSelectedPet(pet)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.petEmoji, { backgroundColor: isSelected ? colors.primary : colors.surface2 }]}>
                              <Text style={styles.petEmojiText}>{SPECIES_EMOJI[pet.species] ?? '🐾'}</Text>
                            </View>
                            <View style={styles.petInfo}>
                              <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
                              <Text style={[styles.petBreed, { color: colors.textSecondary }]}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
                            </View>
                            {isSelected && <Text style={[styles.petCheck, { color: colors.primary }]}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Summary card */}
                  {selectedSlot && (
                    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.summaryTitle, { color: colors.text }]}>Appointment Summary</Text>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Business</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{provider.businessName}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Date</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {new Date(selectedSlot.startsAt).toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Time</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{formatTime(selectedSlot.startsAt)} · {selectedSlot.durationMin} min</Text>
                      </View>
                      {(selectedSlot.price ?? 0) > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Fee</Text>
                          <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>AED {selectedSlot.price}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Notes */}
                  <TextInput
                    style={[styles.notes, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="Notes for the provider (optional)…"
                    placeholderTextColor={colors.textTertiary}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!!error && (
                    <View style={[styles.errorBanner, { backgroundColor: colors.redLight ?? '#FFF0F0' }]}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.rowBtns}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => setStep(1)} activeOpacity={0.75}>
                      <Text style={[styles.backBtnText, { color: colors.text }]}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, styles.nextBtnFlex, { backgroundColor: colors.primary }, (!selectedPet || submitting) && { opacity: 0.4 }]}
                      onPress={handleConfirm}
                      disabled={!selectedPet || submitting}
                      activeOpacity={0.85}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={styles.nextBtnText}>Confirm Booking</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  headerEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerEmojiText: { fontSize: 22 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  headerSub: { fontSize: 12, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 16, marginTop: 4 },

  dayRow: { gap: 10, paddingBottom: 4, paddingRight: 8 },
  dayChip: {
    width: 62, paddingVertical: 12, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5,
  },
  dayName: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  dayNum: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  dayMonth: { fontSize: 10, fontWeight: '500', marginTop: 1 },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  slotChip: {
    width: '30%', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  slotTime: { fontSize: 14, fontWeight: '700' },
  slotDur: { fontSize: 11, marginTop: 2 },
  slotPrice: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  petList: { gap: 10, marginBottom: 16 },
  petRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1.5,
  },
  petEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  petEmojiText: { fontSize: 22 },
  petInfo: { flex: 1 },
  petName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  petBreed: { fontSize: 12, marginTop: 2 },
  petCheck: { fontSize: 18, fontWeight: '700' },

  summaryCard: {
    borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },

  notes: {
    borderRadius: 14, padding: 14, fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth, minHeight: 80,
    marginBottom: 16,
  },

  errorBanner: { borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#FF3B30', textAlign: 'center' },

  centered: { paddingVertical: 40, alignItems: 'center' },

  emptySlots: {
    borderRadius: 20, padding: 28, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 16,
  },
  emptySlotsEmoji: { fontSize: 40, marginBottom: 12 },
  emptySlotsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySlotsSub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },

  demoBtn: { borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 },
  demoBtnText: { fontSize: 14, fontWeight: '700' },

  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backBtn: { height: 52, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  nextBtnFlex: { flex: 1 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconBox: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successIcon: { fontSize: 44 },
  successTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10, textAlign: 'center' },
  successSub: { fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 28 },
  successDetail: { width: '100%', gap: 10, marginBottom: 32 },
  successDetailText: { fontSize: 15, fontWeight: '600' },
  doneBtn: { width: '100%', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
