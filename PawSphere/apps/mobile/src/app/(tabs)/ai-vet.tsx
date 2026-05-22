import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, KeyboardAvoidingView,
  Platform, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petsService, type Pet } from '../../services/pets';
import { api } from '../../lib/api';
import { useTheme } from '../../theme/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'model',
  text: "Hi! I'm your AI Vet assistant 🩺 I have context about your pets and can help with health questions, behavior, nutrition, and more. How can I help today?",
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makePulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );

    const a1 = makePulse(dot1, 0);
    const a2 = makePulse(dot2, 200);
    const a3 = makePulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={dotStyles.row}>
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, dotStyle(dot1)]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, dotStyle(dot2)]} />
      <Animated.View style={[dotStyles.dot, { backgroundColor: color }, dotStyle(dot3)]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

// ─── AI Vet Screen ────────────────────────────────────────────────────────────

export default function AIVetScreen() {
  const { colors } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [disclaimerCollapsed, setDisclaimerCollapsed] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load pets on mount
  useEffect(() => {
    petsService.list().then(setPets).catch(() => {});
  }, []);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;

  const send = useCallback(async (overrideText?: string) => {
    const msgText = (overrideText ?? input).trim();
    if (!msgText || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: msgText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      // Build the message history excluding the welcome message
      const history = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      // Prepend pet context if a pet is selected and this is the first user message
      const isFirstUserMsg = nextMessages.filter((m) => m.role === 'user').length === 1;
      if (isFirstUserMsg && selectedPet) {
        const context = `[Context: The user has a pet named ${selectedPet.name} (${selectedPet.species}${selectedPet.breed ? ', ' + selectedPet.breed : ''}${selectedPet.dob ? ', born ' + selectedPet.dob : ''}${selectedPet.medicalInfo ? ', medical info: ' + selectedPet.medicalInfo : ''}). Please keep this context in mind for all vet advice.]`;
        history.unshift({ role: 'user', text: context });
        history.splice(1, 0, { role: 'model', text: `Got it! I'll keep ${selectedPet.name} in mind as we talk.` });
      }

      const data = await api.post<{ reply: string }>('/ai/chat', { messages: history });
      setMessages((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: 'model', text: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, messages, sending, selectedPet]);

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === 'user';
    return (
      <View style={[msgStyles.row, isUser && msgStyles.rowUser]}>
        {!isUser && (
          <View style={[msgStyles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={msgStyles.avatarEmoji}>🩺</Text>
          </View>
        )}
        <View style={[
          msgStyles.bubble,
          isUser
            ? [msgStyles.bubbleUser, { backgroundColor: colors.primary }]
            : [msgStyles.bubbleAI, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}>
          <Text style={[msgStyles.bubbleText, { color: isUser ? '#FFFFFF' : colors.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🩺 AI Vet</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Ask anything about your pets</Text>
        </View>
        <View style={[styles.onlineBadge, { backgroundColor: colors.greenLight }]}>
          <View style={styles.onlineDot} />
          <Text style={[styles.onlineText, { color: colors.green }]}>Online</Text>
        </View>
      </View>

      {/* Pet selector */}
      {pets.length > 0 && (
        <View style={[styles.petSelectorWrap, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petSelectorContent}
          >
            <TouchableOpacity
              style={[
                styles.petChip,
                { backgroundColor: colors.surface2 },
                selectedPetId === null && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedPetId(null)}
              activeOpacity={0.75}
            >
              <Text style={[styles.petChipText, { color: selectedPetId === null ? colors.primary : colors.textSecondary }]}>
                All Pets
              </Text>
            </TouchableOpacity>
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petChip,
                  { backgroundColor: colors.surface2 },
                  selectedPetId === pet.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedPetId(pet.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.petChipEmoji}>
                  {pet.species === 'DOG' ? '🐶' : pet.species === 'CAT' ? '🐱' : pet.species === 'BIRD' ? '🐦' : pet.species === 'RABBIT' ? '🐰' : '🐾'}
                </Text>
                <Text style={[styles.petChipText, { color: selectedPetId === pet.id ? colors.primary : colors.textSecondary }]}>
                  {pet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Disclaimer */}
      {!disclaimerCollapsed && (
        <TouchableOpacity
          style={[styles.disclaimer, { backgroundColor: colors.orangeLight, borderColor: colors.orange }]}
          onPress={() => setDisclaimerCollapsed(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.disclaimerText, { color: colors.orange }]}>
            ⚠️  AI advice is not a substitute for professional veterinary care. Tap to dismiss.
          </Text>
        </TouchableOpacity>
      )}

      {/* Chat list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          sending ? (
            <View style={msgStyles.row}>
              <View style={[msgStyles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={msgStyles.avatarEmoji}>🩺</Text>
              </View>
              <View style={[msgStyles.bubble, msgStyles.bubbleAI, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TypingDots color={colors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text }]}
            placeholder="Ask about your pet's health…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
            maxLength={600}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const msgStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  rowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarEmoji: { fontSize: 15 },
  bubble: {
    maxWidth: '78%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleAI: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
  onlineText: { fontSize: 12, fontWeight: '600' },

  petSelectorWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  petSelectorContent: { paddingHorizontal: 16, gap: 8 },
  petChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  petChipEmoji: { fontSize: 14 },
  petChipText: { fontSize: 13, fontWeight: '600' },

  disclaimer: {
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disclaimerText: { fontSize: 12, fontWeight: '500', lineHeight: 17 },

  messageList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexGrow: 1 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: -2 },
});
