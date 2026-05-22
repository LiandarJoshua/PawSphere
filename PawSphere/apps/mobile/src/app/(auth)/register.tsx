import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { InputField } from '../../components/ui/InputField';
import { LanguageToggle } from '../../components/ui/LanguageToggle';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register, loginWithOAuth, verifyEmail, setLanguage, language, isLoading, error, clearError, needsEmailConfirmation, clearNeedsEmailConfirmation } = useAuthStore();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [otp, setOtp] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider);
    await loginWithOAuth(provider);
    setOauthLoading(null);
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const isRTL = language === 'ar';

  const isFormReady =
    /\S+@\S+\.\S+/.test(email.trim()) &&
    password.length >= 8 &&
    confirm === password &&
    confirm.length > 0;

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'At least 8 characters';
    if (confirm !== password) errors.confirm = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    clearError();
    if (!validate()) return;
    await register(email.trim(), password, phone.trim() || undefined);
  }

  if (needsEmailConfirmation) {
    const handleVerify = async () => {
      if (otp.length !== 6) return;
      await verifyEmail(email.trim(), otp);
    };

    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.confirmContainer}>
          <View style={styles.confirmIconBox}>
            <Text style={styles.confirmIcon}>📬</Text>
          </View>
          <Text style={styles.confirmTitle}>Verify your email</Text>
          <Text style={styles.confirmBody}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>
          </Text>

          {/* OTP boxes — tap anywhere to focus the hidden input */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpRow}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  otp.length === i && styles.otpBoxActive,
                  otp.length > i && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpChar}>{otp[i] ?? ''}</Text>
              </View>
            ))}
          </TouchableOpacity>

          {/* Hidden text input that captures keystrokes */}
          <TextInput
            ref={otpInputRef}
            value={otp}
            onChangeText={(t) => { clearError(); setOtp(t.replace(/\D/g, '').slice(0, 6)); }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={styles.otpHiddenInput}
            caretHidden
          />

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24 }, otp.length < 6 && styles.primaryBtnDisabled]}
            onPress={handleVerify}
            disabled={isLoading || otp.length < 6}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify & Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => { clearNeedsEmailConfirmation(); clearError(); setOtp(''); }}
            activeOpacity={0.7}
          >
            <Text style={styles.confirmHint}>Use a different email? Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🐾</Text>
          </View>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'center' }]}>
            Create Account
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

          <View style={{ height: 16 }} />

          <InputField
            label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            placeholder={t('auth.passwordPlaceholder')}
            value={confirm}
            onChangeText={setConfirm}
            isPassword
            error={fieldErrors.confirm}
            isRTL={isRTL}
          />

          <View style={{ height: 16 }} />

          <InputField
            label={isRTL ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
            placeholder="+971 50 000 0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            isRTL={isRTL}
          />

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Create Account button */}
        <TouchableOpacity
          style={[styles.primaryBtn, !isFormReady && styles.primaryBtnDisabled]}
          onPress={handleRegister}
          disabled={isLoading || !isFormReady}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t('auth.registerButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Social sign-up */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

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
          <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
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

  header: { alignItems: 'center', marginTop: 28, marginBottom: 28 },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: '#FAE0E0',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F4C2C2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  logoEmoji: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#636366', marginTop: 6 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },

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

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: '#636366' },
  footerLink: { fontSize: 14, color: '#F4C2C2', fontWeight: '600' },

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

  // Email confirmation screen
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmIconBox: {
    width: 90,
    height: 90,
    backgroundColor: '#EDE9FE',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmIcon: { fontSize: 42 },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  confirmBody: {
    fontSize: 15,
    color: '#636366',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  confirmEmail: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  confirmHint: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 20,
    paddingHorizontal: 8,
  },

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    marginBottom: 4,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#E8A0A0',
    shadowColor: '#E8A0A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: '#E8A0A0',
    backgroundColor: '#FFF5F5',
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  otpHiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
