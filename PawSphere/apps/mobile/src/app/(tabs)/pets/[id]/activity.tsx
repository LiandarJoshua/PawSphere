import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../../theme/ThemeContext';
import { activityService, type ActivityLog } from '../../../../services/activity';
import { petsService } from '../../../../services/pets';

const ACTIVITY_TYPES = [
  { key: 'WALK', label: 'Walk', emoji: '🦮' },
  { key: 'FEED', label: 'Feed', emoji: '🍖' },
  { key: 'PLAY', label: 'Play', emoji: '🎾' },
  { key: 'GROOMING', label: 'Grooming', emoji: '✂️' },
  { key: 'OTHER', label: 'Other', emoji: '📝' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AE', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDay(logs: ActivityLog[]): { day: string; items: ActivityLog[] }[] {
  const map: Record<string, ActivityLog[]> = {};
  for (const log of logs) {
    const day = formatDay(log.loggedAt);
    if (!map[day]) map[day] = [];
    map[day].push(log);
  }
  return Object.entries(map).map(([day, items]) => ({ day, items }));
}

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [petName, setPetName] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedType, setSelectedType] = useState('WALK');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pet, data] = await Promise.all([
        petsService.get(id),
        activityService.getActivityLogs(id),
      ]);
      setPetName(pet.name);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function resetForm() {
    setSelectedType('WALK');
    setNotes('');
    setDuration('');
    setAmount('');
  }

  async function handleLog() {
    if (!id) return;
    setSaving(true);
    try {
      const newLog = await activityService.logActivity(id, {
        type: selectedType,
        notes: notes.trim() || undefined,
        durationMin: duration ? parseInt(duration, 10) : undefined,
        amount: amount.trim() || undefined,
      });
      setLogs((prev) => [newLog, ...prev]);
      resetForm();
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to log activity. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const grouped = groupByDay(logs);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Activity Log</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {petName ? `${petName} · ` : ''}Track walks, meals & playtime
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🐾</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No activities yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Start tracking walks, meals, play sessions and more.
          </Text>
          <TouchableOpacity
            style={[styles.logFirstBtn, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.logFirstBtnText}>Log First Activity</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {grouped.map(({ day, items }) => (
            <View key={day}>
              <Text style={[styles.dayHeader, { color: colors.textTertiary }]}>{day.toUpperCase()}</Text>
              {items.map((log) => {
                const typeConfig = ACTIVITY_TYPES.find((t) => t.key === log.type) ?? ACTIVITY_TYPES[4];
                return (
                  <View key={log.id} style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.logIconWrap, { backgroundColor: colors.primaryLight }]}>
                      <Text style={styles.logIcon}>{typeConfig.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logType, { color: colors.text }]}>{typeConfig.label}</Text>
                      {log.notes ? <Text style={[styles.logNotes, { color: colors.textSecondary }]} numberOfLines={2}>{log.notes}</Text> : null}
                      <View style={styles.logMeta}>
                        {log.durationMin ? <Text style={[styles.logMetaText, { color: colors.textTertiary }]}>{log.durationMin} min</Text> : null}
                        {log.amount ? <Text style={[styles.logMetaText, { color: colors.textTertiary }]}>{log.amount}</Text> : null}
                      </View>
                    </View>
                    <Text style={[styles.logTime, { color: colors.textTertiary }]}>{formatTime(log.loggedAt)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Activity</Text>

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Activity Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {ACTIVITY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeChip,
                    { backgroundColor: colors.surface2, borderColor: 'transparent' },
                    selectedType === t.key && { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                  ]}
                  onPress={() => setSelectedType(t.key)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                  <Text style={[styles.typeChipLabel, { color: selectedType === t.key ? colors.primary : colors.textSecondary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. 30 min walk in the park"
              placeholderTextColor={colors.textTertiary}
              multiline
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
              {selectedType === 'FEED' && (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Amount</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="1 cup"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.5 }]}
              onPress={handleLog}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Log Activity</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  backBtnText: { fontSize: 20, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  list: { padding: 16, paddingBottom: 40, gap: 4 },
  dayHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 12, marginBottom: 6, marginLeft: 4,
  },
  logCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  logIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logIcon: { fontSize: 22 },
  logType: { fontSize: 14, fontWeight: '700' },
  logNotes: { fontSize: 12, marginTop: 2 },
  logMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  logMetaText: { fontSize: 11, fontWeight: '600' },
  logTime: { fontSize: 12, fontWeight: '500' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  logFirstBtn: { borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  logFirstBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
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
  modalTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 },
  fieldInput: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowInputs: { flexDirection: 'row', gap: 12 },
  typeChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1.5, gap: 4,
  },
  typeChipLabel: { fontSize: 11, fontWeight: '600' },
  saveBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
