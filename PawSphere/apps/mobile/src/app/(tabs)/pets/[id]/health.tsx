import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../../theme/ThemeContext';
import { type AppColors } from '../../../../theme/colors';
import { petsService, type Pet, type Vaccination } from '../../../../services/pets';
import { healthService, type WeightLog, type Medication, type VetVisit } from '../../../../services/health';

type Segment = 'weight' | 'medications' | 'visits' | 'vaccinations';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Simple Weight Chart ──────────────────────────────────────────────────────
function WeightChart({ logs }: { logs: WeightLog[] }) {
  const { colors } = useTheme();
  if (logs.length === 0) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
  );
  const weights = sorted.map((l) => l.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const CHART_HEIGHT = 80;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12 }}
      contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 4 }}
    >
      {sorted.map((log, i) => {
        const pct = (log.weight - minW) / range;
        const dotBottom = pct * (CHART_HEIGHT - 16);
        return (
          <View key={log.id} style={{ alignItems: 'center', marginHorizontal: 8, width: 52 }}>
            <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' }}>
              <View
                style={[
                  styles.chartDot,
                  {
                    bottom: dotBottom,
                    backgroundColor: i === sorted.length - 1 ? '#E8A0A0' : colors.border,
                    borderColor: i === sorted.length - 1 ? '#E8A0A0' : colors.borderStrong,
                  },
                ]}
              />
              {i < sorted.length - 1 && (
                <View
                  style={[
                    styles.chartLine,
                    { bottom: dotBottom + 6, backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>
            <Text style={[styles.chartWeight, { color: colors.text }]}>{log.weight}kg</Text>
            <Text style={[styles.chartDate, { color: colors.textTertiary }]}>
              {new Date(log.loggedAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PetHealthScreen() {
  const { colors } = useTheme();
  const { id: petId } = useLocalSearchParams<{ id: string }>();

  const [pet, setPet] = useState<Pet | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState<Segment>('weight');

  // Add modal state
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Weight form
  const [weightInput, setWeightInput] = useState('');
  const [weightNotes, setWeightNotes] = useState('');

  // Medication form
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medStartDate, setMedStartDate] = useState(todayISO());
  const [medEndDate, setMedEndDate] = useState('');
  const [medNotes, setMedNotes] = useState('');

  // Vet visit form
  const [visitDate, setVisitDate] = useState(todayISO());
  const [visitReason, setVisitReason] = useState('');
  const [visitVetName, setVisitVetName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitNextVisit, setVisitNextVisit] = useState('');
  const [visitCost, setVisitCost] = useState('');

  // Vaccination form
  const [vaxName, setVaxName] = useState('');
  const [vaxAdministeredAt, setVaxAdministeredAt] = useState(todayISO());
  const [vaxNextDue, setVaxNextDue] = useState('');
  const [vaxNotes, setVaxNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    if (!petId) return;
    try {
      const [petData, wLogs, meds, visits, vaxData] = await Promise.all([
        petsService.get(petId),
        healthService.getWeightLogs(petId),
        healthService.getMedications(petId),
        healthService.getVetVisits(petId),
        petsService.listVaccinations(petId),
      ]);
      setPet(petData);
      setWeightLogs(wLogs);
      setMedications(meds);
      setVetVisits(visits);
      setVaccinations(vaxData);
    } catch {
      // data unavailable — keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [petId]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  function resetForms() {
    setWeightInput('');
    setWeightNotes('');
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedStartDate(todayISO());
    setMedEndDate('');
    setMedNotes('');
    setVisitDate(todayISO());
    setVisitReason('');
    setVisitVetName('');
    setVisitNotes('');
    setVisitNextVisit('');
    setVisitCost('');
    setVaxName('');
    setVaxAdministeredAt(todayISO());
    setVaxNextDue('');
    setVaxNotes('');
  }

  async function handleSubmit() {
    if (!petId) return;
    setSubmitting(true);
    try {
      if (segment === 'weight') {
        const w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) {
          Alert.alert('Invalid weight', 'Please enter a valid weight in kg.');
          return;
        }
        const log = await healthService.addWeightLog(petId, w, weightNotes || undefined);
        setWeightLogs((prev) => [log, ...prev]);
      } else if (segment === 'medications') {
        if (!medName.trim()) {
          Alert.alert('Required', 'Medication name is required.');
          return;
        }
        const med = await healthService.addMedication(petId, {
          name: medName.trim(),
          dosage: medDosage.trim() || undefined,
          frequency: medFrequency.trim() || undefined,
          startDate: medStartDate,
          endDate: medEndDate || undefined,
          notes: medNotes.trim() || undefined,
        });
        setMedications((prev) => [med, ...prev]);
      } else if (segment === 'visits') {
        if (!visitReason.trim()) {
          Alert.alert('Required', 'Visit reason is required.');
          return;
        }
        const visit = await healthService.addVetVisit(petId, {
          visitDate,
          reason: visitReason.trim(),
          vetName: visitVetName.trim() || undefined,
          notes: visitNotes.trim() || undefined,
          nextVisit: visitNextVisit || undefined,
          cost: visitCost ? parseFloat(visitCost) : undefined,
        });
        setVetVisits((prev) => [visit, ...prev]);
      } else {
        if (!vaxName.trim()) {
          Alert.alert('Required', 'Vaccine name is required.');
          return;
        }
        const vax = await petsService.addVaccination(petId, {
          vaccineName: vaxName.trim(),
          administeredAt: vaxAdministeredAt,
          nextDueDate: vaxNextDue || undefined,
          notes: vaxNotes.trim() || undefined,
        });
        setVaccinations((prev) => [vax, ...prev]);
      }
      resetForms();
      setAddModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStopMedication(med: Medication) {
    if (!petId) return;
    const doStop = async () => {
      try {
        const updated = await healthService.stopMedication(petId, med.id);
        setMedications((prev) => prev.map((m) => (m.id === med.id ? updated : m)));
      } catch {
        Alert.alert('Error', 'Could not stop medication. Try again.');
      }
    };
    Alert.alert('Stop Medication', `Mark "${med.name}" as stopped?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: doStop },
    ]);
  }

  // ─── Upcoming vet visit banner ────────────────────────────────────────────
  const upcomingVisit = vetVisits.find(
    (v) => v.nextVisit && new Date(v.nextVisit).getTime() > Date.now(),
  );

  const s = dynamicStyles(colors);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#E8A0A0" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.75}>
          <Text style={[s.backIcon, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          {pet ? `${pet.name}'s Health` : 'Health Records'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Segment Control */}
      <View style={[s.segmentWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={[s.segmentContainer, { backgroundColor: colors.surface2 }]}>
          {(['weight', 'medications', 'visits', 'vaccinations'] as Segment[]).map((seg) => (
            <TouchableOpacity
              key={seg}
              style={[s.segmentPill, segment === seg && s.segmentPillActive]}
              onPress={() => setSegment(seg)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  s.segmentLabel,
                  { color: segment === seg ? '#1C1C1E' : colors.textSecondary },
                ]}
              >
                {seg === 'weight' ? 'Weight' : seg === 'medications' ? 'Meds' : seg === 'visits' ? 'Vet Visits' : 'Vaccines'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8A0A0" />
        }
      >
        {/* ─── Weight Segment ─────────────────────────────────────────────── */}
        {segment === 'weight' && (
          <View style={s.content}>
            {weightLogs.length > 0 && (
              <View style={[s.card, { backgroundColor: colors.surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Current Weight</Text>
                <Text style={s.currentWeight}>
                  {[...weightLogs].sort(
                    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
                  )[0].weight}
                  {' '}kg
                </Text>
                <WeightChart logs={weightLogs} />
              </View>
            )}

            {weightLogs.length === 0 ? (
              <EmptyState
                emoji="⚖️"
                title="No weight logs yet"
                subtitle="Start tracking your pet's weight"
                onAdd={() => setAddModalVisible(true)}
                colors={colors}
              />
            ) : (
              [...weightLogs]
                .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
                .map((log) => (
                  <View key={log.id} style={[s.card, { backgroundColor: colors.surface }]}>
                    <View style={s.rowBetween}>
                      <Text style={[s.cardWeight, { color: colors.text }]}>{log.weight} kg</Text>
                      <Text style={[s.cardDate, { color: colors.textTertiary }]}>
                        {formatDate(log.loggedAt)}
                      </Text>
                    </View>
                    {log.notes ? (
                      <Text style={[s.cardNotes, { color: colors.textSecondary }]}>{log.notes}</Text>
                    ) : null}
                  </View>
                ))
            )}
          </View>
        )}

        {/* ─── Medications Segment ────────────────────────────────────────── */}
        {segment === 'medications' && (
          <View style={s.content}>
            {medications.length === 0 ? (
              <EmptyState
                emoji="💊"
                title="No medications recorded"
                subtitle="Track active and past medications"
                onAdd={() => setAddModalVisible(true)}
                colors={colors}
              />
            ) : (
              <>
                {/* Active */}
                {medications.filter((m) => m.isActive).length > 0 && (
                  <View>
                    <Text style={[s.subHeader, { color: colors.textSecondary }]}>Active</Text>
                    {medications
                      .filter((m) => m.isActive)
                      .map((med) => (
                        <MedicationCard
                          key={med.id}
                          med={med}
                          onStop={() => handleStopMedication(med)}
                          colors={colors}
                        />
                      ))}
                  </View>
                )}
                {/* Past */}
                {medications.filter((m) => !m.isActive).length > 0 && (
                  <View>
                    <Text style={[s.subHeader, { color: colors.textSecondary }]}>Past</Text>
                    {medications
                      .filter((m) => !m.isActive)
                      .map((med) => (
                        <MedicationCard key={med.id} med={med} colors={colors} />
                      ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── Vet Visits Segment ─────────────────────────────────────────── */}
        {segment === 'visits' && (
          <View style={s.content}>
            {upcomingVisit && (
              <View style={s.upcomingBanner}>
                <Text style={s.upcomingIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.upcomingTitle}>Upcoming Visit</Text>
                  <Text style={s.upcomingText}>
                    {upcomingVisit.reason} on {formatDate(upcomingVisit.nextVisit!)}
                  </Text>
                </View>
              </View>
            )}

            {vetVisits.length === 0 ? (
              <EmptyState
                emoji="🏥"
                title="No vet visits yet"
                subtitle="Log your pet's veterinary visits"
                onAdd={() => setAddModalVisible(true)}
                colors={colors}
              />
            ) : (
              [...vetVisits]
                .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                .map((visit) => (
                  <VetVisitCard key={visit.id} visit={visit} colors={colors} />
                ))
            )}
          </View>
        )}

        {/* ─── Vaccinations Segment ───────────────────────────────────────── */}
        {segment === 'vaccinations' && (
          <View style={s.content}>
            {vaccinations.length === 0 ? (
              <EmptyState
                emoji="💉"
                title="No vaccinations recorded"
                subtitle="Track your pet's vaccination history"
                onAdd={() => setAddModalVisible(true)}
                colors={colors}
              />
            ) : (
              [...vaccinations]
                .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())
                .map((vax) => (
                  <View key={vax.id} style={[s.card, { backgroundColor: colors.surface }]}>
                    <View style={s.rowBetween}>
                      <Text style={[s.cardWeight, { color: colors.text }]}>{vax.vaccineName}</Text>
                      <Text style={[s.cardDate, { color: colors.textTertiary }]}>
                        {formatDate(vax.administeredAt)}
                      </Text>
                    </View>
                    {vax.nextDueDate ? (
                      <View style={vaxStyles.dueBadge}>
                        <Text style={vaxStyles.dueText}>Next due: {formatDate(vax.nextDueDate)}</Text>
                      </View>
                    ) : null}
                    {vax.notes ? (
                      <Text style={[s.cardNotes, { color: colors.textSecondary }]}>{vax.notes}</Text>
                    ) : null}
                  </View>
                ))
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <View style={s.fabContainer}>
        <TouchableOpacity
          style={s.fab}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Add Modal ──────────────────────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            {/* Handle */}
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[s.modalTitle, { color: colors.text }]}>
              {segment === 'weight'
                ? 'Add Weight Log'
                : segment === 'medications'
                ? 'Add Medication'
                : segment === 'visits'
                ? 'Add Vet Visit'
                : 'Add Vaccination'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {segment === 'weight' && (
                <>
                  <FormField
                    label="Weight (kg)"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder="e.g. 4.5"
                    keyboardType="decimal-pad"
                    colors={colors}
                  />
                  <FormField
                    label="Notes (optional)"
                    value={weightNotes}
                    onChangeText={setWeightNotes}
                    placeholder="Any notes..."
                    colors={colors}
                  />
                </>
              )}

              {segment === 'medications' && (
                <>
                  <FormField
                    label="Medication Name"
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="e.g. Frontline"
                    colors={colors}
                  />
                  <FormField
                    label="Dosage (optional)"
                    value={medDosage}
                    onChangeText={setMedDosage}
                    placeholder="e.g. 0.5ml"
                    colors={colors}
                  />
                  <FormField
                    label="Frequency (optional)"
                    value={medFrequency}
                    onChangeText={setMedFrequency}
                    placeholder="e.g. Once daily"
                    colors={colors}
                  />
                  <FormField
                    label="Start Date"
                    value={medStartDate}
                    onChangeText={setMedStartDate}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="End Date (optional)"
                    value={medEndDate}
                    onChangeText={setMedEndDate}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="Notes (optional)"
                    value={medNotes}
                    onChangeText={setMedNotes}
                    placeholder="Any notes..."
                    colors={colors}
                  />
                </>
              )}

              {segment === 'visits' && (
                <>
                  <FormField
                    label="Visit Date"
                    value={visitDate}
                    onChangeText={setVisitDate}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="Reason"
                    value={visitReason}
                    onChangeText={setVisitReason}
                    placeholder="e.g. Annual checkup"
                    colors={colors}
                  />
                  <FormField
                    label="Vet Name (optional)"
                    value={visitVetName}
                    onChangeText={setVisitVetName}
                    placeholder="e.g. Dr. Al Mansoori"
                    colors={colors}
                  />
                  <FormField
                    label="Notes (optional)"
                    value={visitNotes}
                    onChangeText={setVisitNotes}
                    placeholder="Diagnosis, treatment notes..."
                    colors={colors}
                  />
                  <FormField
                    label="Next Visit Date (optional)"
                    value={visitNextVisit}
                    onChangeText={setVisitNextVisit}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="Cost (AED, optional)"
                    value={visitCost}
                    onChangeText={setVisitCost}
                    placeholder="e.g. 250"
                    keyboardType="decimal-pad"
                    colors={colors}
                  />
                </>
              )}

              {segment === 'vaccinations' && (
                <>
                  <FormField
                    label="Vaccine Name"
                    value={vaxName}
                    onChangeText={setVaxName}
                    placeholder="e.g. Rabies, DHPP"
                    colors={colors}
                  />
                  <FormField
                    label="Date Administered"
                    value={vaxAdministeredAt}
                    onChangeText={setVaxAdministeredAt}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="Next Due Date (optional)"
                    value={vaxNextDue}
                    onChangeText={setVaxNextDue}
                    placeholder="YYYY-MM-DD"
                    colors={colors}
                  />
                  <FormField
                    label="Notes (optional)"
                    value={vaxNotes}
                    onChangeText={setVaxNotes}
                    placeholder="Clinic, batch number..."
                    colors={colors}
                  />
                </>
              )}

              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>Save</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setAddModalVisible(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({
  emoji,
  title,
  subtitle,
  onAdd,
  colors,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onAdd: () => void;
  colors: AppColors;
}) {
  return (
    <View style={[emptyStyles.container, { backgroundColor: colors.surface }]}>
      <Text style={emptyStyles.emoji}>{emoji}</Text>
      <Text style={[emptyStyles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[emptyStyles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
      <TouchableOpacity style={emptyStyles.btn} onPress={onAdd} activeOpacity={0.8}>
        <Text style={emptyStyles.btnText}>Add First Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

function MedicationCard({
  med,
  onStop,
  colors,
}: {
  med: Medication;
  onStop?: () => void;
  colors: AppColors;
}) {
  return (
    <View style={[medStyles.card, { backgroundColor: colors.surface }]}>
      <View style={medStyles.header}>
        <Text style={[medStyles.name, { color: colors.text }]}>{med.name}</Text>
        <View style={[medStyles.badge, { backgroundColor: med.isActive ? '#E8F8ED' : colors.surface2 }]}>
          <Text style={[medStyles.badgeText, { color: med.isActive ? '#34C759' : colors.textTertiary }]}>
            {med.isActive ? 'Active' : 'Stopped'}
          </Text>
        </View>
      </View>
      {med.dosage ? (
        <Text style={[medStyles.detail, { color: colors.textSecondary }]}>Dosage: {med.dosage}</Text>
      ) : null}
      {med.frequency ? (
        <Text style={[medStyles.detail, { color: colors.textSecondary }]}>Frequency: {med.frequency}</Text>
      ) : null}
      <Text style={[medStyles.detail, { color: colors.textSecondary }]}>
        Started: {formatDate(med.startDate)}
        {med.endDate ? `  →  ${formatDate(med.endDate)}` : ''}
      </Text>
      {med.notes ? (
        <Text style={[medStyles.notes, { color: colors.textTertiary }]}>{med.notes}</Text>
      ) : null}
      {med.isActive && onStop && (
        <TouchableOpacity style={medStyles.stopBtn} onPress={onStop} activeOpacity={0.8}>
          <Text style={medStyles.stopBtnText}>Stop Medication</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function VetVisitCard({
  visit,
  colors,
}: {
  visit: VetVisit;
  colors: AppColors;
}) {
  return (
    <View style={[visitStyles.card, { backgroundColor: colors.surface }]}>
      <View style={visitStyles.header}>
        <Text style={[visitStyles.reason, { color: colors.text }]}>{visit.reason}</Text>
        <Text style={[visitStyles.date, { color: colors.textTertiary }]}>{formatDate(visit.visitDate)}</Text>
      </View>
      {visit.vetName ? (
        <Text style={[visitStyles.detail, { color: colors.textSecondary }]}>🩺 {visit.vetName}</Text>
      ) : null}
      {visit.cost != null ? (
        <Text style={[visitStyles.detail, { color: colors.textSecondary }]}>
          💰 AED {visit.cost.toFixed(0)}
        </Text>
      ) : null}
      {visit.notes ? (
        <Text style={[visitStyles.notes, { color: colors.textTertiary }]}>{visit.notes}</Text>
      ) : null}
      {visit.nextVisit ? (
        <View style={visitStyles.nextVisitRow}>
          <Text style={visitStyles.nextVisitText}>
            Next visit: {formatDate(visit.nextVisit)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  colors: AppColors;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={[fieldStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType ?? 'default'}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Dynamic styles factory ───────────────────────────────────────────────────
function dynamicStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: { fontSize: 24, lineHeight: 30 },
    headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },

    segmentWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    segmentContainer: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 3,
    },
    segmentPill: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    segmentPillActive: {
      backgroundColor: '#FFFFFF',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: { elevation: 2 },
      }),
    },
    segmentLabel: { fontSize: 13, fontWeight: '600' },

    content: { padding: 16, gap: 12 },

    card: {
      borderRadius: 16,
      padding: 16,
      gap: 6,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
    currentWeight: {
      fontSize: 36,
      fontWeight: '800',
      color: '#E8A0A0',
      letterSpacing: -1,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardWeight: { fontSize: 18, fontWeight: '700' },
    cardDate: { fontSize: 12 },
    cardNotes: { fontSize: 13, lineHeight: 18 },

    subHeader: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },

    upcomingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#EDF5FF',
      borderRadius: 14,
      padding: 14,
      marginBottom: 4,
    },
    upcomingIcon: { fontSize: 24 },
    upcomingTitle: { fontSize: 12, fontWeight: '700', color: '#007AFF', marginBottom: 2 },
    upcomingText: { fontSize: 13, color: '#007AFF' },

    fabContainer: {
      position: 'absolute',
      bottom: 24,
      right: 20,
    },
    fab: {
      backgroundColor: '#E8A0A0',
      borderRadius: 100,
      paddingHorizontal: 22,
      paddingVertical: 14,
      ...Platform.select({
        ios: {
          shadowColor: '#E8A0A0',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
        },
        android: { elevation: 8 },
      }),
    },
    fabText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '85%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, letterSpacing: -0.3 },

    submitBtn: {
      backgroundColor: '#E8A0A0',
      borderRadius: 14,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    cancelBtn: {
      borderRadius: 14,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      borderWidth: 1,
    },
    cancelBtnText: { fontSize: 15, fontWeight: '500' },
  });
}

// ─── Static sub-component styles ─────────────────────────────────────────────
const emptyStyles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  btn: {
    backgroundColor: '#FAE0E0',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: '#E8A0A0' },
});

const medStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700' },
  badge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 20 },
  notes: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  stopBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  stopBtnText: { fontSize: 13, fontWeight: '600', color: '#FF3B30' },
});

const visitStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reason: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  date: { fontSize: 12 },
  detail: { fontSize: 13, lineHeight: 20 },
  notes: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  nextVisitRow: {
    marginTop: 8,
    backgroundColor: '#EDF5FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nextVisitText: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});

const vaxStyles = StyleSheet.create({
  dueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF6E5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  dueText: { fontSize: 12, fontWeight: '600', color: '#FF9500' },
});

const styles = StyleSheet.create({
  chartDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  chartLine: {
    position: 'absolute',
    width: 44,
    height: 2,
    left: 8,
  },
  chartWeight: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  chartDate: { fontSize: 10, marginTop: 2 },
});
