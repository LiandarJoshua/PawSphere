import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../../theme/ThemeContext';
import { analyticsService } from '../../../../services/analytics';
import { petsService } from '../../../../services/pets';

const BAR_CHART_HEIGHT = 120;

interface WeightPoint { weight: number; loggedAt: string; notes?: string }

function WeightChart({ data, primaryColor }: { data: WeightPoint[]; primaryColor: string }) {
  if (data.length === 0) return (
    <View style={styles.chartEmpty}>
      <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
      <Text style={styles.chartEmptyText}>No weight entries yet</Text>
    </View>
  );

  const last10 = data.slice(-10);
  const weights = last10.map((d) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.barChartArea}>
        {last10.map((point, i) => {
          const pct = (point.weight - minW) / range;
          const barH = Math.max(8, pct * BAR_CHART_HEIGHT);
          const date = new Date(point.loggedAt);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          const showLabel = i === 0 || i === last10.length - 1 || i === Math.floor((last10.length - 1) / 2);
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>{point.weight}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: barH, backgroundColor: primaryColor }]} />
              </View>
              <Text style={styles.barLabel}>{showLabel ? label : ''}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.barAxisRow}>
        <Text style={styles.axisLabel}>{minW.toFixed(1)} kg</Text>
        <Text style={styles.axisLabel}>{maxW.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [petName, setPetName] = useState('');
  const [weightData, setWeightData] = useState<WeightPoint[]>([]);
  const [summary, setSummary] = useState<{
    vaccinations: number;
    activeMedications: number;
    recentVisits: Array<{ id: string; visitDate: string; reason: string; vetName?: string; cost?: number }>;
    recentWeights: Array<{ weight: number; loggedAt: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      petsService.get(id),
      analyticsService.getWeightTrend(id),
      analyticsService.getHealthSummary(id),
    ])
      .then(([pet, trend, sum]) => {
        setPetName(pet.name);
        setWeightData(trend);
        setSummary(sum);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Health Analytics</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {petName ? `${petName} · ` : ''}Weight trends & health overview
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {summary && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statEmoji}>💉</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.vaccinations}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Vaccinations</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statEmoji}>💊</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.activeMedications}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active Meds</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statEmoji}>🏥</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.recentVisits.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Vet Visits</Text>
              </View>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Weight Trend</Text>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>Last 10 recorded weights (kg)</Text>
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <WeightChart data={weightData} primaryColor={colors.primary} />
            </View>
          </View>

          {summary && summary.recentVisits.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Vet Visits</Text>
              {summary.recentVisits.map((visit, i) => (
                <View key={visit.id} style={[styles.visitRow, i < summary.recentVisits.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <View style={[styles.visitDot, { backgroundColor: colors.primaryLight }]}>
                    <Text style={{ fontSize: 12 }}>🏥</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visitReason, { color: colors.text }]}>{visit.reason}</Text>
                    <Text style={[styles.visitDate, { color: colors.textTertiary }]}>
                      {new Date(visit.visitDate).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {visit.vetName ? `  ·  ${visit.vetName}` : ''}
                    </Text>
                  </View>
                  {visit.cost != null && (
                    <Text style={[styles.visitCost, { color: colors.textSecondary }]}>AED {visit.cost}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {summary && summary.recentWeights.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Weights</Text>
              {summary.recentWeights.slice(0, 5).map((w, i) => (
                <View key={i} style={[styles.visitRow, i < Math.min(summary.recentWeights.length, 5) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <Text style={{ fontSize: 16, marginRight: 12 }}>⚖️</Text>
                  <Text style={[styles.visitReason, { color: colors.text }]}>{w.weight} kg</Text>
                  <Text style={[styles.visitDate, { color: colors.textTertiary }]}>
                    {new Date(w.loggedAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </View>
          )}

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
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', borderRadius: 20, padding: 16,
    borderWidth: StyleSheet.hairlineWidth, gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center' },
  card: {
    borderRadius: 20, padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  cardSub: { fontSize: 12, fontWeight: '500' },
  chartEmpty: { height: 100, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontSize: 13, color: '#AEAEB2' },
  barChartArea: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_CHART_HEIGHT + 36, gap: 4, paddingTop: 20 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '100%', height: BAR_CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 8 },
  barValue: { fontSize: 8, color: '#AEAEB2', marginBottom: 2 },
  barLabel: { fontSize: 8, color: '#AEAEB2', marginTop: 4, textAlign: 'center' },
  barAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { fontSize: 10, color: '#AEAEB2' },
  visitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  visitDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  visitReason: { fontSize: 14, fontWeight: '600', flex: 1 },
  visitDate: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  visitCost: { fontSize: 13, fontWeight: '600' },
});
