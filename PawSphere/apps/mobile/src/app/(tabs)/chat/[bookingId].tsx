import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../../../lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; email: string };
}

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: 'Chat', headerShown: true });

    let socket: Socket;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const userId = data.session?.user?.id ?? null;
      setCurrentUserId(userId);

      if (!token) return;

      socket = io(`${API_BASE}/chat`, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join', bookingId);
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('history', (history: ChatMessage[]) => {
        setMessages(history);
        scrollToBottom();
      });

      socket.on('message', (msg: ChatMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      });

      socket.on('error', (err: { message: string }) => {
        console.warn('Socket error:', err.message);
      });
    })();

    return () => {
      socketRef.current?.emit('leave', bookingId);
      socketRef.current?.disconnect();
    };
  }, [bookingId, scrollToBottom, navigation]);

  const sendMessage = () => {
    const content = input.trim();
    if (!content || !socketRef.current?.connected) return;

    socketRef.current.emit('message', { bookingId, content });
    setInput('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
        {!isMine && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.sender.email[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {new Date(item.createdAt).toLocaleTimeString('en-AE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {!connected && (
          <View style={styles.connectingBar}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.connectingText}>Connecting…</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            connected ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Say hello! 👋</Text>
              </View>
            ) : null
          }
          onContentSizeChange={scrollToBottom}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor="#AEAEB2"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || !connected) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || !connected}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  flex: { flex: 1 },

  connectingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#AEAEB2',
  },
  connectingText: { fontSize: 12, color: '#FFFFFF', fontWeight: '500' },

  messageList: { padding: 16, gap: 12, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 14, color: '#AEAEB2' },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  bubbleRowMine: { flexDirection: 'row-reverse' },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FAE0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#E8A0A0' },

  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  bubbleMine: {
    backgroundColor: '#F4C2C2',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  bubbleText: { fontSize: 15, color: '#1C1C1E', lineHeight: 21 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#AEAEB2', alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F8F8F8',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1C1C1E',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4C2C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#F2F2F2' },
  sendIcon: { fontSize: 16, color: '#FFFFFF' },
});
