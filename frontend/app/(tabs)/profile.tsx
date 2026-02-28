import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  requestNotificationPermissions,
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
} from '../../src/utils/notifications';
import { getPreferences, savePreferences, clearPreferences } from '../../src/utils/storage';

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

export default function ProfileScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    dailyDigest: false,
    digestTime: '09:00',
    categories: [],
  });

  useEffect(() => {
    loadPreferences();
    loadNotificationSettings();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        setSelectedCategories(preferences.categories || []);
        setOriginalCategories(preferences.categories || []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    setLoading(false);
  };

  const loadNotificationSettings = async () => {
    const settings = await getNotificationSettings();
    setNotificationSettings(settings);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const hasChanges = () => {
    if (selectedCategories.length !== originalCategories.length) return true;
    return !selectedCategories.every(cat => originalCategories.includes(cat));
  };

  const savePreferences = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: selectedCategories,
        updatedAt: new Date().toISOString(),
      }));
      setOriginalCategories(selectedCategories);
      Alert.alert('Success', 'Your preferences have been saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
    setSaving(false);
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive news updates.'
        );
        return;
      }
    }
    
    const newSettings = { ...notificationSettings, enabled: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const toggleDailyDigest = async (value: boolean) => {
    const newSettings = { ...notificationSettings, dailyDigest: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const resetPreferences = () => {
    Alert.alert(
      'Reset Preferences',
      'This will take you back to the welcome screen to choose new categories.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_KEY);
            router.replace('/');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={40} color="#3B82F6" />
          </View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Customize your news experience
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="notifications" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive news alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#334155', true: '#3B82F680' }}
              thumbColor={notificationSettings.enabled ? '#3B82F6' : '#64748B'}
            />
          </View>

          {notificationSettings.enabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="sunny" size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Daily Digest</Text>
                  <Text style={styles.settingDescription}>Get news summary at 9:00 AM</Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.dailyDigest}
                onValueChange={toggleDailyDigest}
                trackColor={{ false: '#334155', true: '#F59E0B80' }}
                thumbColor={notificationSettings.dailyDigest ? '#F59E0B' : '#64748B'}
              />
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>News Categories</Text>
          <Text style={styles.sectionDescription}>
            Select the categories you want to see in your feed
          </Text>
          
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
                      size={24} 
                      color={category.color} 
                    />
                  </View>
                  <Text style={[styles.categoryName, isSelected && { color: category.color }]}>
                    {category.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: category.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selection Summary */}
        <View style={styles.summaryContainer}>
          <Ionicons name="information-circle" size={20} color="#64748B" />
          <Text style={styles.summaryText}>
            {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges() || selectedCategories.length === 0) && styles.saveButtonDisabled
          ]}
          onPress={savePreferences}
          disabled={!hasChanges() || selectedCategories.length === 0 || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reset Section */}
        <View style={styles.resetSection}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetPreferences}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-circle" size={20} color="#EF4444" />
            <Text style={styles.resetButtonText}>Reset All Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Verityn</Text>
          <Text style={styles.appVersion}>Version 1.1.0</Text>
          <Text style={styles.appCopyright}>
            Truth in Every Story
          </Text>
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#475569',
  },
});
