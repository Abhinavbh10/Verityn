import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { requestNotificationPermissions, getNotificationSettings, saveNotificationSettings, NotificationSettings } from '../../src/utils/notifications';
import { getPreferences, savePreferences, clearPreferences } from '../../src/utils/storage';
import { useTheme, ThemeMode } from '../../src/utils/theme';
import { getOfflineArticleCount, clearAllOfflineArticles } from '../../src/utils/offline';

interface Category { id: string; name: string; icon: string; color: string; }

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#2563EB' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#059669' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#D97706' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

export default function ProfileScreen() {
  const { theme, setTheme, colors, isDark } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ enabled: false, dailyDigest: false, digestTime: '09:00', categories: [] });

  useEffect(() => { loadPreferences(); loadNotificationSettings(); loadOfflineCount(); }, []);

  const loadPreferences = async () => {
    try {
      const preferences = await getPreferences();
      if (preferences) { setSelectedCategories(preferences.categories || []); setOriginalCategories(preferences.categories || []); }
    } catch (error) { console.error('Error loading preferences:', error); }
    setLoading(false);
  };

  const loadNotificationSettings = async () => { const settings = await getNotificationSettings(); setNotificationSettings(settings); };
  const loadOfflineCount = async () => { const count = await getOfflineArticleCount(); setOfflineCount(count); };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };

  const hasChanges = () => {
    if (selectedCategories.length !== originalCategories.length) return true;
    return !selectedCategories.every(cat => originalCategories.includes(cat));
  };

  const handleSavePreferences = async () => {
    if (selectedCategories.length === 0) { Alert.alert('Error', 'Please select at least one category'); return; }
    setSaving(true);
    try { await savePreferences(selectedCategories); setOriginalCategories(selectedCategories); Alert.alert('Success', 'Your preferences have been saved!'); }
    catch (error) { console.error('Error saving preferences:', error); Alert.alert('Error', 'Failed to save preferences'); }
    setSaving(false);
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) { const granted = await requestNotificationPermissions(); if (!granted) { Alert.alert('Permission Required', 'Please enable notifications in your device settings.'); return; } }
    const newSettings = { ...notificationSettings, enabled: value };
    setNotificationSettings(newSettings); await saveNotificationSettings(newSettings);
  };

  const toggleDailyDigest = async (value: boolean) => {
    const newSettings = { ...notificationSettings, dailyDigest: value };
    setNotificationSettings(newSettings); await saveNotificationSettings(newSettings);
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    await setTheme(newTheme);
  };

  const clearOfflineArticles = () => {
    Alert.alert('Clear Offline Articles', 'Remove all saved offline articles?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearAllOfflineArticles(); setOfflineCount(0); } },
    ]);
  };

  const resetPreferences = () => {
    Alert.alert('Reset Preferences', 'This will take you back to the welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await clearPreferences(); router.replace('/'); } },
    ]);
  };

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.profileIcon, { backgroundColor: colors.primaryLight }]}>
            <Svg width={40} height={40} viewBox="0 0 100 100">
              <Defs><LinearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor={colors.primary} /><Stop offset="100%" stopColor="#1D4ED8" /></LinearGradient></Defs>
              <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGrad)" strokeWidth="4" />
              <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#logoGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Settings</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textMuted]}>Customize your experience</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Appearance</Text>
          <View style={styles.themeOptions}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((themeOption) => (
              <TouchableOpacity
                key={themeOption}
                style={[
                  styles.themeOption,
                  dynamicStyles.surface,
                  theme === themeOption && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                ]}
                onPress={() => handleThemeChange(themeOption)}
              >
                <Ionicons 
                  name={themeOption === 'light' ? 'sunny' : themeOption === 'dark' ? 'moon' : 'phone-portrait'} 
                  size={24} 
                  color={theme === themeOption ? colors.primary : colors.textMuted} 
                />
                <Text style={[styles.themeLabel, { color: theme === themeOption ? colors.primary : colors.textSecondary }]}>
                  {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                </Text>
                {theme === themeOption && (
                  <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Offline Reading Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Offline Reading</Text>
          <View style={[styles.settingRow, dynamicStyles.surface]}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="cloud-offline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, dynamicStyles.text]}>Saved Articles</Text>
                <Text style={[styles.settingDescription, dynamicStyles.textMuted]}>{offlineCount} articles saved for offline</Text>
              </View>
            </View>
            {offlineCount > 0 && (
              <TouchableOpacity onPress={clearOfflineArticles} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Notifications</Text>
          <View style={[styles.settingRow, dynamicStyles.surface]}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}><Ionicons name="notifications" size={20} color="#2563EB" /></View>
              <View><Text style={[styles.settingLabel, dynamicStyles.text]}>Push Notifications</Text><Text style={[styles.settingDescription, dynamicStyles.textMuted]}>Receive news alerts</Text></View>
            </View>
            <Switch value={notificationSettings.enabled} onValueChange={toggleNotifications} trackColor={{ false: colors.border, true: '#BFDBFE' }} thumbColor={notificationSettings.enabled ? '#2563EB' : '#9CA3AF'} />
          </View>
          {notificationSettings.enabled && (
            <View style={[styles.settingRow, dynamicStyles.surface]}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="sunny" size={20} color="#D97706" /></View>
                <View><Text style={[styles.settingLabel, dynamicStyles.text]}>Daily Digest</Text><Text style={[styles.settingDescription, dynamicStyles.textMuted]}>Get news summary at 9:00 AM</Text></View>
              </View>
              <Switch value={notificationSettings.dailyDigest} onValueChange={toggleDailyDigest} trackColor={{ false: colors.border, true: '#FDE68A' }} thumbColor={notificationSettings.dailyDigest ? '#D97706' : '#9CA3AF'} />
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>News Categories</Text>
          <Text style={[styles.sectionDescription, dynamicStyles.textMuted]}>Select the categories you want to see</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity key={category.id} style={[styles.categoryCard, dynamicStyles.surface, isSelected && { borderColor: category.color, backgroundColor: `${category.color}15` }]} onPress={() => toggleCategory(category.id)} activeOpacity={0.7}>
                  <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}><Ionicons name={category.icon as any} size={24} color={category.color} /></View>
                  <Text style={[styles.categoryName, { color: isSelected ? category.color : colors.textSecondary }]}>{category.name}</Text>
                  {isSelected && <View style={[styles.checkmark, { backgroundColor: category.color }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryContainer}><Ionicons name="information-circle" size={20} color={colors.textMuted} /><Text style={[styles.summaryText, dynamicStyles.textMuted]}>{selectedCategories.length} categories selected</Text></View>

        <TouchableOpacity style={[styles.saveButton, (!hasChanges() || selectedCategories.length === 0) && styles.saveButtonDisabled]} onPress={handleSavePreferences} disabled={!hasChanges() || selectedCategories.length === 0 || saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveButtonText}>Save Changes</Text></>}
        </TouchableOpacity>

        <View style={styles.resetSection}>
          <TouchableOpacity style={styles.resetButton} onPress={resetPreferences} activeOpacity={0.7}>
            <Ionicons name="refresh-circle" size={20} color="#DC2626" /><Text style={styles.resetButtonText}>Reset All Preferences</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.appInfo, { borderTopColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.primary }]}>Verityn</Text>
          <Text style={[styles.appVersion, dynamicStyles.textMuted]}>Version 1.3.0</Text>
          <Text style={[styles.appCopyright, dynamicStyles.textMuted]}>Truth in Every Story</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  profileIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { fontSize: 15 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  sectionDescription: { fontSize: 14, marginBottom: 16 },
  
  // Theme options
  themeOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 2, position: 'relative' },
  themeLabel: { fontSize: 13, fontWeight: '500', marginTop: 8 },
  themeCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  
  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDescription: { fontSize: 12, marginTop: 2 },
  clearButton: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  clearButtonText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  
  // Categories
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, position: 'relative' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  categoryName: { fontSize: 14, fontWeight: '600' },
  checkmark: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  // Actions
  summaryContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  summaryText: { fontSize: 14 },
  saveButton: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  saveButtonDisabled: { backgroundColor: '#D1D5DB' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  resetSection: { alignItems: 'center', marginTop: 8, marginBottom: 32 },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  resetButtonText: { fontSize: 15, color: '#DC2626', fontWeight: '500' },
  appInfo: { alignItems: 'center', paddingTop: 24, borderTopWidth: 1 },
  appName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  appVersion: { fontSize: 13, marginBottom: 4 },
  appCopyright: { fontSize: 12 },
});
