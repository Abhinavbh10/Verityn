/**
 * Onboarding Intro Slides - Hero feature showcase
 * Shown on first app launch before category selection
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, useColorScheme, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IntroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  illustration: 'swipe' | 'personalize' | 'offline';
  color: string;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    id: '1',
    title: 'Swipe Through News',
    subtitle: 'Quick & Elegant',
    description: 'Swipe up to read the next story. Swipe down to go back. News reading made effortless.',
    icon: 'swap-vertical',
    illustration: 'swipe',
    color: '#2563EB',
  },
  {
    id: '2',
    title: 'Your Feed, Your Way',
    subtitle: 'Personalized',
    description: 'Choose your favorite topics and get news that matters to you. No noise, just relevance.',
    icon: 'heart',
    illustration: 'personalize',
    color: '#7C3AED',
  },
  {
    id: '3',
    title: 'Read Anywhere',
    subtitle: 'Works Offline',
    description: 'Save articles for later. Read them even without internet. Your news, always available.',
    icon: 'cloud-offline',
    illustration: 'offline',
    color: '#059669',
  },
];

// Illustration Components
const SwipeIllustration = ({ color }: { color: string }) => (
  <Svg width={200} height={280} viewBox="0 0 200 280">
    <Defs>
      <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
        <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
      </LinearGradient>
    </Defs>
    {/* Phone frame */}
    <Rect x="30" y="20" width="140" height="240" rx="20" fill="url(#cardGrad)" stroke={color} strokeWidth="2" />
    {/* Cards */}
    <Rect x="45" y="50" width="110" height="60" rx="8" fill="#fff" opacity="0.9" />
    <Rect x="45" y="120" width="110" height="60" rx="8" fill="#fff" opacity="0.6" />
    <Rect x="45" y="190" width="110" height="50" rx="8" fill="#fff" opacity="0.3" />
    {/* Swipe arrow */}
    <Path d="M100 280 L100 265 M90 275 L100 265 L110 275" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <Path d="M100 0 L100 15 M90 5 L100 15 L110 5" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </Svg>
);

const PersonalizeIllustration = ({ color }: { color: string }) => (
  <Svg width={200} height={280} viewBox="0 0 200 280">
    <Defs>
      <LinearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    {/* Grid of category cards */}
    <Rect x="20" y="40" width="70" height="70" rx="12" fill="url(#personGrad)" stroke={color} strokeWidth="2" />
    <Rect x="110" y="40" width="70" height="70" rx="12" fill="#fff" opacity="0.5" />
    <Rect x="20" y="130" width="70" height="70" rx="12" fill="#fff" opacity="0.5" />
    <Rect x="110" y="130" width="70" height="70" rx="12" fill="url(#personGrad)" stroke={color} strokeWidth="2" />
    {/* Check marks */}
    <Path d="M45 75 L55 85 L75 60" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M135 165 L145 175 L165 150" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Heart */}
    <Path d="M100 240 C80 220 60 240 60 260 C60 280 100 300 100 300 C100 300 140 280 140 260 C140 240 120 220 100 240" fill={color} opacity="0.3" />
  </Svg>
);

const OfflineIllustration = ({ color }: { color: string }) => (
  <Svg width={200} height={280} viewBox="0 0 200 280">
    <Defs>
      <LinearGradient id="offlineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
        <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
      </LinearGradient>
    </Defs>
    {/* Cloud with slash */}
    <Path d="M60 100 C40 100 30 120 40 140 C25 145 20 165 35 180 L165 180 C185 170 180 145 165 140 C175 115 155 95 130 100 C120 80 85 75 60 100" fill="url(#offlineGrad)" stroke={color} strokeWidth="2" />
    <Path d="M50 190 L150 90" stroke={color} strokeWidth="3" strokeLinecap="round" />
    {/* Saved articles */}
    <Rect x="50" y="200" width="100" height="20" rx="4" fill={color} opacity="0.3" />
    <Rect x="50" y="230" width="80" height="20" rx="4" fill={color} opacity="0.2" />
    {/* Bookmark */}
    <Path d="M85 45 L85 75 L100 65 L115 75 L115 45" fill={color} />
  </Svg>
);

interface OnboardingIntroProps {
  onComplete: () => void;
}

export default function OnboardingIntro({ onComplete }: OnboardingIntroProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const colors = {
    background: isDark ? '#0A0A0A' : '#FDFBF7',
    text: isDark ? '#FAFAFA' : '#1A1A1A',
    textMuted: isDark ? '#A1A1AA' : '#595959',
    surface: isDark ? '#18181B' : '#FFFFFF',
  };

  const handleNext = () => {
    if (currentIndex < INTRO_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: IntroSlide; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        {item.illustration === 'swipe' && <SwipeIllustration color={item.color} />}
        {item.illustration === 'personalize' && <PersonalizeIllustration color={item.color} />}
        {item.illustration === 'offline' && <OfflineIllustration color={item.color} />}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={[styles.badge, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon as any} size={18} color={item.color} />
          <Text style={[styles.badgeText, { color: item.color }]}>{item.subtitle}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {INTRO_SLIDES.map((_, index) => {
        const inputRange = [
          (index - 1) * SCREEN_WIDTH,
          index * SCREEN_WIDTH,
          (index + 1) * SCREEN_WIDTH,
        ];
        
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: INTRO_SLIDES[currentIndex].color,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === INTRO_SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={INTRO_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Pagination */}
      {renderPagination()}

      {/* Next/Get Started Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: INTRO_SLIDES[currentIndex].color }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons 
            name={isLastSlide ? 'arrow-forward' : 'chevron-forward'} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    fontFamily: 'serif',
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
