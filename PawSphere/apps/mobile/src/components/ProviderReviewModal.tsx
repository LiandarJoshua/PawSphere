import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { reviewsService } from '../services/reviews';

interface Props {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  bookingId?: string;
  onSubmit?: () => void;
}

export default function ProviderReviewModal({ visible, onClose, providerId, bookingId, onSubmit }: Props) {
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleClose() {
    setRating(0);
    setComment('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reviewsService.addProviderReview({
        providerId,
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      handleClose();
      onSubmit?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>Leave a Review</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Rate your experience with this provider.</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Text style={[styles.starText, star <= rating && styles.starActive]}>
                {star <= rating ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.commentInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience (optional)…"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, (submitting || rating === 0) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitBtnText}>Submit Review</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 44,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 16 },
    }),
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  starBtn: { padding: 4 },
  starText: { fontSize: 36, color: '#E5E5EA' },
  starActive: { color: '#F59E0B' },
  commentInput: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, minHeight: 100, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  error: { fontSize: 13, color: '#EF4444', marginBottom: 12, textAlign: 'center' },
  submitBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  cancelBtn: { height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
});
