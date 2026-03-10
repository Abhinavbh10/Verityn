/**
 * Reliable AsyncStorage wrapper for user preferences
 * Uses AsyncStorage instead of SecureStore for better Android reliability
 * SecureStore's encryption causes intermittent read failures on Android
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_PREFERENCES: 'verityn_user_preferences',
  GDPR_CONSENT: 'verityn_gdpr_consent',
  ONBOARDING_COMPLETE: 'verityn_onboarding_complete',
  FEATURE_OVERLAY_SHOWN: 'verityn_feature_overlay_shown',
  BOOKMARKS: 'verityn_bookmarks',
  KEYWORDS: 'verityn_keywords',
  LOCATIONS: 'verityn_locations',
};

export interface UserPreferences {
  categories: string[];
  updatedAt?: string;
}

export const appStorage = {
  // Generic methods
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[AppStorage] Error getting ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`[AppStorage] Error setting ${key}:`, error);
      return false;
    }
  },

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[AppStorage] Error removing ${key}:`, error);
      return false;
    }
  },

  // User Preferences
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_PREFERENCES);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('[AppStorage] Error getting preferences:', error);
      return null;
    }
  },

  async savePreferences(categories: string[]): Promise<boolean> {
    try {
      const prefs: UserPreferences = {
        categories,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.USER_PREFERENCES, JSON.stringify(prefs));
      console.log('[AppStorage] Preferences saved:', categories);
      return true;
    } catch (error) {
      console.error('[AppStorage] Error saving preferences:', error);
      return false;
    }
  },

  async hasPreferences(): Promise<boolean> {
    const prefs = await this.getPreferences();
    return prefs !== null && prefs.categories.length > 0;
  },

  // GDPR Consent
  async getGDPRConsent(): Promise<boolean> {
    try {
      const consent = await AsyncStorage.getItem(KEYS.GDPR_CONSENT);
      return consent === 'true';
    } catch (error) {
      console.error('[AppStorage] Error getting GDPR consent:', error);
      return false;
    }
  },

  async saveGDPRConsent(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.GDPR_CONSENT, 'true');
      return true;
    } catch (error) {
      console.error('[AppStorage] Error saving GDPR consent:', error);
      return false;
    }
  },

  // Onboarding
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const complete = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
      return complete === 'true';
    } catch (error) {
      console.error('[AppStorage] Error checking onboarding:', error);
      return false;
    }
  },

  async setOnboardingComplete(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
      return true;
    } catch (error) {
      console.error('[AppStorage] Error setting onboarding complete:', error);
      return false;
    }
  },

  // Feature Overlay
  async shouldShowFeatureOverlay(): Promise<boolean> {
    try {
      const shown = await AsyncStorage.getItem(KEYS.FEATURE_OVERLAY_SHOWN);
      return shown !== 'true'; // Show if NOT already shown
    } catch (error) {
      return false;
    }
  },

  async setFeatureOverlayShown(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.FEATURE_OVERLAY_SHOWN, 'true');
      return true;
    } catch (error) {
      return false;
    }
  },

  // Bookmarks
  async getBookmarks(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AppStorage] Error getting bookmarks:', error);
      return [];
    }
  },

  async saveBookmarks(bookmarks: string[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      return true;
    } catch (error) {
      console.error('[AppStorage] Error saving bookmarks:', error);
      return false;
    }
  },

  // Keywords for "For You"
  async getKeywords(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.KEYWORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  },

  async saveKeywords(keywords: string[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.KEYWORDS, JSON.stringify(keywords));
      return true;
    } catch (error) {
      return false;
    }
  },

  // Locations for "For You"
  async getLocations(): Promise<{ countries: string[]; cities: string[] }> {
    try {
      const data = await AsyncStorage.getItem(KEYS.LOCATIONS);
      return data ? JSON.parse(data) : { countries: [], cities: [] };
    } catch (error) {
      return { countries: [], cities: [] };
    }
  },

  async saveLocations(locations: { countries: string[]; cities: string[] }): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.LOCATIONS, JSON.stringify(locations));
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear all app data
  async clearAll(): Promise<boolean> {
    try {
      const keys = Object.values(KEYS);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('[AppStorage] Error clearing all data:', error);
      return false;
    }
  },
};
