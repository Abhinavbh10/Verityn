/**
 * Onboarding Screen - Clean Architecture Version
 * 
 * Flow:
 * 1. Check if user already has preferences (returning user) -> Go to Home
 * 2. Show intro slides (first-time user)
 * 3. Show category selection
 * 4. Navigate to Home with categories in URL params
 */

import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// Unified storage
import Storage from '../src/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categories
const CATEGORIES = [
  { id: 'politics', name: 'Politics', icon: 'megaphone-outline' },
  { id: 'business', name: 'Business', icon: 'briefcase-outline' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip-outline' },
  { id: 'sports', name: 'Sports', icon: 'football-outline' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film-outline' },
  { id: 'health', name: 'Health', icon: 'fitness-outline' },
  { id: 'science', name: 'Science', icon: 'flask-outline' },
];

// Dark theme colors
const COLORS = {
  background: '#000000',
  card: '#0A0A0A',
  cardBorder: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textMuted: '#666666',
  primary: '#FF6B35',
};

// Verityn Logo
const VeritynLogo = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FF6B35" />
        <Stop offset="100%" stopColor="#FF8F5A" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="45" fill="url(#logoGradient)" opacity={0.15} />
    <Path
      d="M50 20 L50 55 M50 55 L35 40 M50 55 L65 40"
      stroke="url(#logoGradient)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx="50" cy="72" r="6" fill="url(#logoGradient)" />
  </Svg>
);

// Intro Screen (shown once)
function IntroScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <SafeAreaView style={styles.introContainer}>
      <View style={styles.introContent}>
        <VeritynLogo size={100} />
        <Text style={styles.introTitle}>Welcome to Verityn</Text>
        <Text style={styles.introSubtitle}>Your personalized news experience</Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="newspaper-outline" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Curated news from trusted sources</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Personalized for your interests</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cloud-offline-outline" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Read offline anytime</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedButton} onPress={onComplete}>
        <Text style={styles.getStartedText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Category Selection Screen
function CategorySelectionScreen({ onComplete }: { onComplete: (categories: string[]) => void }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selectedCategories.length === 0 || !gdprAccepted) return;
    
    setLoading(true);
    try {
      // Save to storage
      await Storage.saveGDPRConsent();
      await Storage.savePreferences(selectedCategories);
      await Storage.setOnboardingComplete();
      
      // Navigate with categories in params
      onComplete(selectedCategories);
    } catch (error) {
      console.error('Save error:', error);
      setLoading(false);
    }
  };

  const canContinue = selectedCategories.length > 0 && gdprAccepted;

  return (
    <SafeAreaView style={styles.selectionContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.selectionHeader}>
          <VeritynLogo size={60} />
          <Text style={styles.selectionTitle}>Choose Your Interests</Text>
          <Text style={styles.selectionSubtitle}>
            Select at least one category to personalize your feed
          </Text>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => toggleCategory(cat.id)}
              >
                <View style={[styles.categoryIconContainer, isSelected && styles.categoryIconSelected]}>
                  <Ionicons 
                    name={cat.icon as any} 
                    size={24} 
                    color={isSelected ? COLORS.text : COLORS.textMuted} 
                  />
                </View>
                <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                  {cat.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={14} color={COLORS.text} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* GDPR Checkbox */}
        <TouchableOpacity 
          style={styles.gdprRow} 
          onPress={() => setGdprAccepted(!gdprAccepted)}
        >
          <View style={[styles.checkbox, gdprAccepted && styles.checkboxChecked]}>
            {gdprAccepted && <Ionicons name="checkmark" size={14} color={COLORS.text} />}
          </View>
          <Text style={styles.gdprText}>
            I agree to the{' '}
            <Text style={styles.gdprLink} onPress={() => setShowTerms(true)}>
              Terms & Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Counter */}
        <Text style={styles.counter}>
          {selectedCategories.length} of {CATEGORIES.length} selected
        </Text>
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity 
        style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <>
            <Text style={styles.continueText}>Start Reading</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </>
        )}
      </TouchableOpacity>

      {/* Terms Modal */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>
                By using Verityn, you agree to our terms of service and privacy policy.
                {'\n\n'}
                <Text style={styles.modalSectionTitle}>Data Collection</Text>
                {'\n'}
                We collect your category preferences and bookmarks locally on your device.
                We do not share your personal data with third parties.
                {'\n\n'}
                <Text style={styles.modalSectionTitle}>Your Rights</Text>
                {'\n'}
                You can delete all your data at any time from the Settings screen.
                {'\n\n'}
                <Text style={styles.modalSectionTitle}>Contact</Text>
                {'\n'}
                For questions about your privacy, contact us at privacy@verityn.app
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setGdprAccepted(true);
                setShowTerms(false);
              }}
            >
              <Text style={styles.modalButtonText}>Accept & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Main Onboarding Screen
export default function OnboardingScreen() {
  const [checking, setChecking] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    checkState();
  }, []);

  const checkState = async () => {
    try {
      console.log('[Onboarding] Checking state...');
      
      // Check if returning user (has consent + preferences)
      const hasConsent = await Storage.getGDPRConsent();
      const prefs = await Storage.getPreferences();
      
      console.log('[Onboarding] hasConsent:', hasConsent, 'prefs:', prefs?.categories?.length);

      if (hasConsent && prefs?.categories?.length) {
        // Returning user - go directly to home
        console.log('[Onboarding] Returning user, going to home');
        router.replace('/(tabs)/home');
        return;
      }

      // Check if intro was completed
      const onboardingComplete = await Storage.isOnboardingComplete();
      console.log('[Onboarding] onboardingComplete:', onboardingComplete);

      if (onboardingComplete) {
        // Intro done, show categories
        setShowCategories(true);
      } else {
        // First time user
        setShowIntro(true);
      }
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      setShowIntro(true);
    }
    setChecking(false);
  };

  const handleIntroComplete = async () => {
    await Storage.setOnboardingComplete();
    setShowIntro(false);
    setShowCategories(true);
  };

  const handleCategoriesComplete = (categories: string[]) => {
    // Navigate to home with categories in URL params
    // This bypasses any storage read issues on Android
    router.replace({
      pathname: '/(tabs)/home',
      params: { initialCategories: categories.join(',') }
    });
  };

  // Loading state
  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Intro screen
  if (showIntro) {
    return <IntroScreen onComplete={handleIntroComplete} />;
  }

  // Category selection
  if (showCategories) {
    return <CategorySelectionScreen onComplete={handleCategoriesComplete} />;
  }

  // Fallback loading
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Intro
  introContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'space-between',
  },
  introContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  introSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  featureList: {
    marginTop: 48,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Selection
  selectionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  selectionHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  selectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'center',
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  categoryNameSelected: {
    color: COLORS.text,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gdprRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  gdprText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  gdprLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  modalSectionTitle: {
    fontWeight: '700',
    color: COLORS.text,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
