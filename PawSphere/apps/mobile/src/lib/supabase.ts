import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill WebSocket for Supabase during SSR (Node.js 20 has no native WS)
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = class FakeWebSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3;
    close() {} send() {} addEventListener() {} removeEventListener() {}
    dispatchEvent() { return false; }
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// True only in an actual browser — false during SSR (Node.js has no localStorage)
const isBrowser =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined';

const webStorage = {
  getItem: (key: string) => Promise.resolve(isBrowser ? localStorage.getItem(key) : null),
  setItem: (key: string, value: string) =>
    Promise.resolve(isBrowser ? localStorage.setItem(key, value) : undefined),
  removeItem: (key: string) =>
    Promise.resolve(isBrowser ? localStorage.removeItem(key) : undefined),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowser ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isBrowser,
  },
});
