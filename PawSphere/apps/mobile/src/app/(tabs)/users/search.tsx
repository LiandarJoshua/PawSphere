import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '../../../lib/api';
import { useTheme } from '../../../theme/ThemeContext';

interface UserResult {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

function displayName(u: UserResult): string {
  if (u.displayName?.trim()) return u.displayName.trim();
  return u.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initial(u: UserResult): string {
  return (u.displayName?.trim() || u.email)[0].toUpperCase();
}

export default function UserSearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.get<UserResult[]>(`/users/search?q=${encodeURIComponent(q.trim())}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    if (!text.trim()) { setResults([]); setSearched(false); }
  }

  function renderItem({ item }: { item: UserResult }) {
    return (
      <TouchableOpacity
        style={[styles.resultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/(tabs)/users/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial(item)}</Text>
          </View>
        )}
        <View style={styles.resultBody}>
          <Text style={[styles.resultName, { color: colors.text }]}>{displayName(item)}</Text>
          {item.bio ? (
            <Text style={[styles.resultBio, { color: colors.textSecondary }]} numberOfLines={1}>{item.bio}</Text>
          ) : (
            <Text style={[styles.resultEmail, { color: colors.textTertiary }]}>{item.email}</Text>
          )}
        </View>
        <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface2, color: colors.text }]}
          placeholder="Search users…"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleChange}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.goBtn, { backgroundColor: colors.primary }, !query.trim() && { opacity: 0.4 }]}
          onPress={() => search(query)}
          disabled={!query.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.goBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searched ? (
              <View style={styles.centered}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No users found</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Try a different name or email.</Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Find Pet Owners</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Search by name or email to find other PawSphere users.</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, fontWeight: '600', marginTop: -1 },
  searchInput: {
    flex: 1, height: 40, borderRadius: 20,
    paddingHorizontal: 16, fontSize: 15,
  },
  goBtn: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  goBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  list: { padding: 16, gap: 10 },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '700' },
  resultBody: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  resultBio: { fontSize: 13, lineHeight: 18 },
  resultEmail: { fontSize: 12 },
  chevron: { fontSize: 20, fontWeight: '300' },

  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
