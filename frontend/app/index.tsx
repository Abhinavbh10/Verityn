import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getPreferences, savePreferences as savePrefs } from '../src/utils/storage';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#2563EB' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#059669' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#D97706' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

export default function WelcomeScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingPreferences();
  }, []);

  const checkExistingPreferences = async () => {
    try {
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
                  <Stop offset="0%" stopColor="#2563EB" />
                  <Stop offset="100%" stopColor="#1D4ED8" />
                </LinearGradient>
              </Defs>
              <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
              <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="50" cy="20" r="4" fill="#2563EB" />
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
                    isSelected && { borderColor: category.color, backgroundColor: `${category.color}10` }
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#F0F7FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B' },
  welcomeSection: { marginBottom: 32 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  welcomeText: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  categoriesSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 16 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  iconContainer: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginBottom: 12,
  },
  categoryName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  checkmark: {
    position: 'absolute', top: 12, right: 12, width: 24, height: 24,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  selectionInfo: { textAlign: 'center', fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
  continueButton: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  continueButtonDisabled: { backgroundColor: '#D1D5DB' },
  continueButtonText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  skipButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  skipButtonText: { fontSize: 15, color: '#2563EB', fontWeight: '500' },
});
