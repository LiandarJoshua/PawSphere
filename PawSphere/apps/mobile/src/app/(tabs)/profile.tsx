import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Modal, TextInput, Image,
  Pressable, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { petsService } from '../../services/pets';
import { supabase } from '../../lib/supabase';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { api } from '../../lib/api';

// ─── Appearance Modal ─────────────────────────────────────────────────────────

function AppearanceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, mode, setMode } = useTheme();

  const options: { label: string; value: ThemeMode; emoji: string }[] = [
    { label: 'Light', value: 'light', emoji: '☀️' },
    { label: 'Dark', value: 'dark', emoji: '🌙' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={appearStyles.backdrop}
        onPress={onClose}
      />
      <View style={[appearStyles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[appearStyles.handle, { backgroundColor: colors.surface3 }]} />
        <Text style={[appearStyles.title, { color: colors.text }]}>Appearance</Text>

        {options.map((opt, i) => {
          const selected = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                appearStyles.option,
                i < options.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.separator,
                },
              ]}
              onPress={() => { setMode(opt.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={appearStyles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[appearStyles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              {selected && (
                <View style={[appearStyles.checkCircle, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[appearStyles.checkMark, { color: colors.primary }]}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[appearStyles.cancelBtn, { backgroundColor: colors.surface2 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[appearStyles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, updateProfile, isLoading, error, clearError } = useAuthStore();
  const { colors } = useTheme();

  const currentName = (user?.user_metadata as Record<string, unknown>)?.display_name as string | undefined
    ?? user?.email?.split('@')[0] ?? '';
  const currentPhone = (user?.user_metadata as Record<string, unknown>)?.phone as string | undefined ?? '';

  const [displayName, setDisplayName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(currentName);
      setPhone(currentPhone);
      setAvatarUri(null);
      clearError();
    }
  }, [visible]);

  async function pickAvatar() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: Event) => {
        const file: File = (e.target as HTMLInputElement).files?.[0] as File;
        if (!file) return;
        setUploading(true);
        try {
          const path = `avatars/${Date.now()}-${file.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
          setAvatarUri(urlData.publicUrl);
        } catch {
          Alert.alert('Upload failed', 'Could not upload image. Make sure the "avatars" bucket exists in Supabase Storage.');
        } finally {
          setUploading(false);
        }
      };
      input.click();
      return;
    }

    let ImagePicker: {
      requestMediaLibraryPermissionsAsync: () => Promise<{ status: string }>;
      launchImageLibraryAsync: (opts: Record<string, unknown>) => Promise<{ canceled: boolean; assets: { uri: string }[] }>;
      MediaTypeOptions: { Images: string };
    };
    try {
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Not available', 'Run: npx expo install expo-image-picker');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() ?? 'jpg';
      const path = `avatars/${Date.now()}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      setAvatarUri(urlData.publicUrl);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. Make sure the "avatars" bucket exists in Supabase Storage.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    await updateProfile({
      displayName: displayName.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUrl: avatarUri ?? undefined,
    });
    const { error: storeError } = useAuthStore.getState();
    if (!storeError) onClose();
  }

  const currentAvatar = avatarUri ?? ((user?.user_metadata as Record<string, unknown>)?.avatar_url as string | undefined);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={editStyles.backdrop} onPress={onClose} />
        <View style={[editStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[editStyles.handle, { backgroundColor: colors.surface3 }]} />
          <View style={editStyles.header}>
            <Text style={[editStyles.title, { color: colors.text }]}>Edit Profile</Text>
            <TouchableOpacity
              style={[editStyles.closeBtn, { backgroundColor: colors.surface2 }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[editStyles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Avatar */}
            <TouchableOpacity style={editStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8} disabled={uploading}>
              {currentAvatar
                ? <Image source={{ uri: currentAvatar }} style={[editStyles.avatarImg, { borderColor: colors.surface2 }]} />
                : (
                  <View style={[editStyles.avatarPlaceholder, { backgroundColor: colors.primaryLight, borderColor: colors.surface2 }]}>
                    <Text style={[editStyles.avatarInitial, { color: colors.primary }]}>
                      {displayName.slice(0, 2).toUpperCase() || '?'}
                    </Text>
                  </View>
                )
              }
              <View style={[editStyles.avatarBadge, { backgroundColor: colors.text, borderColor: colors.surface }]}>
                {uploading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={editStyles.avatarBadgeText}>📷</Text>
                }
              </View>
            </TouchableOpacity>
            <Text style={[editStyles.avatarHint, { color: colors.textTertiary }]}>Tap to change photo</Text>

            {/* Fields */}
            <Text style={[editStyles.fieldLabel, { color: colors.textTertiary }]}>Display Name</Text>
            <TextInput
              style={[editStyles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <Text style={[editStyles.fieldLabel, { color: colors.textTertiary }]}>Phone</Text>
            <TextInput
              style={[editStyles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+971 50 000 0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />

            {error && <Text style={editStyles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[editStyles.saveBtn, { backgroundColor: colors.text }, (isLoading || uploading) && editStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isLoading || uploading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={editStyles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { colors, mode } = useTheme();
  const [petCount, setPetCount] = useState<number | null>(null);
  const [firstPetId, setFirstPetId] = useState<string | null>(null);
  const [loadingPets, setLoadingPets] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('OWNER');

  useEffect(() => {
    petsService.list()
      .then((pets) => {
        setPetCount(pets.length);
        if (pets.length > 0) setFirstPetId(pets[0].id);
      })
      .catch(() => setPetCount(null))
      .finally(() => setLoadingPets(false));

    api.get<{ role: string }>('/users/me')
      .then((u) => setUserRole(u.role))
      .catch(() => {});
  }, []);

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const displayName = (meta?.display_name as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'User';
  const initial = displayName.slice(0, 2).toUpperCase();
  const email = user?.email ?? '';
  const phone = meta?.phone as string | undefined;
  const avatarUrl = meta?.avatar_url as string | undefined;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const appearanceModeLabel: Record<ThemeMode, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setEditVisible(true)} activeOpacity={0.85}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={[styles.avatarImg, { borderColor: colors.surface }]} />
              : (
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.surface }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
                </View>
              )
            }
            <View style={[styles.editBadge, { backgroundColor: colors.text, borderColor: colors.surface }]}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.emailText, { color: colors.textTertiary }]}>{email}</Text>
          {memberSince && (
            <View style={[styles.memberBadge, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.memberBadgeText, { color: colors.textTertiary }]}>🐾  Member since {memberSince}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.editProfileBtn, { borderColor: colors.text }]}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.editProfileBtnText, { color: colors.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
            {loadingPets
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={[styles.statValue, { color: colors.text }]}>{petCount ?? '—'}</Text>}
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>My Pets</Text>
          </TouchableOpacity>
          <View style={[styles.statSep, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/sitters/register' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>🐶</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Sitter Profile</Text>
          </TouchableOpacity>
          <View style={[styles.statSep, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/sitters' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>🔍</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Find Sitters</Text>
          </TouchableOpacity>
        </View>

        {/* Account info */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.listRow}>
            <Text style={styles.listIcon}>✉️</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listLabel, { color: colors.textTertiary }]}>Email</Text>
              <Text style={[styles.listValue, { color: colors.text }]}>{email}</Text>
            </View>
          </View>
          {phone && (
            <>
              <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.listRow}>
                <Text style={styles.listIcon}>📱</Text>
                <View style={styles.listBody}>
                  <Text style={[styles.listLabel, { color: colors.textTertiary }]}>Phone</Text>
                  <Text style={[styles.listValue, { color: colors.text }]}>{phone}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* My Pets */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>MY PETS</Text>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/(tabs)/pets/add' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>➕</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Add a Pet</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/(tabs)' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>🏠</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Dashboard</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Explore */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>EXPLORE</Text>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/(tabs)/discovery' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>🗺️</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Find Vets & Services</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
          <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/(tabs)/alerts' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>🔔</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Community & Alerts</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Management */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>MANAGEMENT</Text>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/(tabs)/household/members' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>🏠</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Household Members</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
          {firstPetId && (
            <>
              <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => router.push(`/(tabs)/pets/${firstPetId}/analytics` as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.listIcon}>📊</Text>
                <View style={styles.listBody}>
                  <Text style={[styles.listValue, { color: colors.text }]}>Pet Health Analytics</Text>
                </View>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </TouchableOpacity>
            </>
          )}
          {userRole === 'PROVIDER' && (
            <>
              <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => router.push('/(tabs)/provider-dashboard' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.listIcon}>📈</Text>
                <View style={styles.listBody}>
                  <Text style={[styles.listValue, { color: colors.text }]}>My Dashboard</Text>
                </View>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </TouchableOpacity>
            </>
          )}
          {userRole === 'ADMIN' && (
            <>
              <View style={[styles.listDivider, { backgroundColor: colors.separator }]} />
              <TouchableOpacity
                style={styles.listRow}
                onPress={() => router.push('/(tabs)/admin' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.listIcon}>🛡️</Text>
                <View style={styles.listBody}>
                  <Text style={[styles.listValue, { color: colors.text }]}>Admin Panel</Text>
                </View>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SETTINGS</Text>
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => setAppearanceVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.listIcon}>🎨</Text>
            <View style={styles.listBody}>
              <Text style={[styles.listValue, { color: colors.text }]}>Appearance</Text>
            </View>
            <Text style={[styles.settingValue, { color: colors.textTertiary }]}>
              {appearanceModeLabel[mode]}
            </Text>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.redLight }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: colors.red }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>PawSphere · Made with 🐾 in the UAE</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
      <AppearanceModal visible={appearanceVisible} onClose={() => setAppearanceVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },

  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#E8A0A0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  avatarText: { fontSize: 30, fontWeight: '700' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  editBadgeText: { fontSize: 11 },
  displayName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 12, marginBottom: 5 },
  emailText: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  memberBadge: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 16,
  },
  memberBadgeText: { fontSize: 12, fontWeight: '600' },
  editProfileBtn: {
    borderWidth: 1.5, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  editProfileBtnText: { fontSize: 14, fontWeight: '700' },

  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statSep: { width: StyleSheet.hairlineWidth, marginVertical: 6 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 20, paddingHorizontal: 20,
  },
  listCard: {
    marginHorizontal: 16, borderRadius: 18, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  listDivider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  listIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  listBody: { flex: 1 },
  listLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  listValue: { fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 20, marginRight: -4 },
  settingValue: { fontSize: 14, fontWeight: '500', marginRight: 4 },

  logoutBtn: {
    marginHorizontal: 16, marginTop: 28,
    borderRadius: 18, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 12, marginTop: 28 },
});

const editStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 44, maxHeight: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 16 },
    }),
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 12, fontWeight: '700' },

  avatarWrap: { alignSelf: 'center', marginBottom: 8 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3 },
  avatarInitial: { fontSize: 32, fontWeight: '700' },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarBadgeText: { fontSize: 13 },
  avatarHint: { textAlign: 'center', fontSize: 13, fontWeight: '500', marginBottom: 24 },

  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  field: {
    borderRadius: 14, paddingHorizontal: 14, height: 48,
    fontSize: 15, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { fontSize: 13, color: '#FF3B30', fontWeight: '500', marginBottom: 12 },
  saveBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

const appearStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 44,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 16 },
    }),
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center', marginBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14,
  },
  optionEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    marginTop: 12, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '600' },
});
