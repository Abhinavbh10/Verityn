import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, useColorScheme 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getPreferences, savePreferences as savePrefs } from '../src/utils/storage';
import { hasGDPRConsent, saveGDPRConsent } from '../src/utils/gdpr';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#1E3A5F' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#B45309' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#059669' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

// Terms & Conditions Modal Component
const TermsModal = ({ visible, onClose, isDark }: { visible: boolean; onClose: () => void; isDark: boolean }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, isDark && styles.textDark]}>Terms & Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#E7E5E4' : '#44403C'} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalSectionTitle, isDark && styles.textDark]}>Privacy Policy</Text>
          <Text style={[styles.modalText, isDark && styles.textMutedDark]}>
            Verityn respects your privacy and is committed to protecting your personal data under GDPR regulations.
          </Text>
          
          <Text style={[styles.modalSubtitle, isDark && styles.textDark]}>Data We Store Locally:</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Your news category preferences</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Bookmarked articles</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Custom keywords for personalization</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Country/city preferences</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Theme preference (light/dark)</Text>
          </View>
          
          <Text style={[styles.modalSubtitle, isDark && styles.textDark]}>What We Don't Do:</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• No data sent to external servers</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• No tracking or analytics</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• No data sold to third parties</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• No advertising profiles</Text>
          </View>
          
          <Text style={[styles.modalSectionTitle, isDark && styles.textDark]}>Terms of Service</Text>
          <Text style={[styles.modalText, isDark && styles.textMutedDark]}>
            By using Verityn, you agree to use the app for personal, non-commercial purposes. 
            News content is aggregated from public RSS feeds and belongs to their respective publishers.
          </Text>
          
          <Text style={[styles.modalSubtitle, isDark && styles.textDark]}>Your Rights:</Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Access your stored data anytime in Settings</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Delete all your data from Settings</Text>
            <Text style={[styles.bulletItem, isDark && styles.textMutedDark]}>• Withdraw consent at any time</Text>
          </View>
          
          <Text style={[styles.modalFooter, isDark && styles.textMutedDark]}>
            Last updated: March 2026
          </Text>
        </ScrollView>
        
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>I Understand</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    checkExistingPreferences();
  }, []);

  const checkExistingPreferences = async () => {
    try {
      // Check if user has GDPR consent AND preferences
      const hasConsent = await hasGDPRConsent();
      const preferences = await getPreferences();
      
      if (hasConsent && preferences?.categories?.length > 0) {
        router.replace('/(tabs)/home');
        return;
      }
      
      // Pre-check GDPR if already consented
      if (hasConsent) {
        setGdprAccepted(true);
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

  const handleGetStarted = async () => {
    if (selectedCategories.length === 0 || !gdprAccepted) return;
    
    setLoading(true);
    try {
      // Save GDPR consent
      await saveGDPRConsent();
      // Save preferences
      await savePrefs(selectedCategories);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error saving:', error);
      setLoading(false);
    }
  };

  const canProceed = selectedCategories.length > 0 && gdprAccepted;

  // Theme colors
  const colors = {
    background: isDark ? '#18181B' : '#FDF8F3',
    card: isDark ? '#27272A' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#292524',
    textMuted: isDark ? '#A1A1AA' : '#78716C',
    border: isDark ? '#3F3F46' : '#E7E5E4',
    primary: '#B45309',
  };

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} isDark={isDark} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, isDark && styles.logoContainerDark]}>
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
          <Text style={[styles.title, { color: colors.text }]}>Verityn</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Truth in Every Story</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome!</Text>
          <Text style={[styles.welcomeText, { color: colors.textMuted }]}>
            Select your favorite news categories to personalize your feed.
          </Text>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Your Interests</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: isSelected ? category.color : colors.border,
                      borderWidth: isSelected ? 2.5 : 1.5,
                    }
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                  data-testid={`category-${category.id}`}
                >
                  <View style={[styles.iconCircle, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons name={category.icon as any} size={26} color={category.color} />
                  </View>
                  
                  <Text style={[
                    styles.categoryName, 
                    { color: colors.textMuted },
                    isSelected && { color: category.color, fontWeight: '700' }
                  ]}>
                    {category.name}
                  </Text>
                  
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: category.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.selectionInfo, { color: colors.textMuted }]}>
          {selectedCategories.length} of {CATEGORIES.length} selected
        </Text>

        {/* GDPR Consent Checkbox */}
        <TouchableOpacity 
          style={[styles.gdprContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setGdprAccepted(!gdprAccepted)}
          activeOpacity={0.8}
          data-testid="gdpr-checkbox"
        >
          <View style={[
            styles.checkbox,
            { borderColor: gdprAccepted ? colors.primary : colors.border },
            gdprAccepted && { backgroundColor: colors.primary }
          ]}>
            {gdprAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <View style={styles.gdprTextContainer}>
            <Text style={[styles.gdprText, { color: colors.text }]}>
              I agree to the{' '}
              <Text 
                style={styles.gdprLink}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowTermsModal(true);
                }}
              >
                Terms & Privacy Policy
              </Text>
            </Text>
            <Text style={[styles.gdprSubtext, { color: colors.textMuted }]}>
              Your data stays on your device. We don't track you.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Get Started Button */}
        <TouchableOpacity
          style={[
            styles.continueButton, 
            !canProceed && styles.continueButtonDisabled
          ]}
          onPress={handleGetStarted}
          disabled={!canProceed || loading}
          activeOpacity={0.8}
          data-testid="get-started-btn"
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

        {/* Select All */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setSelectedCategories(CATEGORIES.map(c => c.id))}
        >
          <Text style={[styles.skipButtonText, { color: colors.primary }]}>Select All Categories</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  
  // Header
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoContainerDark: { backgroundColor: '#422006' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, letterSpacing: 0.3 },
  
  // Welcome
  welcomeSection: { marginBottom: 32 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  welcomeText: { fontSize: 15, lineHeight: 24 },
  
  // Categories
  categoriesSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%', borderRadius: 16, padding: 16,
    marginBottom: 12, position: 'relative', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  categoryName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  checkCircle: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  selectionInfo: { textAlign: 'center', fontSize: 14, marginBottom: 20 },
  
  // GDPR Checkbox
  gdprContainer: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2,
  },
  gdprTextContainer: { flex: 1 },
  gdprText: { fontSize: 15, lineHeight: 22 },
  gdprLink: { color: '#B45309', fontWeight: '600', textDecorationLine: 'underline' },
  gdprSubtext: { fontSize: 13, marginTop: 4 },
  
  // Buttons
  continueButton: {
    backgroundColor: '#B45309', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#B45309', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  continueButtonDisabled: { backgroundColor: '#D6D3D1', shadowOpacity: 0 },
  continueButtonText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.3 },
  skipButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  skipButtonText: { fontSize: 15, fontWeight: '500' },
  
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FDF8F3', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 24,
  },
  modalContentDark: { backgroundColor: '#18181B' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E7E5E4',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#292524' },
  closeButton: { padding: 4 },
  modalScroll: { padding: 20 },
  modalSectionTitle: { fontSize: 18, fontWeight: '700', color: '#292524', marginBottom: 12, marginTop: 8 },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: '#292524', marginTop: 16, marginBottom: 8 },
  modalText: { fontSize: 15, color: '#57534E', lineHeight: 24 },
  bulletList: { marginLeft: 4 },
  bulletItem: { fontSize: 14, color: '#57534E', lineHeight: 26 },
  modalFooter: { fontSize: 13, color: '#A8A29E', marginTop: 24, textAlign: 'center' },
  modalButton: {
    backgroundColor: '#B45309', marginHorizontal: 20, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textDark: { color: '#FAFAFA' },
  textMutedDark: { color: '#A1A1AA' },
});
