import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VeritynLoaderProps {
  message?: string;
  showTips?: boolean;
}

const LOADING_TIPS = [
  "Curating stories from 50+ sources...",
  "Fetching the latest headlines...",
  "Gathering news from around the world...",
  "Preparing your personalized feed...",
  "Almost there...",
];

export const VeritynLoader: React.FC<VeritynLoaderProps> = ({ 
  message = "Loading your news...",
  showTips = true 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [tipIndex, setTipIndex] = React.useState(0);

  useEffect(() => {
    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation for the loading indicator
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Cycle through tips
    if (showTips) {
      const tipInterval = setInterval(() => {
        setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
      }, 2500);
      return () => clearInterval(tipInterval);
    }
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Logo with pulse */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>V</Text>
        </View>
        
        {/* Spinning ring around logo */}
        <Animated.View style={[styles.spinningRing, { transform: [{ rotate: spin }] }]}>
          <View style={styles.ringDot} />
        </Animated.View>
      </Animated.View>

      {/* Brand name */}
      <Text style={styles.brandName}>Verityn</Text>
      
      {/* Loading message */}
      <Text style={styles.loadingText}>{message}</Text>

      {/* Loading tips - cycling through */}
      {showTips && (
        <View style={styles.tipContainer}>
          <Ionicons name="newspaper-outline" size={16} color="#B45309" />
          <Text style={styles.tipText}>{LOADING_TIPS[tipIndex]}</Text>
        </View>
      )}

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: i === 0 ? [0.3, 1] : i === 1 ? [0.6, 1] : [1, 0.6],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF8F3',
    padding: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#B45309',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  spinningRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#B45309',
    borderRightColor: '#B4530950',
  },
  ringDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B45309',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#78716C',
    marginBottom: 24,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginBottom: 32,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B45309',
  },
});

export default VeritynLoader;
