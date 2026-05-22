import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useTheme } from '../theme/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'model',
  text: "Hi! I'm PawBot 🐾 Your personal pet care AI. Ask me anything about your pets, their health, nutrition, or how PawSphere can help you!",
};

const SUGGESTED = [
  'Is my pet due for vaccination?',
  'Tips for UAE summer heat?',
  'How do I book a sitter?',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PawBotModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) {
      setMessages([WELCOME]);
      setInput('');
      setSending(false);
      setShowSuggested(true);
    }
  }, [visible]);

  const send = useCallback(async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || sending) return;

    setShowSuggested(false);
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: msgText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const data = await api.post<{ reply: string }>('/ai/chat', { messages: history });
      setMessages((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: 'model', text: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'model', text: "Sorry, I'm having trouble right now. Please try again in a moment." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, messages, sending]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={[styles.botAvatarSmall, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.botAvatarSmallText}>🐾</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleBot, { backgroundColor: colors.surface2, borderColor: colors.border }],
        ]}>
          <Text style={[styles.bubbleText, { color: isUser ? '#FFFFFF' : colors.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.botAvatarLarge, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.botAvatarLargeText}>🐾</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>PawBot</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>AI pet care assistant</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            showSuggested ? (
              <View style={styles.suggestedRow}>
                {SUGGESTED.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.suggestedChip, { backgroundColor: colors.surface2, borderColor: colors.primaryBorder }]}
                    onPress={() => send(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestedChipText, { color: colors.primary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {/* Typing indicator */}
        {sending && (
          <View style={styles.typingRow}>
            <View style={[styles.botAvatarSmall, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.botAvatarSmallText}>🐾</Text>
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.textTertiary }]}>thinking…</Text>
            </View>
          </View>
        )}

        {/* Input bar */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, color: colors.text }]}
              placeholder="Ask about your pets…"
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || sending) && { opacity: 0.4 }]}
              onPress={() => send()}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatarLarge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  botAvatarLargeText: { fontSize: 22 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2EBD54' },
  headerSub: { fontSize: 12 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, fontWeight: '600' },

  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },

  botAvatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  botAvatarSmallText: { fontSize: 14 },

  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },

  suggestedRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8,
  },
  suggestedChip: {
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1,
  },
  suggestedChipText: { fontSize: 13, fontWeight: '500' },

  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typingText: { fontSize: 13 },

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
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: -2 },
});
