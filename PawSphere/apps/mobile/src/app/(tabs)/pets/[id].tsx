import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
  TouchableOpacity,
  Modal,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { petsService, type Pet, type Vaccination, type Species } from '../../../services/pets';
import { api } from '../../../lib/api';

const SPECIES_EMOJI: Record<Species, string> = {
  DOG: '🐶',
  CAT: '🐱',
  BIRD: '🐦',
  RABBIT: '🐰',
  REPTILE: '🦎',
  FISH: '🐟',
  OTHER: '🐾',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getAge(dob: string | null): string {
  if (!dob) return 'Unknown';
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
  if (years === 0) {
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    return `${months} months`;
  }
  return `${years} year${years !== 1 ? 's' : ''}`;
}

interface LostAlert {
  id: string;
  petId: string;
  qrTagId: string;
  status: string;
}

export default function PetDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [lostAlert, setLostAlert] = useState<LostAlert | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      petsService.get(id),
      petsService.listVaccinations(id),
      api.get<LostAlert[]>('/alerts/lost').catch(() => [] as LostAlert[]),
    ])
      .then(([petData, vacData, alerts]) => {
        setPet(petData);
        setVaccinations(vacData);
        const petAlert = alerts.find((a) => a.petId === id) ?? null;
        setLostAlert(petAlert);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCreateQrTag() {
    if (!pet) return;
    setCreatingQr(true);
    try {
      const alert = await api.post<LostAlert>('/alerts/lost', {
        petId: pet.id,
        description: `Lost pet alert for ${pet.name}`,
      });
      setLostAlert(alert);
    } catch {
      Alert.alert('Error', 'Could not create QR tag. Please try again.');
    } finally {
      setCreatingQr(false);
    }
  }

  function handleCopyUrl() {
    if (!lostAlert) return;
    const url = `https://pawsphere.app/qr/${lostAlert.qrTagId}`;
    Clipboard.setString(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  async function handleDelete() {
    if (!id) return;

    const doDelete = async () => {
      setDeleting(true);
      try {
        await petsService.remove(id);
        router.back();
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Failed to remove pet. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to remove pet. Please try again.');
        }
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${pet?.name ?? 'this pet'}? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert('Remove Pet', `Remove ${pet?.name ?? 'this pet'}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F4C2C2" size="large" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
          </View>
          <Text style={styles.heroName}>{pet.name}</Text>
          <Text style={styles.heroBreed}>
            {pet.breed ?? pet.species.charAt(0) + pet.species.slice(1).toLowerCase()}
          </Text>
        </View>

        {/* ─── Stats row ────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getAge(pet.dob)}</Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{vaccinations.length}</Text>
            <Text style={styles.statLabel}>{t('pets.vaccinations')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {vaccinations[0]?.nextDueDate ? formatDate(vaccinations[0].nextDueDate) : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('pets.nextDue')}</Text>
          </View>
        </View>

        {/* ─── Medical Info ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pets.medicalHistory')}</Text>
          <View style={styles.infoCard}>
            {pet.medicalInfo ? (
              <Text style={styles.infoText}>{pet.medicalInfo}</Text>
            ) : (
              <Text style={styles.infoPlaceholder}>No medical notes recorded yet.</Text>
            )}
          </View>
        </View>

        {/* ─── Vaccination Timeline ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pets.vaccinations')}</Text>

          {vaccinations.length === 0 ? (
            <View style={styles.emptyVax}>
              <Text style={styles.emptyVaxIcon}>💉</Text>
              <Text style={styles.emptyVaxText}>No vaccination records yet.</Text>
            </View>
          ) : (
            vaccinations.map((vax, index) => (
              <View key={vax.id} style={styles.timelineItem}>
                {/* Timeline dot and line */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, index === 0 && styles.dotActive]} />
                  {index < vaccinations.length - 1 && <View style={styles.line} />}
                </View>

                {/* Content */}
                <View style={styles.timelineContent}>
                  <View style={styles.vaxCard}>
                    <View style={styles.vaxHeader}>
                      <Text style={styles.vaxName}>{vax.vaccineName}</Text>
                      {vax.nextDueDate && (
                        <View style={styles.dueBadge}>
                          <Text style={styles.dueText}>Due {formatDate(vax.nextDueDate)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vaxDate}>
                      Administered {formatDate(vax.administeredAt)}
                    </Text>
                    {vax.notes && <Text style={styles.vaxNotes}>{vax.notes}</Text>}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── Health Records ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Records</Text>
          <Text style={styles.sectionHint}>Log weight, medications, vet visits, and vaccinations. All records are stored securely and can be shared with your vet.</Text>
          <TouchableOpacity
            style={styles.healthBtn}
            onPress={() => router.push(`/(tabs)/pets/${id}/health` as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.healthBtnIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthBtnTitle}>View Health Records</Text>
              <Text style={styles.healthBtnSub}>Weight, medications & vet visits</Text>
            </View>
            <Text style={styles.healthBtnChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.healthBtn, { marginTop: 10 }]}
            onPress={() => router.push(`/(tabs)/pets/${id}/activity` as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.healthBtnIcon}>🏃</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthBtnTitle}>Activity Log</Text>
              <Text style={styles.healthBtnSub}>Track walks, meals & playtime</Text>
            </View>
            <Text style={styles.healthBtnChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.healthBtn, { marginTop: 10 }]}
            onPress={() => router.push(`/(tabs)/pets/${id}/analytics` as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.healthBtnIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthBtnTitle}>Health Analytics</Text>
              <Text style={styles.healthBtnSub}>Weight trends & health summary</Text>
            </View>
            <Text style={styles.healthBtnChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── QR Tag ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR Safety Tag</Text>
          <Text style={styles.sectionHint}>
            A unique ID for your pet's collar. If your pet is ever lost, anyone who finds them can look up this tag to see your contact info — no app needed.
          </Text>
          {lostAlert ? (
            <View>
              <View style={styles.qrActiveHeader}>
                <View style={styles.qrThumb}>
                  <Text style={styles.qrPaw}>🐾</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrCardTitle}>QR Tag Active</Text>
                  <Text style={[styles.qrCardSub, { color: '#34C759' }]}>Scanning enabled</Text>
                </View>
                <TouchableOpacity onPress={() => setQrModalVisible(true)} activeOpacity={0.7}>
                  <Text style={styles.qrCardChevron}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.qrTagIdBox}>
                <Text style={styles.qrTagIdLabel}>TAG ID</Text>
                <Text style={styles.qrTagIdValue}>{lostAlert.qrTagId}</Text>
                <Text style={styles.qrTagIdHint}>Tap the arrow above to view & share QR link</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createQrBtn}
              onPress={handleCreateQrTag}
              disabled={creatingQr}
              activeOpacity={0.8}
            >
              {creatingQr ? (
                <ActivityIndicator color="#E8A0A0" />
              ) : (
                <>
                  <Text style={styles.createQrIcon}>🏷️</Text>
                  <Text style={styles.createQrText}>Create QR Tag</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Remove Pet ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#FF3B30" />
            ) : (
              <Text style={styles.removeBtnText}>🗑️ Remove Pet</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── QR Modal ─────────────────────────────────────────────────────── */}
      {lostAlert && (
        <Modal
          visible={qrModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setQrModalVisible(false)}
        >
          <View style={styles.qrModalOverlay}>
            <TouchableOpacity
              style={styles.qrModalBackdrop}
              activeOpacity={1}
              onPress={() => setQrModalVisible(false)}
            />
            <View style={styles.qrModalSheet}>
              <View style={styles.qrModalHandle} />
              <Text style={styles.qrModalTitle}>Pet Safety Tag</Text>
              <Text style={styles.qrModalSub}>
                Print this page and attach to {pet?.name ?? 'your pet'}'s collar
              </Text>

              {/* Simulated QR visual */}
              <View style={styles.qrBox}>
                <View style={styles.qrFrame}>
                  <View style={styles.qrInner}>
                    <Text style={styles.qrEmoji}>🐾</Text>
                  </View>
                  {/* Corner decorations */}
                  <View style={[styles.qrCorner, styles.qrCornerTL]} />
                  <View style={[styles.qrCorner, styles.qrCornerTR]} />
                  <View style={[styles.qrCorner, styles.qrCornerBL]} />
                  <View style={[styles.qrCorner, styles.qrCornerBR]} />
                </View>
                <Text style={styles.qrIdLabel}>Tag ID</Text>
                <Text style={styles.qrId}>{lostAlert.qrTagId}</Text>
              </View>

              <View style={styles.qrUrlRow}>
                <Text style={styles.qrUrlLabel}>Share URL</Text>
                <Text style={styles.qrUrl}>
                  https://pawsphere.app/qr/{lostAlert.qrTagId}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.qrCopyBtn, copyFeedback && styles.qrCopyBtnDone]}
                onPress={handleCopyUrl}
                activeOpacity={0.8}
              >
                <Text style={styles.qrCopyBtnText}>
                  {copyFeedback ? '✓ Copied!' : '📋 Copy Link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setQrModalVisible(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.qrCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#636366' },

  hero: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: '#1C1C1E', lineHeight: 30 },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: '#FAE0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#F4C2C2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroEmoji: { fontSize: 46 },
  heroName: { fontSize: 26, fontWeight: '700', color: '#1C1C1E' },
  heroBreed: { fontSize: 14, color: '#AEAEB2', marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#AEAEB2', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E5E5EA', marginHorizontal: 8 },

  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  sectionHint: { fontSize: 13, color: '#AEAEB2', lineHeight: 18, marginBottom: 14 },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  infoText: { fontSize: 14, color: '#1C1C1E', lineHeight: 22 },
  infoPlaceholder: { fontSize: 14, color: '#AEAEB2', fontStyle: 'italic' },

  emptyVax: { alignItems: 'center', paddingVertical: 28 },
  emptyVaxIcon: { fontSize: 36, marginBottom: 10 },
  emptyVaxText: { fontSize: 14, color: '#AEAEB2' },

  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 28, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E5EA', marginTop: 14 },
  dotActive: { backgroundColor: '#F4C2C2' },
  line: { width: 2, flex: 1, backgroundColor: '#F2F2F2', marginTop: 4 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  vaxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  vaxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  vaxName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  dueBadge: {
    backgroundColor: '#FAE0E0',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dueText: { fontSize: 11, fontWeight: '500', color: '#E8A0A0' },
  vaxDate: { fontSize: 12, color: '#AEAEB2', marginTop: 4 },
  vaxNotes: { fontSize: 13, color: '#636366', marginTop: 6, lineHeight: 18 },

  removeBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 15, fontWeight: '600', color: '#FF3B30' },

  // Health Records button
  healthBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  healthBtnIcon: { fontSize: 24 },
  healthBtnTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  healthBtnSub: { fontSize: 12, color: '#AEAEB2' },
  healthBtnChevron: { fontSize: 22, color: '#AEAEB2', lineHeight: 26 },

  // QR card (when active)
  qrActiveHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  qrTagIdBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  qrTagIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AEAEB2',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  qrTagIdValue: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1C1C1E',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  qrTagIdHint: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  qrThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FAE0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPaw: { fontSize: 24 },
  qrCardTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  qrCardSub: { fontSize: 12, color: '#AEAEB2', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  qrCardChevron: { fontSize: 22, color: '#AEAEB2', lineHeight: 26 },

  // Create QR button
  createQrBtn: {
    backgroundColor: '#FAE0E0',
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F4C2C2',
  },
  createQrIcon: { fontSize: 20 },
  createQrText: { fontSize: 15, fontWeight: '700', color: '#E8A0A0' },

  // QR Modal
  qrModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  qrModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  qrModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  qrModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 20,
  },
  qrModalTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 6 },
  qrModalSub: { fontSize: 13, color: '#AEAEB2', textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },

  qrBox: { alignItems: 'center', marginBottom: 20 },
  qrFrame: {
    width: 160,
    height: 160,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: '#F8F8F8',
  },
  qrInner: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FAE0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrEmoji: { fontSize: 40 },
  qrCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#1C1C1E',
    borderWidth: 4,
    borderRadius: 4,
  },
  qrCornerTL: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  qrCornerTR: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  qrCornerBL: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  qrCornerBR: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },
  qrIdLabel: { fontSize: 11, fontWeight: '600', color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  qrId: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },

  qrUrlRow: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrUrlLabel: { fontSize: 11, fontWeight: '600', color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  qrUrl: { fontSize: 13, color: '#007AFF', textAlign: 'center' },

  qrCopyBtn: {
    width: '100%',
    backgroundColor: '#E8A0A0',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrCopyBtnDone: { backgroundColor: '#34C759' },
  qrCopyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  qrCloseBtn: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  qrCloseBtnText: { fontSize: 15, fontWeight: '500', color: '#636366' },
});
