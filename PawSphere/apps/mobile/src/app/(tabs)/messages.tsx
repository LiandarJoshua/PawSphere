import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Alert, Modal, Platform, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { dmService, type Conversation, type DMUser } from '../../services/dm';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function userName(u: DMUser): string {
  if (u.displayName?.trim()) return u.displayName.trim();
  return u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function userInitial(u: DMUser): string {
  return (u.displayName?.trim() || u.email)[0].toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 48, colors }: { user: DMUser; size?: number; colors: any }) {
  if (user.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={[
      styles.avatarFallback,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight },
    ]}>
      <Text style={[styles.avatarInitial, { color: colors.primary, fontSize: size * 0.4 }]}>
        {userInitial(user)}
      </Text>
    </View>
  );
}

// ─── New Message Modal ────────────────────────────────────────────────────────

function NewMessageModal({ visible, onClose, colors }: {
  visible: boolean; onClose: () => void; colors: any;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DMUser[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<DMUser[]>(`/users/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 320);
  }, []);

  function startChat(user: DMUser) {
    onClose();
    setQuery('');
    setResults([]);
    router.push(`/(tabs)/messages/${user.id}?name=${encodeURIComponent(userName(user))}`);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.separator, backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Message</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface2 }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users…"
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={search}
              autoFocus
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={colors.textTertiary} />}
          </View>
        </View>

        {results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            contentContainerStyle={styles.searchResults}
            renderItem={({ item: user }) => (
              <TouchableOpacity
                style={[styles.userRow, { borderBottomColor: colors.separator }]}
                onPress={() => startChat(user)}
                activeOpacity={0.7}
              >
                <Avatar user={user} size={44} colors={colors} />
                <View style={styles.userRowMeta}>
                  <Text style={[styles.userRowName, { color: colors.text }]}>{userName(user)}</Text>
                  <Text style={[styles.userRowEmail, { color: colors.textTertiary }]}>{user.email}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : query.trim() && !searching ? (
          <View style={styles.searchEmpty}>
            <Text style={[styles.searchEmptyText, { color: colors.textTertiary }]}>No users found</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsgVisible, setNewMsgVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await dmService.getConversations();
      setConversations(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(conv: Conversation) {
    Alert.alert(
      'Delete conversation',
      `Remove all messages with ${userName(conv.user)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await dmService.deleteConversation(conv.userId).catch(() => {});
            setConversations((prev) => prev.filter((c) => c.userId !== conv.userId));
          },
        },
      ],
    );
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Messages{totalUnread > 0 ? ` (${totalUnread})` : ''}
        </Text>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setNewMsgVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.composeBtnText, { color: colors.primary }]}>✏️</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>✉️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Start a conversation with another pet owner
          </Text>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => setNewMsgVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.newBtnText}>New Message</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.userId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item: conv }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.separator }]}
              onPress={() =>
                router.push(`/(tabs)/messages/${conv.userId}?name=${encodeURIComponent(userName(conv.user))}`)
              }
              onLongPress={() => confirmDelete(conv)}
              activeOpacity={0.75}
            >
              <View style={styles.rowAvatarWrap}>
                <Avatar user={conv.user} size={52} colors={colors} />
                {conv.unreadCount > 0 && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadDotText}>
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text
                    style={[
                      styles.rowName,
                      { color: colors.text },
                      conv.unreadCount > 0 && styles.rowNameBold,
                    ]}
                    numberOfLines={1}
                  >
                    {userName(conv.user)}
                  </Text>
                  <Text style={[styles.rowTime, { color: colors.textTertiary }]}>
                    {timeAgo(conv.lastMessage.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowPreview,
                    { color: conv.unreadCount > 0 ? colors.text : colors.textSecondary },
                    conv.unreadCount > 0 && styles.rowPreviewBold,
                  ]}
                  numberOfLines={1}
                >
                  {conv.lastMessage.isFromMe ? 'You: ' : ''}{conv.lastMessage.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <NewMessageModal
        visible={newMsgVisible}
        onClose={() => setNewMsgVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  composeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  composeBtnText: { fontSize: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  newBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: { paddingBottom: 32 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  rowAvatarWrap: { position: 'relative' },
  unreadDot: {
    position: 'absolute', bottom: 0, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '500', flex: 1, marginRight: 8 },
  rowNameBold: { fontWeight: '700' },
  rowTime: { fontSize: 12, fontWeight: '400' },
  rowPreview: { fontSize: 14, lineHeight: 19 },
  rowPreviewBold: { fontWeight: '600' },

  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700' },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalClose: { fontSize: 16, fontWeight: '500' },
  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: 12, paddingHorizontal: 12, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15 },
  searchResults: { paddingBottom: 32 },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  userRowMeta: { flex: 1, gap: 2 },
  userRowName: { fontSize: 15, fontWeight: '600' },
  userRowEmail: { fontSize: 12 },
  searchEmpty: { paddingTop: 32, alignItems: 'center' },
  searchEmptyText: { fontSize: 14 },
});
