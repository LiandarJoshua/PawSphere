import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert, Platform, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { sittersService, SPECIALTIES, type SitterProfile } from '../../../services/sitters';
import { api } from '../../../lib/api';

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <Text style={{ fontSize: size, color: '#FF9500' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </Text>
  );
}

function ReviewForm({ sitterId, onSuccess, onCancel }: { sitterId: string; onSuccess: () => void; onCancel: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await sittersService.addReview({ sitterId, rating, comment: comment.trim() || undefined });
      onSuccess();
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to submit review';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={reviewStyles.container}>
      <Text style={reviewStyles.title}>Leave a Review</Text>
      <View style={reviewStyles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={{ fontSize: 30, color: n <= rating ? '#FF9500' : '#E5E5EA' }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={reviewStyles.input}
        placeholder="Share your experience (optional)"
        placeholderTextColor="#AEAEB2"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />
      <View style={reviewStyles.btnRow}>
        <TouchableOpacity style={reviewStyles.cancelBtn} onPress={onCancel}>
          <Text style={reviewStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={reviewStyles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={reviewStyles.submitText}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BookingForm({ sitter, onSuccess, onCancel }: { sitter: SitterProfile; onSuccess: () => void; onCancel: () => void }) {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPets, setLoadingPets] = useState(true);

  useFocusEffect(useCallback(() => {
    api.get<any[]>('/pets').then((data) => {
      setPets(data);
      if (data.length > 0) setSelectedPet(data[0].id);
    }).catch(() => {}).finally(() => setLoadingPets(false));
  }, []));

  async function submit() {
    if (!selectedPet) { return; }
    if (!startDate || !endDate) {
      const msg = 'Please enter start and end dates (YYYY-MM-DD)';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Missing dates', msg);
      return;
    }
    setSubmitting(true);
    try {
      await sittersService.bookSitter({ sitterId: sitter.id, petId: selectedPet, startDate, endDate, notes: notes.trim() || undefined });
      onSuccess();
    } catch (e: any) {
      const msg = e?.message ?? 'Booking failed';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPets) return <ActivityIndicator color="#F4C2C2" style={{ margin: 24 }} />;

  return (
    <View style={bookingStyles.container}>
      <Text style={bookingStyles.title}>Book {sitter.displayName}</Text>

      {pets.length === 0 ? (
        <Text style={bookingStyles.noPets}>Add a pet first before booking a sitter.</Text>
      ) : (
        <>
          <Text style={bookingStyles.label}>Select Pet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {pets.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[bookingStyles.petChip, selectedPet === p.id && bookingStyles.petChipActive]}
                onPress={() => setSelectedPet(p.id)}
              >
                <Text style={bookingStyles.petChipText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={bookingStyles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput style={bookingStyles.input} value={startDate} onChangeText={setStartDate} placeholder="2025-06-01" placeholderTextColor="#AEAEB2" />

          <Text style={bookingStyles.label}>End Date (YYYY-MM-DD)</Text>
          <TextInput style={bookingStyles.input} value={endDate} onChangeText={setEndDate} placeholder="2025-06-05" placeholderTextColor="#AEAEB2" />

          <Text style={bookingStyles.label}>Notes (optional)</Text>
          <TextInput
            style={[bookingStyles.input, { height: 72 }]} value={notes} onChangeText={setNotes}
            placeholder="Any special instructions…" placeholderTextColor="#AEAEB2" multiline
          />

          <Text style={bookingStyles.priceHint}>
            Rate: AED {sitter.hourlyRate}/hr{sitter.dailyRate ? ` · AED ${sitter.dailyRate}/day` : ''}
          </Text>

          <View style={bookingStyles.btnRow}>
            <TouchableOpacity style={bookingStyles.cancelBtn} onPress={onCancel}>
              <Text style={bookingStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={bookingStyles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={bookingStyles.submitText}>Confirm Booking</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export default function SitterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sitter, setSitter] = useState<SitterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await sittersService.getById(id);
      setSitter(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color="#F4C2C2" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (error || !sitter) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Sitter not found'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarEmoji}>🐾</Text>
          </View>
          <Text style={styles.heroName}>{sitter.displayName}</Text>
          {sitter.city && <Text style={styles.heroCity}>📍 {sitter.city}</Text>}
          <View style={[styles.availBadge, !sitter.isAvailable && styles.unavailBadge]}>
            <Text style={[styles.availText, !sitter.isAvailable && styles.unavailText]}>
              {sitter.isAvailable ? '● Available' : '● Unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sitter.reviewCount > 0 ? sitter.rating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sitter.reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sitter.experience}</Text>
              <Text style={styles.statLabel}>Yrs Exp.</Text>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceCard}>
                <Text style={styles.priceAmount}>AED {sitter.hourlyRate}</Text>
                <Text style={styles.priceUnit}>per hour</Text>
              </View>
              {sitter.dailyRate && (
                <View style={[styles.priceCard, styles.priceCardAccent]}>
                  <Text style={[styles.priceAmount, { color: '#FFFFFF' }]}>AED {sitter.dailyRate}</Text>
                  <Text style={[styles.priceUnit, { color: 'rgba(255,255,255,0.8)' }]}>per day</Text>
                </View>
              )}
            </View>
          </View>

          {/* Specialties */}
          {sitter.specialties.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specialties</Text>
              <View style={styles.chipsWrap}>
                {sitter.specialties.map((s) => {
                  const sp = SPECIALTIES.find((x) => x.key === s);
                  return sp ? (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{sp.emoji} {sp.label}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            </View>
          )}

          {/* Bio */}
          {sitter.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{sitter.bio}</Text>
            </View>
          )}

          {/* Contact */}
          {sitter.phone && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${sitter.phone}`)}>
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactLink}>{sitter.phone}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => setShowReview(true)}
            >
              <Text style={styles.actionBtnOutlineText}>✏️ Write Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnFill, !sitter.isAvailable && styles.actionBtnDisabled]}
              onPress={() => sitter.isAvailable && setShowBooking(true)}
              disabled={!sitter.isAvailable}
            >
              <Text style={styles.actionBtnFillText}>Book Now</Text>
            </TouchableOpacity>
          </View>

          {/* Reviews */}
          {sitter.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {sitter.reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{r.reviewer.email.split('@')[0]}</Text>
                    <StarRow rating={r.rating} size={13} />
                  </View>
                  {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
                  <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Booking modal */}
      <Modal visible={showBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <BookingForm
              sitter={sitter}
              onSuccess={() => { setShowBooking(false); load(); }}
              onCancel={() => setShowBooking(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={showReview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ReviewForm
              sitterId={sitter.id}
              onSuccess={() => { setShowReview(false); load(); }}
              onCancel={() => setShowReview(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#636366', textAlign: 'center' },
  backBtn: { marginTop: 16, backgroundColor: '#FAE0E0', borderRadius: 50, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#E8A0A0' },

  hero: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  heroAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FAE0E0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroAvatarEmoji: { fontSize: 38 },
  heroName: { fontSize: 24, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  heroCity: { fontSize: 14, color: '#636366', marginBottom: 8 },
  availBadge: { backgroundColor: '#EDFFF3', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 5 },
  unavailBadge: { backgroundColor: '#F2F2F2' },
  availText: { fontSize: 13, fontWeight: '600', color: '#34C759' },
  unavailText: { color: '#AEAEB2' },

  body: { padding: 20 },

  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20, alignItems: 'center', justifyContent: 'space-evenly' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  statLabel: { fontSize: 12, color: '#AEAEB2', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E5EA' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 10 },

  priceRow: { flexDirection: 'row', gap: 12 },
  priceCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E5EA' },
  priceCardAccent: { backgroundColor: '#E8A0A0', borderColor: '#E8A0A0' },
  priceAmount: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  priceUnit: { fontSize: 12, color: '#AEAEB2', marginTop: 2 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#F8F8F8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, color: '#636366', fontWeight: '500' },

  bio: { fontSize: 14, color: '#3C3C43', lineHeight: 22 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactIcon: { fontSize: 18 },
  contactLink: { fontSize: 15, color: '#007AFF', textDecorationLine: 'underline' },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#E5E5EA' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  actionBtnFill: { backgroundColor: '#E8A0A0' },
  actionBtnDisabled: { backgroundColor: '#F2F2F2' },
  actionBtnFillText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  reviewText: { fontSize: 13, color: '#636366', lineHeight: 19, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#AEAEB2' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, maxHeight: '85%' },
});

const reviewStyles = StyleSheet.create({
  container: {},
  title: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  input: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 14, fontSize: 14, color: '#1C1C1E', height: 90, textAlignVertical: 'top', marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#636366' },
  submitBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#E8A0A0', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

const bookingStyles = StyleSheet.create({
  container: {},
  title: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  noPets: { fontSize: 14, color: '#636366', textAlign: 'center', marginVertical: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#636366', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 14, fontSize: 14, color: '#1C1C1E', marginBottom: 10 },
  petChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: '#F2F2F2', marginRight: 8 },
  petChipActive: { backgroundColor: '#FAE0E0' },
  petChipText: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  priceHint: { fontSize: 13, color: '#AEAEB2', marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#636366' },
  submitBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#E8A0A0', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
