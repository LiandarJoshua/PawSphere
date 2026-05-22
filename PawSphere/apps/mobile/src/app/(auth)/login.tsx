import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { InputField } from '../../components/ui/InputField';
import { LanguageToggle } from '../../components/ui/LanguageToggle';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, loginWithOAuth, setLanguage, language, isLoading, error, clearError } = useAuthStore();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider);
    await loginWithOAuth(provider);
    setOauthLoading(null);
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const isRTL = language === 'ar';

  const isFormReady =
    /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 8;

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'At least 8 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    clearError();
    if (!validate()) return;
    await login(email.trim(), password);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language toggle */}
        <View style={[styles.langRow, isRTL && styles.rowReverse]}>
          <LanguageToggle current={language} onChange={setLanguage} />
        </View>

        {/* Brand header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🐾</Text>
          </View>
          <Text style={[styles.appName, { textAlign: isRTL ? 'right' : 'center' }]}>
            {t('common.appName')}
          </Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'center' }]}>
            {t('auth.welcomeSubtitle')}
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <InputField
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            error={fieldErrors.email}
            isRTL={isRTL}
          />

          <View style={{ height: 16 }} />

          <InputField
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            isPassword
            error={fieldErrors.password}
            isRTL={isRTL}
          />

          <TouchableOpacity style={[styles.forgotRow, isRTL && styles.rowReverse]} activeOpacity={0.7}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Sign In button */}
        <TouchableOpacity
          style={[styles.primaryBtn, !isFormReady && styles.primaryBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading || !isFormReady}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t('auth.loginButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign In */}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => handleOAuth('google')}
          disabled={isLoading || oauthLoading !== null}
          activeOpacity={0.8}
        >
          {oauthLoading === 'google' ? (
            <ActivityIndicator color="#1C1C1E" size="small" />
          ) : (
            <>
              <Text style={styles.socialBtnIcon}>G</Text>
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>


        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  langRow: { paddingTop: 16, alignItems: 'flex-end' },
  rowReverse: { flexDirection: 'row-reverse' },

  header: { alignItems: 'center', marginTop: 36, marginBottom: 32 },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#FAE0E0',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#F4C2C2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 30, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#636366', marginTop: 6 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },

  forgotRow: { alignItems: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: '#F4C2C2', fontWeight: '500' },

  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorBannerText: { fontSize: 13, color: '#FF3B30', textAlign: 'center' },

  primaryBtn: {
    height: 54,
    borderRadius: 17,
    backgroundColor: '#E8A0A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#E8A0A0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: '#F4C2C2',
    shadowOpacity: 0.12,
    elevation: 1,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.1 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#AEAEB2' },

  socialBtn: {
    height: 54,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    gap: 10,
  },
  socialBtnIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4', width: 22, textAlign: 'center' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: '#636366' },
  footerLink: { fontSize: 14, color: '#F4C2C2', fontWeight: '600' },
});
