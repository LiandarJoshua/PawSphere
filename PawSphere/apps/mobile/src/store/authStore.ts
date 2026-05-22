import { create } from 'zustand';
import { I18nManager } from 'react-native';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signInWithOAuth, type OAuthProvider } from '../lib/oauth';
import i18n from '../lib/i18n';

export type AppLanguage = 'en' | 'ar';

export interface ProfileUpdates {
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  profileAvatarUrl: string | null;
  language: AppLanguage;
  isLoading: boolean;
  error: string | null;
  needsEmailConfirmation: boolean;

  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
  setLanguage: (lang: AppLanguage) => void;
  verifyEmail: (email: string, token: string) => Promise<void>;
  clearError: () => void;
  clearNeedsEmailConfirmation: () => void;
  refreshAvatarUrl: () => Promise<void>;
}

async function fetchAvatarUrl(userId: string): Promise<string | null> {
  try {
    const BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const { getSession } = supabase.auth;
    const { data } = await getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${BASE}/users/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const json = await res.json() as { avatarUrl?: string | null };
    return json.avatarUrl ?? null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profileAvatarUrl: null,
  language: 'en',
  isLoading: false,
  error: null,
  needsEmailConfirmation: false,

  initializeSession: async () => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('session-timeout')), 5000),
      );
      const { data } = await Promise.race([supabase.auth.getSession(), timeout]);
      if (data.session) {
        set({ user: data.session.user, session: data.session });
        fetchAvatarUrl(data.session.user.id).then((url) => set({ profileAvatarUrl: url }));
      }
      // If no session found, leave state as-is — onAuthStateChange will fire
      // if an OAuth code exchange completes after this point.
    } catch {
      // Timed out or network error — stay unauthenticated, do not sign out
      // as that would cancel an in-flight OAuth code exchange.
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session: session ?? null });
      if (session?.user) {
        fetchAvatarUrl(session.user.id).then((url) => set({ profileAvatarUrl: url }));
      } else {
        set({ profileAvatarUrl: null });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: 'Invalid email or password.' });
      return;
    }
    set({ isLoading: false, user: data.user, session: data.session });
  },

  register: async (email, password, phone) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone: phone ?? null, language: get().language } },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    // session is null when Supabase email confirmation is required
    if (data.session) {
      set({ isLoading: false, user: data.user ?? null, session: data.session });
    } else {
      set({ isLoading: false, needsEmailConfirmation: true });
    }
  },

  loginWithOAuth: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithOAuth(provider);
      // Session is set automatically via onAuthStateChange after exchange
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg !== 'Sign-in cancelled') {
        set({ error: msg || 'OAuth sign-in failed. Please try again.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profileAvatarUrl: null });
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    const metadata: Record<string, string | null> = {};
    if (updates.displayName !== undefined) metadata.display_name = updates.displayName;
    if (updates.avatarUrl !== undefined) metadata.avatar_url = updates.avatarUrl;
    if (updates.phone !== undefined) metadata.phone = updates.phone ?? null;

    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({ isLoading: false, user: data.user });
    const id = get().user?.id;
    if (id) fetchAvatarUrl(id).then((url) => set({ profileAvatarUrl: url }));
  },

  refreshAvatarUrl: async () => {
    const id = get().user?.id;
    if (!id) return;
    const url = await fetchAvatarUrl(id);
    set({ profileAvatarUrl: url });
  },

  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    // Apply RTL layout — takes effect immediately for text, full RTL on next reload
    I18nManager.allowRTL(lang === 'ar');
    I18nManager.forceRTL(lang === 'ar');
    set({ language: lang });
  },

  verifyEmail: async (email, token) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({
      isLoading: false,
      needsEmailConfirmation: false,
      user: data.user ?? null,
      session: data.session ?? null,
    });
  },

  clearError: () => set({ error: null }),
  clearNeedsEmailConfirmation: () => set({ needsEmailConfirmation: false }),
}));
