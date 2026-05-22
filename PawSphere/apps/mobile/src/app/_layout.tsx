import '../global.css';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useSegments, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../lib/i18n';
import { useAuthStore } from '../store/authStore';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const ONBOARDED_KEY = '@pawsphere_onboarded';

// ─── Session + Onboarding Guard ──────────────────────────────────────────────

function SessionGuard() {
  const { user, initializeSession } = useAuthStore();
  const segments = useSegments();
  const [initialized, setInitialized] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    initializeSession().finally(async () => {
      // If a session was found, stamp the onboarding key so that reinstalls
      // or storage clears never show onboarding to existing users again.
      const { user: u } = useAuthStore.getState();
      if (u) await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
      setInitialized(true);
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => {});
      }
    });
  }, []);

  // Re-check onboarding flag whenever the top-level segment changes so that
  // navigating away from /onboarding after writing the flag doesn't bounce back.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setHasOnboarded(!!v));
  }, [segments[0]]);

  if (!initialized || hasOnboarded === null) return null;

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === 'onboarding';
  const inTabsGroup = segments[0] === '(tabs)';

  // Authenticated users are always treated as onboarded — prevents existing
  // accounts from seeing onboarding after app reinstall or storage clear.
  const effectivelyOnboarded = hasOnboarded || !!user;

  if (!effectivelyOnboarded && !inOnboarding) return <Redirect href="/onboarding" />;
  if (effectivelyOnboarded && !user && !inAuthGroup) return <Redirect href="/(auth)/login" />;
  // Redirect authenticated users to tabs from anywhere except tabs itself —
  // this covers the root `/` that web lands on after an OAuth redirect.
  if (effectivelyOnboarded && user && !inTabsGroup) return <Redirect href="/(tabs)" />;
  return null;
}

// ─── Themed Stack (must live inside ThemeProvider) ───────────────────────────

function ThemedApp() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style={colors.statusBar} backgroundColor={colors.surface} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <SessionGuard />
    </>
  );
}

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
