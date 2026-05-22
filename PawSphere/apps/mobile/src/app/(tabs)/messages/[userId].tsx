import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { dmService, type DMMessage } from '../../../services/dm';
import { useTheme } from '../../../theme/ThemeContext';

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DMScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipientName = name ?? 'User';
  const myId = user?.id ?? '';

  const loadMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await dmService.getMessages(userId);
      setMessages(data);
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    (async () => {
      await loadMessages();
      setLoading(false);
    })();

    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await dmService.send(userId, text);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setInput(text); // restore on failure
    } finally {
      setSending(false);
    }
  }, [input, userId, sending]);

  function renderMessage({ item, index }: { item: DMMessage; index: number }) {
    const isMe = item.senderId === myId;
    const prev = messages[index - 1];
    const showTime = !prev || new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <>
        {showTime && (
          <Text style={[styles.timeStamp, { color: colors.textTertiary }]}>
            {new Date(item.createdAt).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        )}
        <View style={[styles.row, isMe && styles.rowMe]}>
          <View style={[
            styles.bubble,
            isMe
              ? [styles.bubbleMe, { backgroundColor: colors.primary }]
              : [styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? '#FFFFFF' : colors.text }]}>
              {item.content}
            </Text>
            <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textTertiary }]}>
              {timeStr(item.createdAt)}
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => router.push(`/(tabs)/users/${userId}` as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {recipientName[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.text }]}>{recipientName}</Text>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Start a conversation</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Send a message to {recipientName}
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text }]}
            placeholder={`Message ${recipientName}…`}
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendBtnText}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 32, fontWeight: '300', lineHeight: 36 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center' },
  headerSub: { fontSize: 11, fontWeight: '500', marginTop: 1, textAlign: 'center' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  messageList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },

  timeStamp: { textAlign: 'center', fontSize: 11, fontWeight: '500', marginVertical: 10 },

  row: { flexDirection: 'row', marginBottom: 4 },
  rowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: {
    borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right', fontWeight: '500' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  emptySub: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: -2 },
});
