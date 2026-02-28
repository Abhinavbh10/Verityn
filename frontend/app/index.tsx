import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getPreferences, savePreferences } from '../src/utils/storage';

const STORAGE_KEY = '@user_preferences';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#3B82F6' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#10B981' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#8B5CF6' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#F59E0B' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#EC4899' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#EF4444' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#06B6D4' },
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
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        if (preferences.categories && preferences.categories.length > 0) {
          // User has preferences, redirect to home
          router.replace('/(tabs)/home');
          return;
        }
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

  const savePreferences = async () => {
    if (selectedCategories.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: selectedCategories,
        updatedAt: new Date().toISOString(),
      }));
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
          <ActivityIndicator size="large" color="#3B82F6" />
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
                  <Stop offset="0%" stopColor="#3B82F6" />
                  <Stop offset="50%" stopColor="#8B5CF6" />
                  <Stop offset="100%" stopColor="#06B6D4" />
                </LinearGradient>
              </Defs>
              <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
              <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M25 25 L40 25" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <Path d="M60 25 L75 25" fill="none" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <Circle cx="50" cy="20" r="4" fill="url(#logoGradient)" />
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
            You can change these anytime in settings.
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
                    isSelected && { borderColor: category.color, backgroundColor: `${category.color}15` }
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons 
                      name={category.icon as any} 
                      size={28} 
                      color={category.color} 
                    />
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

        {/* Selection Info */}
        <Text style={styles.selectionInfo}>
          {selectedCategories.length} of {CATEGORIES.length} selected
        </Text>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCategories.length === 0 && styles.continueButtonDisabled
          ]}
          onPress={savePreferences}
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

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            setSelectedCategories(CATEGORIES.map(c => c.id));
          }}
        >
          <Text style={styles.skipButtonText}>Select All Categories</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionInfo: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
