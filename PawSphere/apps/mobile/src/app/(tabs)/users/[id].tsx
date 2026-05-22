import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../theme/ThemeContext';

type PostCategory = 'COMMUNITY' | 'MISSING_PET' | 'MARKETPLACE';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isPublic: boolean;
  isFollowing: boolean;
  _count: { posts: number; followers: number; following: number };
}

interface Post {
  id: string;
  category: PostCategory;
  content: string;
  likes: number;
  createdAt: string;
  imageUrls?: string[] | null;
}

const CAT_EMOJI: Record<PostCategory, string> = {
  COMMUNITY: '💬',
  MISSING_PET: '🚨',
  MARKETPLACE: '🛍️',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function displayName(profile: UserProfile): string {
  if (profile.displayName?.trim()) return profile.displayName.trim();
  return profile.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initial(profile: UserProfile): string {
  return (profile.displayName?.trim() || profile.email)[0].toUpperCase();
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMe = me?.id === id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, postsData] = await Promise.all([
        api.get<UserProfile>(`/users/${id}`),
        api.get<Post[]>(`/users/${id}/posts`),
      ]);
      setProfile(profileData);
      setPosts(postsData);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleFollow() {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.delete(`/users/${id}/follow`);
        setProfile((p) => p ? { ...p, isFollowing: false, _count: { ...p._count, followers: p._count.followers - 1 } } : p);
      } else {
        await api.post(`/users/${id}/follow`, {});
        setProfile((p) => p ? { ...p, isFollowing: true, _count: { ...p._count, followers: p._count.followers + 1 } } : p);
      }
    } catch { /* silent */ } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.backRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.backRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>🔒</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>{error ?? 'Profile unavailable'}</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>This profile is private or doesn't exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <View style={styles.backRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface2 }]} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial(profile)}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{displayName(profile)}</Text>
          {profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{profile._count.posts}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Posts</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{profile._count.followers}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Followers</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{profile._count.following}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Following</Text>
            </View>
          </View>

          {/* Follow + Message */}
          {!isMe && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  profile.isFollowing
                    ? { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }
                    : { backgroundColor: colors.primary },
                ]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.8}
              >
                {followLoading
                  ? <ActivityIndicator size="small" color={profile.isFollowing ? colors.text : '#FFF'} />
                  : <Text style={[styles.followBtnText, { color: profile.isFollowing ? colors.text : '#FFF' }]}>
                      {profile.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.messageBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => router.push(`/(tabs)/messages/${id}?name=${encodeURIComponent(displayName(profile))}` as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.messageBtnText, { color: colors.text }]}>✉️  Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Posts */}
        <View style={styles.postsSection}>
          <Text style={[styles.postsSectionTitle, { color: colors.text }]}>Posts</Text>

          {posts.length === 0 ? (
            <View style={[styles.emptyPosts, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet</Text>
            </View>
          ) : (
            posts.map((post) => {
              const firstImage = post.imageUrls?.[0];
              return (
                <View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {firstImage && (
                    <Image source={{ uri: firstImage }} style={styles.postThumb} resizeMode="contain" />
                  )}
                  <View style={styles.postBody}>
                    <View style={styles.postTop}>
                      <View style={[styles.catPill, { backgroundColor: isDark ? colors.surface3 : '#F0EAFF' }]}>
                        <Text style={styles.catPillText}>{CAT_EMOJI[post.category]}</Text>
                      </View>
                      <Text style={[styles.postTime, { color: colors.textTertiary }]}>{timeAgo(post.createdAt)} ago</Text>
                    </View>
                    <Text style={[styles.postContent, { color: colors.text }]} numberOfLines={3}>{post.content}</Text>
                    <Text style={[styles.postLikes, { color: colors.textTertiary }]}>♥ {post.likes}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  backRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, fontWeight: '600', marginTop: -1 },

  profileCard: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 20,
    borderRadius: 24, padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },

  avatarWrap: { marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700' },

  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginBottom: 6, textAlign: 'center' },
  bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' },
  statItem: { flex: 1, minWidth: 80, alignItems: 'center', paddingHorizontal: 8 },
  statNum: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 36 },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  followBtn: {
    flex: 1, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  followBtnText: { fontSize: 15, fontWeight: '700' },
  messageBtn: {
    flex: 1, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  messageBtnText: { fontSize: 14, fontWeight: '600' },

  postsSection: { paddingHorizontal: 16, paddingBottom: 32 },
  postsSectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },

  emptyPosts: {
    borderRadius: 20, padding: 32, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  postCard: {
    borderRadius: 18, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  postThumb: { width: '100%', height: 200, backgroundColor: 'rgba(0,0,0,0.04)' },
  postBody: { padding: 14 },
  postTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  catPill: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  catPillText: { fontSize: 13 },
  postTime: { fontSize: 12, fontWeight: '500' },
  postContent: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  postLikes: { fontSize: 12, fontWeight: '500' },

  errorEmoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  errorSub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
