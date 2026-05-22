import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TextInputProps,
  StyleSheet,
  Platform,
} from 'react-native';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  isRTL?: boolean;
}

export function InputField({ label, error, isPassword, isRTL, style, ...props }: InputFieldProps) {
  const [visible, setVisible] = useState(false);
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>

      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, { textAlign, flex: 1 }]}
          secureTextEntry={isPassword && !visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#AEAEB2"
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setVisible((v) => !v)} style={styles.eyeButton} hitSlop={8}>
            <Text style={styles.eyeText}>{visible ? '🙈' : '👁'}</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={[styles.errorText, { textAlign }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636366',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    // Soft shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  eyeButton: {
    paddingLeft: 8,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
});
