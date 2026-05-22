import { View, ActivityIndicator } from 'react-native';

// Blank loading screen shown briefly while SessionGuard in _layout.tsx
// checks the Supabase session and redirects to (auth) or (tabs).
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <ActivityIndicator color="#F4C2C2" size="large" />
    </View>
  );
}
