import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getPreferences, savePreferences as savePrefs } from '../src/utils/storage';
import { hasGDPRConsent } from '../src/utils/gdpr';
import GDPRConsentModal from '../src/components/GDPRConsentModal';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// European Elegance theme colors
const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#1E3A5F' },      // Navy
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#B45309' },     // Amber (primary)
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#059669' },            // Emerald
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

export default function WelcomeScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [showGDPRModal, setShowGDPRModal] = useState(false);

  useEffect(() => {
    checkExistingPreferences();
  }, []);

  const checkExistingPreferences = async () => {
    try {
      // First check GDPR consent
      const hasConsent = await hasGDPRConsent();
      if (!hasConsent) {
        setShowGDPRModal(true);
        setChecking(false);
        setLoading(false);
        return;
      }
      
      // Then check if user has already completed onboarding
      const preferences = await getPreferences();
      if (preferences && preferences.categories && preferences.categories.length > 0) {
        router.replace('/(tabs)/home');
        return;
      }
    } catch (error) {
      console.error('Error checking preferences:', error);
    }
    setChecking(false);
    setLoading(false);
  };

  const handleGDPRAccept = async () => {
    setShowGDPRModal(false);
    // After GDPR consent, check if user already has preferences
    try {
      const preferences = await getPreferences();
      if (preferences && preferences.categories && preferences.categories.length > 0) {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error checking preferences after GDPR:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleSavePreferences = async () => {
    if (selectedCategories.length === 0) return;
    setLoading(true);
    try {
      await savePrefs(selectedCategories);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* GDPR Consent Modal */}
      <GDPRConsentModal visible={showGDPRModal} onAccept={handleGDPRAccept} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Svg width={56} height={56} viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#B45309" />
                  <Stop offset="100%" stopColor="#92400E" />
                </LinearGradient>
              </Defs>
              <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
              <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="50" cy="20" r="4" fill="#B45309" />
            </Svg>
          </View>
          <Text style={styles.title}>Verityn</Text>
          <Text style={styles.subtitle}>Truth in Every Story</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeText}>
            Select your favorite news categories to personalize your feed.
          </Text>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Choose Your Interests</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                    isSelected && { borderColor: category.color }
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer, 
                    { backgroundColor: isSelected ? 'transparent' : `${category.color}15` }
                  ]}>
                    <Ionicons name={category.icon as any} size={28} color={category.color} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && { color: category.color }]}>
                    {category.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: category.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.selectionInfo}>
          {selectedCategories.length} of {CATEGORIES.length} selected
        </Text>

        <TouchableOpacity
          style={[styles.continueButton, selectedCategories.length === 0 && styles.continueButtonDisabled]}
          onPress={handleSavePreferences}
          disabled={selectedCategories.length === 0 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setSelectedCategories(CATEGORIES.map(c => c.id))}
        >
          <Text style={styles.skipButtonText}>Select All Categories</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// European Elegance styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },  // Warm white background
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#FEF3C7',  // Amber light
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#292524', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#78716C', letterSpacing: 0.3 },
  welcomeSection: { marginBottom: 32 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: '#292524', marginBottom: 8 },
  welcomeText: { fontSize: 15, color: '#57534E', lineHeight: 24 },
  categoriesSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#292524', marginBottom: 16 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: '#E7E5E4', position: 'relative',
    shadowColor: '#44403C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  categoryCardSelected: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent',
  },
  categoryName: { fontSize: 15, fontWeight: '600', color: '#57534E' },
  checkmark: {
    position: 'absolute', top: 12, right: 12, width: 24, height: 24,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  selectionInfo: { textAlign: 'center', fontSize: 14, color: '#A8A29E', marginBottom: 24 },
  continueButton: {
    backgroundColor: '#B45309', borderRadius: 14, paddingVertical: 16,  // Amber primary
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#B45309', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  continueButtonDisabled: { backgroundColor: '#D6D3D1', shadowOpacity: 0 },
  continueButtonText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.3 },
  skipButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  skipButtonText: { fontSize: 15, color: '#B45309', fontWeight: '500' },  // Amber primary
});
