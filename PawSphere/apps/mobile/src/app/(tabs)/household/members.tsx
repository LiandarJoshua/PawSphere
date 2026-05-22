import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, Alert, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { householdService, type HouseholdMember } from '../../../services/household';

function getInitial(member: HouseholdMember) {
  if (member.user.displayName?.trim()) return member.user.displayName.trim()[0].toUpperCase();
  return member.user.email[0].toUpperCase();
}

function getMemberName(member: HouseholdMember) {
  if (member.user.displayName?.trim()) return member.user.displayName.trim();
  return member.user.email.split('@')[0];
}

export default function HouseholdMembersScreen() {
  const { colors } = useTheme();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await householdService.getMembers();
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleInvite() {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const member = await householdService.inviteMember(email.trim());
      setMembers((prev) => {
        if (prev.find((m) => m.id === member.id)) return prev;
        return [...prev, member];
      });
      setEmail('');
      setInviteVisible(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to invite member';
      Alert.alert('Error', msg);
    } finally {
      setInviting(false);
    }
  }

  function handleRemove(member: HouseholdMember) {
    const confirm = async () => {
      setRemovingId(member.userId);
      try {
        await householdService.removeMember(member.userId);
        setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      } catch {
        Alert.alert('Error', 'Failed to remove member.');
      } finally {
        setRemovingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${getMemberName(member)} from your household?`)) confirm();
    } else {
      Alert.alert('Remove Member', `Remove ${getMemberName(member)} from your household?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: confirm },
      ]);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Household Members</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={() => setInviteVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteBtnText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
        <Text style={styles.infoBannerEmoji}>🏠</Text>
        <Text style={[styles.infoBannerText, { color: colors.primary }]}>
          Household members can view and manage all pets in your home. Invite a partner or family member using their PawSphere email.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🏠</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No members yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Invite family members to manage your pets together.
          </Text>
          <TouchableOpacity
            style={[styles.inviteFirstBtn, { backgroundColor: colors.primary }]}
            onPress={() => setInviteVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.inviteBtnText}>Invite Family Members</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {members.map((member) => (
            <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                {member.user.avatarUrl ? (
                  <Image source={{ uri: member.user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitial(member)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.text }]}>{getMemberName(member)}</Text>
                <Text style={[styles.memberEmail, { color: colors.textTertiary }]}>{member.user.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.roleText, { color: colors.textSecondary }]}>{member.role}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(member)}
                disabled={removingId === member.userId}
                activeOpacity={0.7}
              >
                {removingId === member.userId
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Text style={styles.removeIcon}>✕</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={inviteVisible} transparent animationType="slide" onRequestClose={() => setInviteVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setInviteVisible(false)} activeOpacity={1} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Member</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enter the email address of the person you want to add to your household.
            </Text>
            <TextInput
              style={[styles.emailInput, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.sendInviteBtn, { backgroundColor: colors.primary }, (inviting || !email.trim()) && { opacity: 0.5 }]}
              onPress={handleInvite}
              disabled={inviting || !email.trim()}
              activeOpacity={0.85}
            >
              {inviting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.inviteBtnText}>Send Invite</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  infoBannerEmoji: { fontSize: 20 },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
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
  inviteBtn: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 16 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  memberEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  inviteFirstBtn: { borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
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
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSub: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  emailInput: {
    borderRadius: 14, paddingHorizontal: 14, height: 50,
    fontSize: 15, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendInviteBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
