import {
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDED_KEY = '@pawsphere_onboarded';

interface OnboardingPage {
  key: string;
  emoji: string;
  headline: string;
  subtitle: string;
}

const PAGES: OnboardingPage[] = [
  {
    key: 'welcome',
    emoji: '🐾',
    headline: 'Welcome to PawSphere',
    subtitle: 'Your complete pet care companion, built for UAE pet owners',
  },
  {
    key: 'health',
    emoji: '🩺',
    headline: 'Smart Health Tracking',
    subtitle:
      'Track vaccinations, medications, vet visits and get AI-powered reminders',
  },
  {
    key: 'community',
    emoji: '🌟',
    headline: 'Community & Care',
    subtitle:
      'Connect with pet owners, find sitters, and discover top vets near you',
  },
];

function OnboardingItem({
  item,
  width,
}: {
  item: OnboardingPage;
  width: number;
}) {
  return (
    <View style={[styles.page, { width }]}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  // Ref keeps the latest index without stale-closure issues in callbacks
  const currentIndexRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        setCurrentIndex(idx);
        currentIndexRef.current = idx;
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    router.replace('/(auth)/login');
  }, []);

  // Use scrollToOffset so it works on both native and web
  const handleNext = useCallback(() => {
    const next = currentIndexRef.current + 1;
    if (next < PAGES.length) {
      flatListRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }
  }, [width]);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    router.replace('/(auth)/login');
  }, []);

  const isLastPage = currentIndex === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Skip button */}
      {!isLastPage && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pages */}
      <Animated.FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <OnboardingItem item={item} width={width} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
      />

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Page dots */}
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Action button */}
        {isLastPage ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9F0F0',
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 4,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636366',
  },

  // Page
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 32,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 36,
    textAlign: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#636366',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    maxWidth: 300,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    alignItems: 'center',
    gap: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8A0A0',
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
