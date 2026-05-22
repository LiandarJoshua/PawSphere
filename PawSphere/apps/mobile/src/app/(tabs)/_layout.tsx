import { Text, View, Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

function TabIcon({
  emoji,
  focused,
  pillColor,
}: {
  emoji: string;
  focused: boolean;
  pillColor: string;
}) {
  return (
    <View style={[styles.pill, focused && { backgroundColor: pillColor }]}>
      <Text style={[styles.pillEmoji, { opacity: focused ? 1 : 0.45 }]}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === 'web';
  const tabBarHeight = isWeb ? 64 : Platform.OS === 'ios' ? 84 : 56 + insets.bottom;
  const tabBarPaddingBottom = isWeb ? 8 : Platform.OS === 'ios' ? 24 : insets.bottom + 4;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.tabBarBorder,
          height: tabBarHeight,
          paddingTop: isWeb ? 6 : 8,
          paddingBottom: tabBarPaddingBottom,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
            },
            android: { elevation: 10 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: -2,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: colors.text, fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: t('tabs.discovery'),
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />
      <Tabs.Screen
        name="vets"
        options={{
          title: 'Vets',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏥" focused={focused} pillColor="#EDF5FF" />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t('tabs.alerts'),
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💬" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-vet"
        options={{
          title: 'AI Vet',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🩺" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✉️" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />
      <Tabs.Screen
        name="sitters"
        options={{
          title: 'Sitters',
          tabBarLabel: 'Sitters',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🐶" focused={focused} pillColor={colors.primaryLight} />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="chat/[bookingId]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pets/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pets/[id]/health" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pets/add" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="sitters/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="sitters/register" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="messages/[userId]" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="users/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="users/search" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pets/[id]/activity" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="pets/[id]/analytics" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="household/members" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="admin/index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="provider-dashboard/index" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 17 },
});
