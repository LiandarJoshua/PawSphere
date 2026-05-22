import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { sittersService, SPECIALTIES, type SitterProfile } from '../../../services/sitters';

interface AvailabilityPeriod {
  id: string;
  startDate: string;
  endDate: string;
}

function Field({
  label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false,
  required = false,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; required?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: '#FF3B30' }}> *</Text>}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AEAEB2"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function RegisterAsSitterScreen() {
  const [existing, setExisting] = useState<SitterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('0');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [availability, setAvailability] = useState<AvailabilityPeriod[]>([]);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [addingAvail, setAddingAvail] = useState(false);
  const [removingAvailId, setRemovingAvailId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    sittersService.getMyProfile()
      .then(async (profile) => {
        if (profile) {
          setExisting(profile);
          setDisplayName(profile.displayName);
          setBio(profile.bio ?? '');
          setExperience(String(profile.experience));
          setHourlyRate(String(profile.hourlyRate));
          setDailyRate(profile.dailyRate ? String(profile.dailyRate) : '');
          setPhone(profile.phone ?? '');
          setCity(profile.city ?? '');
          setIsAvailable(profile.isAvailable);
          setSpecialties(profile.specialties);
          try {
            const avail = await sittersService.getAvailability(profile.id);
            setAvailability(avail);
          } catch {
            // silent
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  function toggleSpecialty(key: string) {
    setSpecialties((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  async function handleAddAvailability() {
    if (!newStartDate.trim() || !newEndDate.trim()) {
      Alert.alert('Missing dates', 'Please enter both start and end dates.');
      return;
    }
    setAddingAvail(true);
    try {
      const period = await sittersService.addAvailability({ startDate: newStartDate.trim(), endDate: newEndDate.trim() });
      setAvailability((prev) => [...prev, period]);
      setNewStartDate('');
      setNewEndDate('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add availability.');
    } finally {
      setAddingAvail(false);
    }
  }

  async function handleRemoveAvailability(availId: string) {
    setRemovingAvailId(availId);
    try {
      await sittersService.removeAvailability(availId);
      setAvailability((prev) => prev.filter((a) => a.id !== availId));
    } catch {
      Alert.alert('Error', 'Failed to remove availability period.');
    } finally {
      setRemovingAvailId(null);
    }
  }

  function formatDateShort(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  async function save() {
    if (!displayName.trim()) {
      const msg = 'Display name is required';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Missing field', msg);
      return;
    }
    const hr = parseFloat(hourlyRate);
    if (!hourlyRate || isNaN(hr) || hr <= 0) {
      const msg = 'Enter a valid hourly rate';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid rate', msg);
      return;
    }

    setSaving(true);
    try {
      await sittersService.upsertProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        experience: Math.max(0, parseInt(experience, 10) || 0),
        hourlyRate: hr,
        dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        isAvailable,
        specialties,
      });
      const msg = existing ? 'Profile updated!' : 'You\'re now registered as a sitter!';
      if (Platform.OS === 'web') { window.alert(msg); router.push('/(tabs)/sitters'); }
      else Alert.alert('Success', msg, [{ text: 'OK', onPress: () => router.push('/(tabs)/sitters') }]);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to save profile';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color="#F4C2C2" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 32 }}>🐾</Text>
          </View>
          <Text style={styles.title}>{existing ? 'Edit Your Sitter Profile' : 'Become a Pet Sitter'}</Text>
          <Text style={styles.subtitle}>
            {existing
              ? 'Update your profile to attract more clients'
              : 'Create your profile and start earning by caring for pets'}
          </Text>
        </View>

        <View style={styles.card}>
          <Field label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Sarah" required />
          <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell pet owners about yourself…" multiline />
          <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Dubai" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+971 50 000 0000" keyboardType="phone-pad" />
          <Field label="Years of Experience" value={experience} onChangeText={setExperience} placeholder="0" keyboardType="number-pad" />
          <Field label="Hourly Rate (AED)" value={hourlyRate} onChangeText={setHourlyRate} placeholder="50" keyboardType="decimal-pad" required />
          <Field label="Daily Rate (AED, optional)" value={dailyRate} onChangeText={setDailyRate} placeholder="200" keyboardType="decimal-pad" />

          {/* Availability toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.fieldLabel}>Currently Available</Text>
              <Text style={styles.toggleSub}>Turn off when you're on break</Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#E5E5EA', true: '#F4C2C2' }}
              thumbColor={isAvailable ? '#E8A0A0' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Specialties */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <Text style={styles.sectionSub}>Select the animals you're comfortable caring for</Text>
          <View style={styles.specialtiesGrid}>
            {SPECIALTIES.map((s) => {
              const active = specialties.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.specialtyBtn, active && styles.specialtyBtnActive]}
                  onPress={() => toggleSpecialty(s.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.specialtyEmoji}>{s.emoji}</Text>
                  <Text style={[styles.specialtyLabel, active && styles.specialtyLabelActive]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Availability Periods</Text>
          <Text style={styles.sectionSub}>Add date ranges when you are available to sit</Text>

          {availability.length > 0 && (
            <View style={styles.availList}>
              {availability.map((period) => (
                <View key={period.id} style={styles.availRow}>
                  <View style={styles.availDates}>
                    <Text style={styles.availDateText}>{formatDateShort(period.startDate)}</Text>
                    <Text style={styles.availArrow}>→</Text>
                    <Text style={styles.availDateText}>{formatDateShort(period.endDate)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.availRemoveBtn, removingAvailId === period.id && { opacity: 0.4 }]}
                    onPress={() => handleRemoveAvailability(period.id)}
                    disabled={removingAvailId === period.id}
                    activeOpacity={0.7}
                  >
                    {removingAvailId === period.id
                      ? <ActivityIndicator size="small" color="#FF3B30" />
                      : <Text style={styles.availRemoveText}>✕</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.availInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={newStartDate}
                onChangeText={setNewStartDate}
                placeholder="2025-06-01"
                placeholderTextColor="#AEAEB2"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={newEndDate}
                onChangeText={setNewEndDate}
                placeholder="2025-06-30"
                placeholderTextColor="#AEAEB2"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.availAddBtn, addingAvail && { opacity: 0.5 }]}
            onPress={handleAddAvailability}
            disabled={addingAvail}
            activeOpacity={0.8}
          >
            {addingAvail
              ? <ActivityIndicator color="#E8A0A0" size="small" />
              : <Text style={styles.availAddBtnText}>+ Add Period</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>{existing ? 'Save Changes' : 'Create Profile'}</Text>}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  headerIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#FAE0E0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#F4C2C2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#636366', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#636366', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#F8F8F8', borderRadius: 14, paddingHorizontal: 14,
    height: 44, fontSize: 15, color: '#1C1C1E',
  },
  fieldInputMulti: { height: 90, paddingTop: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  toggleSub: { fontSize: 12, color: '#AEAEB2', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#AEAEB2', marginBottom: 14 },
  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specialtyBtn: {
    flexBasis: '30%', alignItems: 'center', paddingVertical: 12,
    backgroundColor: '#F8F8F8', borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  specialtyBtnActive: { backgroundColor: '#FAE0E0', borderColor: '#F4C2C2' },
  specialtyEmoji: { fontSize: 24, marginBottom: 4 },
  specialtyLabel: { fontSize: 12, color: '#636366', fontWeight: '500' },
  specialtyLabelActive: { color: '#E8A0A0', fontWeight: '700' },

  saveBtn: {
    height: 56, borderRadius: 20, backgroundColor: '#E8A0A0',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E8A0A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#F4C2C2', shadowOpacity: 0.15 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  availList: { marginBottom: 14 },
  availRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F8F8', borderRadius: 12,
    padding: 10, marginBottom: 8,
  },
  availDates: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  availDateText: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  availArrow: { fontSize: 12, color: '#AEAEB2' },
  availRemoveBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFE5E5', alignItems: 'center', justifyContent: 'center' },
  availRemoveText: { fontSize: 11, fontWeight: '800', color: '#FF3B30' },
  availInputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  availAddBtn: {
    height: 44, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#F4C2C2', alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed',
  },
  availAddBtnText: { fontSize: 14, fontWeight: '700', color: '#E8A0A0' },
});
