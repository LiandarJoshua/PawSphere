import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { petsService, type Species } from '../../../services/pets';

const SPECIES_OPTIONS: { value: Species; emoji: string; label: string }[] = [
  { value: 'DOG', emoji: '🐶', label: 'Dog' },
  { value: 'CAT', emoji: '🐱', label: 'Cat' },
  { value: 'BIRD', emoji: '🐦', label: 'Bird' },
  { value: 'RABBIT', emoji: '🐰', label: 'Rabbit' },
  { value: 'REPTILE', emoji: '🦎', label: 'Reptile' },
  { value: 'FISH', emoji: '🐟', label: 'Fish' },
  { value: 'OTHER', emoji: '🐾', label: 'Other' },
];

export default function AddPetScreen() {
  const [species, setSpecies] = useState<Species>('DOG');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState('');
  const [medicalInfo, setMedicalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; dob?: string }>({});

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!name.trim()) errs.name = 'Pet name is required';
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) errs.dob = 'Use format YYYY-MM-DD';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      await petsService.create({
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        dob: dob || undefined,
        medicalInfo: medicalInfo.trim() || undefined,
      });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  }

  const selected = SPECIES_OPTIONS.find((s) => s.value === species)!;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Species Picker */}
          <Text style={styles.label}>What kind of pet?</Text>
          <View style={styles.speciesGrid}>
            {SPECIES_OPTIONS.map((opt) => {
              const active = opt.value === species;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.speciesChip, active && styles.speciesChipActive]}
                  onPress={() => setSpecies(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.speciesEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.speciesLabel, active && styles.speciesLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preview avatar */}
          <View style={styles.previewRow}>
            <View style={styles.previewAvatar}>
              <Text style={styles.previewEmoji}>{selected.emoji}</Text>
            </View>
            <Text style={styles.previewName}>{name || 'Your pet'}</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Name */}
            <Text style={styles.fieldLabel}>
              Pet Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, !!fieldErrors.name && styles.inputError]}
              placeholder="e.g. Buddy"
              placeholderTextColor="#C7C7CC"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
            {!!fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

            <View style={styles.divider} />

            {/* Breed */}
            <Text style={styles.fieldLabel}>Breed (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Golden Retriever"
              placeholderTextColor="#C7C7CC"
              value={breed}
              onChangeText={setBreed}
              returnKeyType="next"
            />

            <View style={styles.divider} />

            {/* DOB */}
            <Text style={styles.fieldLabel}>Date of Birth (optional)</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.dob && styles.inputError]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C7C7CC"
              value={dob}
              onChangeText={setDob}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              maxLength={10}
            />
            {!!fieldErrors.dob && <Text style={styles.fieldError}>{fieldErrors.dob}</Text>}

            <View style={styles.divider} />

            {/* Medical Info */}
            <Text style={styles.fieldLabel}>Medical Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Allergies, conditions, medication..."
              placeholderTextColor="#C7C7CC"
              value={medicalInfo}
              onChangeText={setMedicalInfo}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Add Pet</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },

  label: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },

  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  speciesChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    minWidth: 80,
    ...Platform.select({
      android: { elevation: 1 },
    }),
  },
  speciesChipActive: {
    borderColor: '#F4C2C2',
    backgroundColor: '#FAE0E0',
  },
  speciesEmoji: { fontSize: 26, marginBottom: 4 },
  speciesLabel: { fontSize: 12, fontWeight: '500', color: '#636366' },
  speciesLabelActive: { color: '#E8A0A0', fontWeight: '700' },

  previewRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: '#FAE0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#F4C2C2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  previewEmoji: { fontSize: 36 },
  previewName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#636366', marginBottom: 8 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputError: { borderColor: '#FF3B30' },
  textArea: { height: 96, paddingTop: 12 },
  fieldError: { fontSize: 12, color: '#FF3B30', marginTop: 4 },
  divider: { height: 16 },

  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { fontSize: 13, color: '#FF3B30', textAlign: 'center' },

  saveBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F4C2C2',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#F4C2C2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
