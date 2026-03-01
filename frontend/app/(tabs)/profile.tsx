import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { requestNotificationPermissions, getNotificationSettings, saveNotificationSettings, NotificationSettings } from '../../src/utils/notifications';
import { getPreferences, savePreferences, clearPreferences } from '../../src/utils/storage';

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ enabled: false, dailyDigest: false, digestTime: '09:00', categories: [] });

  useEffect(() => { loadPreferences(); loadNotificationSettings(); }, []);

  const loadPreferences = async () => {
    try {
      const preferences = await getPreferences();
      if (preferences) { setSelectedCategories(preferences.categories || []); setOriginalCategories(preferences.categories || []); }
    } catch (error) { console.error('Error loading preferences:', error); }
    setLoading(false);
  };

  const loadNotificationSettings = async () => { const settings = await getNotificationSettings(); setNotificationSettings(settings); };

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

  const resetPreferences = () => {
    Alert.alert('Reset Preferences', 'This will take you back to the welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await clearPreferences(); router.replace('/'); } },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileIcon}>
            <Svg width={40} height={40} viewBox="0 0 100 100">
              <Defs><LinearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#2563EB" /><Stop offset="100%" stopColor="#1D4ED8" /></LinearGradient></Defs>
              <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGrad)" strokeWidth="4" />
              <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#logoGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}><Ionicons name="notifications" size={20} color="#2563EB" /></View>
              <View><Text style={styles.settingLabel}>Push Notifications</Text><Text style={styles.settingDescription}>Receive news alerts</Text></View>
            </View>
            <Switch value={notificationSettings.enabled} onValueChange={toggleNotifications} trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={notificationSettings.enabled ? '#2563EB' : '#9CA3AF'} />
          </View>
          {notificationSettings.enabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="sunny" size={20} color="#D97706" /></View>
                <View><Text style={styles.settingLabel}>Daily Digest</Text><Text style={styles.settingDescription}>Get news summary at 9:00 AM</Text></View>
              </View>
              <Switch value={notificationSettings.dailyDigest} onValueChange={toggleDailyDigest} trackColor={{ false: '#E5E7EB', true: '#FDE68A' }} thumbColor={notificationSettings.dailyDigest ? '#D97706' : '#9CA3AF'} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>News Categories</Text>
          <Text style={styles.sectionDescription}>Select the categories you want to see</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity key={category.id} style={[styles.categoryCard, isSelected && { borderColor: category.color, backgroundColor: `${category.color}10` }]} onPress={() => toggleCategory(category.id)} activeOpacity={0.7}>
                  <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}><Ionicons name={category.icon as any} size={24} color={category.color} /></View>
                  <Text style={[styles.categoryName, isSelected && { color: category.color }]}>{category.name}</Text>
                  {isSelected && <View style={[styles.checkmark, { backgroundColor: category.color }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryContainer}><Ionicons name="information-circle" size={20} color="#9CA3AF" /><Text style={styles.summaryText}>{selectedCategories.length} categories selected</Text></View>

        <TouchableOpacity style={[styles.saveButton, (!hasChanges() || selectedCategories.length === 0) && styles.saveButtonDisabled]} onPress={handleSavePreferences} disabled={!hasChanges() || selectedCategories.length === 0 || saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveButtonText}>Save Changes</Text></>}
        </TouchableOpacity>

        <View style={styles.resetSection}>
          <TouchableOpacity style={styles.resetButton} onPress={resetPreferences} activeOpacity={0.7}>
            <Ionicons name="refresh-circle" size={20} color="#DC2626" /><Text style={styles.resetButtonText}>Reset All Preferences</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appName}>Verityn</Text>
          <Text style={styles.appVersion}>Version 1.2.0</Text>
          <Text style={styles.appCopyright}>Truth in Every Story</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  profileIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#64748B' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  sectionDescription: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  settingDescription: { fontSize: 12, color: '#64748B', marginTop: 2 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  checkmark: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  summaryContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  summaryText: { fontSize: 14, color: '#9CA3AF' },
  saveButton: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  saveButtonDisabled: { backgroundColor: '#D1D5DB' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  resetSection: { alignItems: 'center', marginTop: 8, marginBottom: 32 },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  resetButtonText: { fontSize: 15, color: '#DC2626', fontWeight: '500' },
  appInfo: { alignItems: 'center', paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  appName: { fontSize: 18, fontWeight: '600', color: '#2563EB', marginBottom: 4 },
  appVersion: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  appCopyright: { fontSize: 12, color: '#64748B' },
});
