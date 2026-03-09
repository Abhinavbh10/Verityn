/**
 * Feature Overlay - First-time user feature discovery
 * Shows app features as an overlay on home screen (like Inshorts)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Dimensions, useColorScheme, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Feature {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: string;
}

const FEATURES: Feature[] = [
  {
    id: '1',
    number: 1,
    title: 'Swipe to Navigate',
    description: 'Swipe up for next story, down for previous. Simple and fast.',
    icon: 'swap-vertical-outline',
  },
  {
    id: '2',
    number: 2,
    title: 'Read Full Article',
    description: 'Tap the card or "Read full story" to open the original source.',
    icon: 'open-outline',
  },
  {
    id: '3',
    number: 3,
    title: 'Save for Later',
    description: 'Tap the bookmark icon to save articles. Access them in Saved tab.',
    icon: 'bookmark-outline',
  },
  {
    id: '4',
    number: 4,
    title: 'Share Stories',
    description: 'Share interesting news with friends using the share button.',
    icon: 'share-social-outline',
  },
];

// Small illustration for each feature
const FeatureIllustration = ({ type, color }: { type: string; color: string }) => {
  switch (type) {
    case 'swap-vertical-outline':
      return (
        <Svg width={60} height={60} viewBox="0 0 60 60">
          <Rect x="15" y="10" width="30" height="40" rx="4" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
          <Path d="M30 5 L30 15 M25 10 L30 5 L35 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M30 55 L30 45 M25 50 L30 55 L35 50" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'open-outline':
      return (
        <Svg width={60} height={60} viewBox="0 0 60 60">
          <Rect x="10" y="15" width="40" height="30" rx="4" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
          <Rect x="15" y="22" width="20" height="3" rx="1" fill={color} />
          <Rect x="15" y="28" width="25" height="2" rx="1" fill={`${color}60`} />
          <Rect x="15" y="33" width="18" height="2" rx="1" fill={`${color}40`} />
          <Path d="M40 38 L50 28 M50 28 L50 35 M50 28 L43 28" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'bookmark-outline':
      return (
        <Svg width={60} height={60} viewBox="0 0 60 60">
          <Path d="M20 10 L20 50 L30 40 L40 50 L40 10 Z" fill={`${color}20`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <Circle cx="30" cy="25" r="6" fill={color} opacity="0.5" />
        </Svg>
      );
    case 'share-social-outline':
      return (
        <Svg width={60} height={60} viewBox="0 0 60 60">
          <Circle cx="40" cy="15" r="8" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
          <Circle cx="40" cy="45" r="8" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
          <Circle cx="15" cy="30" r="8" fill={color} opacity="0.3" />
          <Path d="M23 26 L32 19 M23 34 L32 41" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
};

interface FeatureOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function FeatureOverlay({ visible, onDismiss }: FeatureOverlayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#18181B' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#1A1A1A',
    textMuted: isDark ? '#A1A1AA' : '#595959',
    primary: '#2563EB',
    border: isDark ? '#27272A' : '#E5E5E5',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome to Verityn!</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Here's how to get the most out of your news experience
          </Text>

          {/* Features List */}
          <ScrollView 
            style={styles.featuresList}
            showsVerticalScrollIndicator={false}
          >
            {FEATURES.map((feature, index) => (
              <View 
                key={feature.id} 
                style={[
                  styles.featureItem,
                  { borderBottomColor: colors.border },
                  index === FEATURES.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={styles.featureLeft}>
                  <FeatureIllustration type={feature.icon} color={colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureTitleRow}>
                    <View style={[styles.numberBadge, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.numberText, { color: colors.primary }]}>{feature.number}</Text>
                    </View>
                    <Text style={[styles.featureTitle, { color: colors.primary }]}>{feature.title}</Text>
                  </View>
                  <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Start Reading</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 15,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featuresList: {
    paddingHorizontal: 24,
  },
  featureItem: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  featureLeft: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaButton: {
    marginHorizontal: 24,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
