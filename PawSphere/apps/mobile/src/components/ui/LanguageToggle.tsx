import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AppLanguage } from '../../store/authStore';

interface LanguageToggleProps {
  current: AppLanguage;
  onChange: (lang: AppLanguage) => void;
}

export function LanguageToggle({ current, onChange }: LanguageToggleProps) {
  return (
    <View style={styles.container}>
      {(['en', 'ar'] as AppLanguage[]).map((lang) => (
        <Pressable
          key={lang}
          onPress={() => onChange(lang)}
          style={[styles.pill, current === lang && styles.pillActive]}
        >
          <Text style={[styles.pillText, current === lang && styles.pillTextActive]}>
            {lang === 'en' ? 'EN' : 'ع'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    borderRadius: 50,
    padding: 3,
    alignSelf: 'center',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 50,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#AEAEB2',
  },
  pillTextActive: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
});
