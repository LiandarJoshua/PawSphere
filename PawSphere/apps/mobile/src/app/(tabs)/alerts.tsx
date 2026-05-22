import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Pressable, Modal,
  Alert, Platform, KeyboardAvoidingView, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { commentsService, type Comment } from '../../services/comments';
import { useTheme } from '../../theme/ThemeContext';

type PostCategory = 'COMMUNITY' | 'MISSING_PET' | 'MARKETPLACE';

interface Post {
  id: string;
  category: PostCategory;
  content: string;
  petName?: string | null;
  location?: string | null;
  contactInfo?: string | null;
  itemName?: string | null;
  price?: number | null;
  imageUrls?: string[] | null;
  likes: number;
  isLiked: boolean;
  commentCount?: number;
  createdAt: string;
  author: { id: string; email: string; displayName?: string | null; avatarUrl?: string | null; isPublic?: boolean };
}

const TABS: Array<{ key: PostCategory; label: string; emoji: string; accent: string; hint: string }> = [
  { key: 'COMMUNITY',   label: 'Community',    emoji: '💬', accent: '#007AFF', hint: 'Share tips, photos and stories with other pet owners in your area.' },
  { key: 'MISSING_PET', label: 'Missing Pets', emoji: '🚨', accent: '#FF3B30', hint: 'Post a lost or found pet alert so the community can help reunite them.' },
  { key: 'MARKETPLACE', label: 'Marketplace',  emoji: '🛍️', accent: '#34C759', hint: 'Buy and sell pet supplies, accessories and equipment locally.' },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function authorLabel(author: { email: string; displayName?: string | null }): string {
  if (author.displayName?.trim()) return author.displayName.trim();
  return author.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function authorInitial(author: { email: string; displayName?: string | null }): string {
  if (author.displayName?.trim()) return author.displayName.trim()[0].toUpperCase();
  return author.email[0].toUpperCase();
}

// ─── Image picker helper ──────────────────────────────────────────────────────

async function pickAndUploadImages(existing: string[]): Promise<string[]> {
  if (existing.length >= 4) {
    Alert.alert('Max 4 images per post');
    return existing;
  }

  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files: File[] = Array.from(e.target.files ?? []).slice(0, 4 - existing.length) as File[];
        if (!files.length) return resolve(existing);
        try {
          const urls = await Promise.all(files.map(async (file) => {
            const path = `post-images/${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true, contentType: file.type });
            if (error) throw error;
            return supabase.storage.from('post-images').getPublicUrl(data.path).data.publicUrl;
          }));
          resolve([...existing, ...urls].slice(0, 4));
        } catch {
          Alert.alert('Upload failed', 'Make sure the "post-images" bucket exists in Supabase Storage.');
          resolve(existing);
        }
      };
      input.click();
    });
  }

  // Native
  let ImagePicker: any;
  try {
    ImagePicker = require('expo-image-picker');
  } catch {
    Alert.alert('Not available', 'Install expo-image-picker: npx expo install expo-image-picker');
    return existing;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Allow photo access to attach images.');
    return existing;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 4 - existing.length,
    quality: 0.8,
  });

  if (result.canceled) return existing;

  try {
    const urls = await Promise.all(result.assets.map(async (asset: any) => {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `post-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('post-images').upload(path, blob, {
        contentType: asset.mimeType ?? `image/${ext}`,
        upsert: true,
      });
      if (error) throw error;
      return supabase.storage.from('post-images').getPublicUrl(data.path).data.publicUrl;
    }));
    return [...existing, ...urls].slice(0, 4);
  } catch {
    Alert.alert('Upload failed', 'Make sure the "post-images" bucket exists in Supabase Storage.');
    return existing;
  }
}

// ─── Comments Sheet ────────────────────────────────────────────────────────────

function CommentsSheet({ post, visible, onClose, currentUserId }: {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const { colors } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadComments = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const data = await commentsService.list(post.id);
      setComments(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [post]);

  // Load whenever visible + post changes
  useEffect(() => {
    if (visible && post) {
      loadComments();
    } else {
      setComments([]);
      setInputText('');
    }
  }, [visible, post, loadComments]);

  async function handleSend() {
    if (!inputText.trim() || !post || sending) return;
    setSending(true);
    const text = inputText.trim();
    setInputText('');
    try {
      const newComment = await commentsService.create(post.id, text);
      setComments((prev) => [...prev, newComment]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to post comment.');
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  function handleDelete(commentId: string) {
    const confirm = () => {
      commentsService.delete(commentId)
        .then(() => setComments((prev) => prev.filter((c) => c.id !== commentId)))
        .catch(() => Alert.alert('Error', 'Failed to delete comment.'));
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this comment?')) confirm();
    } else {
      Alert.alert('Delete comment?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirm },
      ]);
    }
  }

  function renderComment({ item }: { item: Comment }) {
    const isOwn = item.author.id === currentUserId;
    return (
      <View style={[csStyles.commentRow, { borderBottomColor: colors.separator }]}>
        <View style={[csStyles.commentAvatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[csStyles.commentAvatarText, { color: colors.primary }]}>
            {authorInitial(item.author)}
          </Text>
        </View>
        <View style={csStyles.commentBody}>
          <View style={csStyles.commentMeta}>
            <Text style={[csStyles.commentAuthor, { color: colors.text }]}>
              {authorLabel(item.author)}
            </Text>
            <Text style={[csStyles.commentTime, { color: colors.textTertiary }]}>
              {timeAgo(item.createdAt)} ago
            </Text>
          </View>
          <Text style={[csStyles.commentContent, { color: colors.textSecondary }]}>
            {item.content}
          </Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={() => handleDelete(item.id)} activeOpacity={0.7}>
            <Text style={csStyles.commentDelete}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!post) return null;

  const snippet = post.content.length > 60 ? post.content.slice(0, 60) + '…' : post.content;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={csStyles.backdrop} onPress={onClose} />
        <View style={[csStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[csStyles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[csStyles.sheetHeader, { borderBottomColor: colors.separator }]}>
            <View style={csStyles.sheetHeaderInfo}>
              <Text style={[csStyles.sheetTitle, { color: colors.text }]}>Comments</Text>
              <Text style={[csStyles.sheetSnippet, { color: colors.textSecondary }]} numberOfLines={1}>
                {authorLabel(post.author)}: {snippet}
              </Text>
            </View>
            <TouchableOpacity style={[csStyles.closeBtn, { backgroundColor: colors.surface2 }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[csStyles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Comment list */}
          {loading ? (
            <View style={csStyles.centered}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={csStyles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={csStyles.emptyWrap}>
                  <Text style={csStyles.emptyEmoji}>💬</Text>
                  <Text style={[csStyles.emptyText, { color: colors.textSecondary }]}>
                    No comments yet. Be the first!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input bar */}
          <View style={[csStyles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
            <TextInput
              style={[csStyles.input, { backgroundColor: colors.surface2, color: colors.text }]}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[csStyles.sendBtn, { backgroundColor: colors.primary }, (!inputText.trim() || sending) && csStyles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={csStyles.sendBtnText}>↑</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const csStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 10, maxHeight: '85%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderInfo: { flex: 1, marginRight: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sheetSnippet: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  listContent: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 },
  commentRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  commentAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { fontSize: 14, fontWeight: '700' },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  commentTime: { fontSize: 11, fontWeight: '500' },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentDelete: { fontSize: 11, color: '#FF3B30', fontWeight: '700', paddingTop: 2 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: -2 },
});

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, onLike, onDelete, onComment }: {
  post: Post; currentUserId: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onComment: (post: Post) => void;
}) {
  const { colors, isDark } = useTheme();
  const tab = TABS.find((t) => t.key === post.category)!;
  const isOwn = post.author.id === currentUserId;
  const images = post.imageUrls?.filter(Boolean) ?? [];

  // Dark mode aware category colors
  const catBgMap: Record<PostCategory, string> = {
    COMMUNITY: isDark ? colors.blueLight : '#EDF5FF',
    MISSING_PET: isDark ? colors.redLight : '#FFF0F0',
    MARKETPLACE: isDark ? colors.greenLight : '#EDFFF3',
  };
  const catBg = catBgMap[post.category];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={[styles.avatar, { backgroundColor: catBg }]}
          onPress={() => router.push(`/(tabs)/users/${post.author.id}` as any)}
          activeOpacity={0.7}
        >
          {post.author.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: tab.accent }]}>{authorInitial(post.author)}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardMeta}
          onPress={() => router.push(`/(tabs)/users/${post.author.id}` as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardAuthor, { color: colors.text }]}>{authorLabel(post.author)}</Text>
          <Text style={[styles.cardTime, { color: colors.textTertiary }]}>{timeAgo(post.createdAt)} ago</Text>
        </TouchableOpacity>
        <View style={[styles.catBadge, { backgroundColor: catBg }]}>
          <Text style={styles.catBadgeEmoji}>{tab.emoji}</Text>
          <Text style={[styles.catBadgeText, { color: tab.accent }]}>{tab.label}</Text>
        </View>
      </View>

      {post.category === 'MISSING_PET' && post.petName && (
        <View style={[styles.alertBox, { backgroundColor: isDark ? colors.redLight : '#FFF5F5', borderColor: isDark ? colors.border : '#FFD0D0' }]}>
          <Text style={styles.alertBoxTitle}>🐾  {post.petName}</Text>
          {post.location && <Text style={[styles.alertBoxSub, { color: colors.textSecondary }]}>📍  Last seen: {post.location}</Text>}
        </View>
      )}

      {post.category === 'MARKETPLACE' && (post.itemName || post.price != null) && (
        <View style={styles.marketRow}>
          {post.itemName && <Text style={[styles.itemName, { color: colors.text }]}>{post.itemName}</Text>}
          {post.price != null && (
            <View style={[styles.priceBadge, { backgroundColor: isDark ? colors.greenLight : '#EDFFF3' }]}>
              <Text style={styles.priceText}>AED {post.price.toFixed(0)}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.cardContent, { color: colors.text }]}>{post.content}</Text>

      {/* Attached images */}
      {images.length === 1 && (
        <Image source={{ uri: images[0] }} style={styles.postImageFull} resizeMode="contain" />
      )}
      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow} contentContainerStyle={styles.imageRowContent}>
          {images.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.postImage} resizeMode="contain" />
          ))}
        </ScrollView>
      )}

      {post.category === 'MISSING_PET' && post.contactInfo && (
        <Text style={styles.contactInfo}>📞  {post.contactInfo}</Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.separator }]}>
        <TouchableOpacity style={styles.likeBtn} onPress={() => onLike(post.id)} activeOpacity={0.7}>
          <Text style={[styles.likeIcon, post.isLiked && styles.likeIconActive]}>
            {post.isLiked ? '♥' : '♡'}
          </Text>
          <Text style={[styles.likeCount, { color: post.isLiked ? '#FF3B30' : colors.textSecondary }]}>
            {post.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.commentBtn} onPress={() => onComment(post)} activeOpacity={0.7}>
          <Text style={styles.commentIcon}>💬</Text>
          <Text style={[styles.commentCount, { color: colors.textSecondary }]}>{post.commentCount ?? 0}</Text>
        </TouchableOpacity>

        {!isOwn && (
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => router.push(`/(tabs)/messages/${post.author.id}?name=${encodeURIComponent(authorLabel(post.author))}` as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.msgBtnText}>✉️ Message</Text>
          </TouchableOpacity>
        )}
        {isOwn && (
          <TouchableOpacity onPress={() => onDelete(post.id)} activeOpacity={0.7}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

function ComposeModal({ visible, defaultCategory, onClose, onSubmit }: {
  visible: boolean; defaultCategory: PostCategory;
  onClose: () => void;
  onSubmit: (post: Omit<Post, 'id' | 'likes' | 'createdAt' | 'author'>) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [category, setCategory] = useState<PostCategory>(defaultCategory);
  const [content, setContent] = useState('');
  const [petName, setPetName] = useState('');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  function reset() {
    setContent(''); setPetName(''); setLocation('');
    setContactInfo(''); setItemName(''); setPrice(''); setImages([]);
  }

  async function handlePickImages() {
    setUploadingImages(true);
    try {
      const urls = await pickAndUploadImages(images);
      setImages(urls);
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        category,
        content: content.trim(),
        petName: petName.trim() || null,
        location: location.trim() || null,
        contactInfo: contactInfo.trim() || null,
        itemName: itemName.trim() || null,
        price: price ? parseFloat(price) : null,
        imageUrls: images.length > 0 ? images : null,
      });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const currentTab = TABS.find((t) => t.key === category)!;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New Post</Text>
            <TouchableOpacity style={[styles.sheetCloseBtn, { backgroundColor: colors.surface2 }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.sheetCloseText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPicker} contentContainerStyle={styles.catPickerContent}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.catChip,
                  { backgroundColor: colors.surface2, borderColor: 'transparent' },
                  category === t.key && { borderColor: t.accent },
                ]}
                onPress={() => setCategory(t.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.catChipEmoji}>{t.emoji}</Text>
                <Text style={[styles.catChipLabel, { color: colors.textSecondary }, category === t.key && { color: t.accent, fontWeight: '700' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {category === 'MISSING_PET' && (
              <>
                <TextInput style={[styles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]} placeholder="Pet name" placeholderTextColor={colors.textTertiary} value={petName} onChangeText={setPetName} />
                <TextInput style={[styles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]} placeholder="Last seen location" placeholderTextColor={colors.textTertiary} value={location} onChangeText={setLocation} />
                <TextInput style={[styles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]} placeholder="Contact number" placeholderTextColor={colors.textTertiary} value={contactInfo} onChangeText={setContactInfo} keyboardType="phone-pad" />
              </>
            )}
            {category === 'MARKETPLACE' && (
              <>
                <TextInput style={[styles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]} placeholder="Item name" placeholderTextColor={colors.textTertiary} value={itemName} onChangeText={setItemName} />
                <TextInput style={[styles.field, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]} placeholder="Price (AED)" placeholderTextColor={colors.textTertiary} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              </>
            )}

            <TextInput
              style={[styles.field, styles.fieldTextArea, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.border }]}
              placeholder={
                category === 'COMMUNITY' ? "What's on your mind?" :
                category === 'MISSING_PET' ? 'Describe your pet and when they went missing…' :
                'Describe your item…'
              }
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Image attachments */}
            <View style={styles.attachRow}>
              <TouchableOpacity
                style={[styles.attachBtn, { backgroundColor: colors.surface2, borderColor: colors.border }, (uploadingImages || images.length >= 4) && styles.attachBtnDisabled]}
                onPress={handlePickImages}
                disabled={uploadingImages || images.length >= 4}
                activeOpacity={0.75}
              >
                {uploadingImages
                  ? <ActivityIndicator size="small" color={colors.textSecondary} />
                  : <Text style={[styles.attachBtnText, { color: colors.textSecondary }]}>📎  Attach Photos {images.length > 0 ? `(${images.length}/4)` : ''}</Text>
                }
              </TouchableOpacity>
            </View>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow} contentContainerStyle={styles.previewRowContent}>
                {images.map((url, i) => (
                  <View key={i} style={styles.previewWrap}>
                    <Image source={{ uri: url }} style={styles.previewImg} resizeMode="cover" />
                    <TouchableOpacity style={styles.previewRemove} onPress={() => removeImage(i)}>
                      <Text style={styles.previewRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: currentTab.accent }, (!content.trim() || submitting) && styles.postBtnDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.postBtnText}>Post</Text>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { user } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<PostCategory>('COMMUNITY');
  const [posts, setPosts] = useState<Record<PostCategory, Post[]>>({
    COMMUNITY: [], MISSING_PET: [], MARKETPLACE: [],
  });
  const [loading, setLoading] = useState<Record<PostCategory, boolean>>({
    COMMUNITY: true, MISSING_PET: true, MARKETPLACE: true,
  });
  const [composeVisible, setComposeVisible] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);

  const load = useCallback(async (cat: PostCategory) => {
    setLoading((prev) => ({ ...prev, [cat]: true }));
    try {
      const data = await api.get<Post[]>(`/posts?category=${cat}`);
      setPosts((prev) => ({ ...prev, [cat]: data }));
    } catch {
      // silent
    } finally {
      setLoading((prev) => ({ ...prev, [cat]: false }));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load('COMMUNITY'); load('MISSING_PET'); load('MARKETPLACE');
  }, [load]));

  async function handleLike(id: string) {
    // Optimistic toggle
    setPosts((prev) => {
      const allCats = Object.keys(prev) as PostCategory[];
      const updated: typeof prev = { ...prev };
      for (const cat of allCats) {
        updated[cat] = prev[cat].map((p) => {
          if (p.id !== id) return p;
          return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
        });
      }
      return updated;
    });
    try {
      const updated = await api.post<Post>(`/posts/${id}/like`, {});
      // Reconcile with server truth
      setPosts((prev) => {
        const cat = updated.category;
        return { ...prev, [cat]: prev[cat].map((p) => p.id === id ? updated : p) };
      });
    } catch {
      // Revert on failure
      setPosts((prev) => {
        const allCats = Object.keys(prev) as PostCategory[];
        const reverted: typeof prev = { ...prev };
        for (const cat of allCats) {
          reverted[cat] = prev[cat].map((p) => {
            if (p.id !== id) return p;
            return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
          });
        }
        return reverted;
      });
    }
  }

  function handleDelete(id: string) {
    const confirm = () => {
      api.delete(`/posts/${id}`)
        .then(() => setPosts((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((p) => p.id !== id) })))
        .catch(() => {});
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this post?')) confirm();
    } else {
      Alert.alert('Delete post?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirm },
      ]);
    }
  }

  async function handleCreate(dto: any) {
    const newPost = await api.post<Post>('/posts', dto);
    setPosts((prev) => ({ ...prev, [newPost.category]: [newPost, ...prev[newPost.category]] }));
  }

  const currentPosts = posts[activeTab];
  const isLoading = loading[activeTab];
  const currentTabDef = TABS.find((t) => t.key === activeTab)!;

  // Dark mode aware tab colors
  const tabBgMap: Record<PostCategory, string> = {
    COMMUNITY: isDark ? colors.blueLight : '#EDF5FF',
    MISSING_PET: isDark ? colors.redLight : '#FFF0F0',
    MARKETPLACE: isDark ? colors.greenLight : '#EDFFF3',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Connect with pet owners</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.surface2 }]}
            onPress={() => router.push('/(tabs)/users/search' as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.searchBtnText, { color: colors.textSecondary }]}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.composeBtn, { backgroundColor: colors.text }]} onPress={() => setComposeVisible(true)} activeOpacity={0.8}>
            <Text style={[styles.composeBtnText, { color: colors.surface }]}>+ Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && { borderBottomColor: t.accent }]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{t.emoji}</Text>
              <Text style={[styles.tabLabel, { color: colors.textTertiary }, isActive && { color: t.accent, fontWeight: '700' }]}>
                {t.label}
              </Text>
              {posts[t.key].length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: tabBgMap[t.key] }]}>
                  <Text style={[styles.tabBadgeText, { color: t.accent }]}>{posts[t.key].length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab hint */}
      <View style={[styles.tabHintBar, { backgroundColor: colors.surface2 }]}>
        <Text style={[styles.tabHintText, { color: colors.textTertiary }]}>
          {TABS.find((t) => t.key === activeTab)?.hint}
        </Text>
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : currentPosts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>{currentTabDef.emoji}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No {currentTabDef.label} posts yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Be the first to share something!</Text>
          <TouchableOpacity
            style={[styles.emptyActionBtn, { backgroundColor: tabBgMap[currentTabDef.key] }]}
            onPress={() => setComposeVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.emptyActionText, { color: currentTabDef.accent }]}>Write a post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          {currentPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? ''}
              onLike={handleLike}
              onDelete={handleDelete}
              onComment={setActiveCommentsPost}
            />
          ))}
        </ScrollView>
      )}

      <ComposeModal
        visible={composeVisible}
        defaultCategory={activeTab}
        onClose={() => setComposeVisible(false)}
        onSubmit={handleCreate}
      />

      <CommentsSheet
        post={activeCommentsPost}
        visible={activeCommentsPost !== null}
        onClose={() => setActiveCommentsPost(null)}
        currentUserId={user?.id ?? ''}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 16 },
  composeBtn: {
    borderRadius: 100,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  composeBtnText: { fontSize: 14, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 13,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabEmoji: { fontSize: 13 },
  tabLabel: { fontSize: 12, fontWeight: '500' },
  tabBadge: { borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },
  tabHintBar: { paddingHorizontal: 16, paddingVertical: 8 },
  tabHintText: { fontSize: 12, lineHeight: 17 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  emptySub: { fontSize: 14, fontWeight: '500', marginBottom: 22, textAlign: 'center' },
  emptyActionBtn: { borderRadius: 100, paddingHorizontal: 24, paddingVertical: 11 },
  emptyActionText: { fontSize: 14, fontWeight: '700' },

  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 20, padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40, borderRadius: 14 },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardMeta: { flex: 1 },
  cardAuthor: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  cardTime: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  catBadgeEmoji: { fontSize: 11 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },

  alertBox: {
    borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  alertBoxTitle: { fontSize: 15, fontWeight: '700', color: '#FF3B30', marginBottom: 4 },
  alertBoxSub: { fontSize: 13, fontWeight: '500' },

  marketRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  itemName: { fontSize: 15, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  priceBadge: { borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  priceText: { fontSize: 14, fontWeight: '700', color: '#34C759' },

  cardContent: { fontSize: 15, lineHeight: 23, marginBottom: 10 },
  contactInfo: { fontSize: 13, color: '#007AFF', fontWeight: '600', marginBottom: 10 },

  imageRow: { marginBottom: 10, marginHorizontal: -4 },
  imageRowContent: { gap: 6, paddingHorizontal: 4 },
  postImage: { width: 140, height: 140, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)' },
  postImageFull: { width: '100%', height: 280, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 10 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeIcon: { fontSize: 16, color: '#AEAEB2' },
  likeIconActive: { color: '#FF3B30' },
  likeCount: { fontSize: 14, fontWeight: '600' },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentIcon: { fontSize: 15 },
  commentCount: { fontSize: 14, fontWeight: '600' },
  deleteText: { fontSize: 13, color: '#FF3B30', fontWeight: '700', marginLeft: 'auto' as any },
  msgBtn: { marginLeft: 'auto' as any, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  msgBtnText: { fontSize: 12, fontWeight: '600', opacity: 0.7 },

  // Compose modal
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 44, maxHeight: '92%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 12, fontWeight: '700' },

  catPicker: { marginBottom: 18 },
  catPickerContent: { gap: 8, paddingRight: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100,
    borderWidth: 1.5,
  },
  catChipEmoji: { fontSize: 14 },
  catChipLabel: { fontSize: 13, fontWeight: '600' },

  field: {
    borderRadius: 14,
    paddingHorizontal: 14, height: 48, fontSize: 15,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldTextArea: { height: 110, paddingTop: 14, textAlignVertical: 'top' },

  attachRow: { marginBottom: 10 },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 44,
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  attachBtnDisabled: { opacity: 0.4 },
  attachBtnText: { fontSize: 14, fontWeight: '600' },

  previewRow: { marginBottom: 12 },
  previewRowContent: { gap: 8 },
  previewWrap: { position: 'relative' },
  previewImg: { width: 80, height: 80, borderRadius: 12 },
  previewRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },
  previewRemoveText: { fontSize: 9, fontWeight: '900', color: '#FFF' },

  postBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
