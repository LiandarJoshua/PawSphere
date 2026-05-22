import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { aiRemindersService, type AIReminder } from '../services/aiReminders';
import { useTheme } from '../theme/ThemeContext';

const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐶', CAT: '🐱', BIRD: '🐦', RABBIT: '🐰',
  REPTILE: '🦎', FISH: '🐠', OTHER: '🐾',
};

export function AIReminderList({ onGeneratePress }: { onGeneratePress?: () => void }) {
  const { colors } = useTheme();
  const [reminders, setReminders] = useState<AIReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await aiRemindersService.list();
      setReminders(data);
    } catch {
      // API offline — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await aiRemindersService.markRead(id).catch(() => null);
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, isRead: true } : r)));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await aiRemindersService.generate();
      await load();
      onGeneratePress?.();
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.emptyIconBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.emptyIconText}>✨</Text>
        </View>
        <View style={styles.emptyBody}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>AI Care Reminders</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Add a pet and tap below to receive personalised health reminders.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.generateBtn, { backgroundColor: colors.primaryLight }, pressed && { opacity: 0.75 }]}
            onPress={handleGenerate}
            disabled={generating}
          >
            <Text style={[styles.generateBtnText, { color: colors.primary }]}>
              {generating ? 'Generating…' : '✨  Generate Reminders'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {reminders.map((r) => (
        <Pressable
          key={r.id}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            r.isRead && styles.cardRead,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => handleMarkRead(r.id)}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.emojiBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.petEmoji}>{SPECIES_EMOJI[r.pet.species] ?? '🐾'}</Text>
            </View>
            {!r.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={[styles.petName, { color: colors.text }]}>{r.pet.name}</Text>
              <Text style={[styles.date, { color: colors.textTertiary }]}>
                {new Date(r.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={[styles.content, { color: colors.textSecondary }]}>{r.content}</Text>
          </View>
        </Pressable>
      ))}

      <Pressable
        style={({ pressed }) => [styles.refreshBtn, { backgroundColor: colors.primaryLight }, pressed && { opacity: 0.75 }]}
        onPress={handleGenerate}
        disabled={generating}
      >
        <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
          {generating ? 'Generating…' : '✨  Refresh Reminders'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { paddingVertical: 32, alignItems: 'center' },
  container: { gap: 10 },

  card: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardRead: { opacity: 0.5 },

  cardLeft: { alignItems: 'center', gap: 6, paddingTop: 2 },
  emojiBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  petEmoji: { fontSize: 22 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },

  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  petName: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  date: { fontSize: 11, fontWeight: '500' },
  content: { fontSize: 13, lineHeight: 20 },

  emptyCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  emptyIconBox: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emptyIconText: { fontSize: 24 },
  emptyBody: { flex: 1 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5, letterSpacing: -0.2 },
  emptyDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  generateBtn: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  generateBtnText: { fontSize: 13, fontWeight: '700' },

  refreshBtn: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  refreshBtnText: { fontSize: 13, fontWeight: '700' },
});
