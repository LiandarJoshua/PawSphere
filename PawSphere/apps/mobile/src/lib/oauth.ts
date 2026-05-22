import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// Required for iOS — completes the auth session if the app is re-opened mid-flow
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  if (Platform.OS === 'web') {
    // On web Supabase handles the redirect and session exchange automatically
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: origin + '/' },
    });
    if (error) throw new Error(error.message);
    return;
  }

  // Native: open the OAuth URL in a secure in-app browser, then exchange the code
  const redirectUrl = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // we open the browser ourselves below
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success') {
    // Exchange the PKCE code for a session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (sessionError) throw new Error(sessionError.message);
  } else if (result.type === 'cancel') {
    throw new Error('Sign-in cancelled');
  }
}
