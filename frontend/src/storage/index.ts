/**
 * UNIFIED STORAGE SYSTEM
 * 
 * This is the ONLY storage utility that should be used across the app.
 * Uses AsyncStorage which is reliable on both iOS and Android.
 * 
 * DO NOT use expo-secure-store for preferences - it has Android reliability issues.
 * SecureStore should ONLY be used for truly sensitive data like auth tokens.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys - centralized to prevent typos and conflicts
const KEYS = {
  USER_PREFERENCES: '@verityn/user_preferences',
  GDPR_CONSENT: '@verityn/gdpr_consent',
  ONBOARDING_COMPLETE: '@verityn/onboarding_complete',
  FEATURE_OVERLAY_SHOWN: '@verityn/feature_overlay_shown',
  BOOKMARKS: '@verityn/bookmarks',
  KEYWORDS: '@verityn/keywords',
  LOCATIONS: '@verityn/locations',
  THEME_MODE: '@verityn/theme_mode',
  NOTIFICATION_SETTINGS: '@verityn/notification_settings',
  OFFLINE_ARTICLES: '@verityn/offline_articles',
} as const;

// Types
export interface UserPreferences {
  categories: string[];
  updatedAt: string;
}

export interface BookmarkedArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  category: string;
  image_url?: string;
  bookmarkedAt: string;
}

export interface LocationPreferences {
  countries: string[];
  cities: string[];
}

export interface NotificationSettings {
  breakingNews: boolean;
  dailyDigest: boolean;
  categoryAlerts: boolean;
}

// Helper function for safe JSON parsing
const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/**
 * Unified Storage API
 * All app storage operations go through this single interface
 */
export const Storage = {
  // ============ USER PREFERENCES ============
  
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_PREFERENCES);
      return safeJsonParse<UserPreferences | null>(data, null);
    } catch (error) {
      console.error('[Storage] getPreferences error:', error);
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
      console.log('[Storage] Preferences saved:', categories);
      return true;
    } catch (error) {
      console.error('[Storage] savePreferences error:', error);
      return false;
    }
  },

  async hasPreferences(): Promise<boolean> {
    const prefs = await this.getPreferences();
    return prefs !== null && prefs.categories.length > 0;
  },

  // ============ GDPR CONSENT ============
  
  async getGDPRConsent(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.GDPR_CONSENT);
      return value === 'true';
    } catch (error) {
      console.error('[Storage] getGDPRConsent error:', error);
      return false;
    }
  },

  async saveGDPRConsent(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.GDPR_CONSENT, 'true');
      return true;
    } catch (error) {
      console.error('[Storage] saveGDPRConsent error:', error);
      return false;
    }
  },

  // ============ ONBOARDING ============
  
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
      return value === 'true';
    } catch (error) {
      return false;
    }
  },

  async setOnboardingComplete(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============ FEATURE OVERLAY ============
  
  async shouldShowFeatureOverlay(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.FEATURE_OVERLAY_SHOWN);
      return value !== 'true'; // Show if NOT already shown
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

  // ============ BOOKMARKS ============
  
  async getBookmarks(): Promise<BookmarkedArticle[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BOOKMARKS);
      return safeJsonParse<BookmarkedArticle[]>(data, []);
    } catch (error) {
      console.error('[Storage] getBookmarks error:', error);
      return [];
    }
  },

  async addBookmark(article: Omit<BookmarkedArticle, 'bookmarkedAt'>): Promise<boolean> {
    try {
      const bookmarks = await this.getBookmarks();
      if (bookmarks.some(b => b.id === article.id)) return false; // Already exists
      
      const newBookmark: BookmarkedArticle = {
        ...article,
        bookmarkedAt: new Date().toISOString(),
      };
      
      bookmarks.unshift(newBookmark);
      await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      return true;
    } catch (error) {
      console.error('[Storage] addBookmark error:', error);
      return false;
    }
  },

  async removeBookmark(articleId: string): Promise<boolean> {
    try {
      const bookmarks = await this.getBookmarks();
      const filtered = bookmarks.filter(b => b.id !== articleId);
      await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('[Storage] removeBookmark error:', error);
      return false;
    }
  },

  async isBookmarked(articleId: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.some(b => b.id === articleId);
  },

  // ============ KEYWORDS (For You) ============
  
  async getKeywords(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.KEYWORDS);
      return safeJsonParse<string[]>(data, []);
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

  // ============ LOCATIONS (For You) ============
  
  async getLocations(): Promise<LocationPreferences> {
    try {
      const data = await AsyncStorage.getItem(KEYS.LOCATIONS);
      return safeJsonParse<LocationPreferences>(data, { countries: [], cities: [] });
    } catch (error) {
      return { countries: [], cities: [] };
    }
  },

  async saveLocations(locations: LocationPreferences): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.LOCATIONS, JSON.stringify(locations));
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============ THEME ============
  
  async getThemeMode(): Promise<'light' | 'dark' | 'system'> {
    try {
      const value = await AsyncStorage.getItem(KEYS.THEME_MODE);
      if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
      }
      return 'system';
    } catch (error) {
      return 'system';
    }
  },

  async saveThemeMode(mode: 'light' | 'dark' | 'system'): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.THEME_MODE, mode);
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============ NOTIFICATIONS ============
  
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.NOTIFICATION_SETTINGS);
      return safeJsonParse<NotificationSettings>(data, {
        breakingNews: true,
        dailyDigest: true,
        categoryAlerts: false,
      });
    } catch (error) {
      return { breakingNews: true, dailyDigest: true, categoryAlerts: false };
    }
  },

  async saveNotificationSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============ OFFLINE ARTICLES ============
  
  async getOfflineArticles(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.OFFLINE_ARTICLES);
      return safeJsonParse<any[]>(data, []);
    } catch (error) {
      return [];
    }
  },

  async saveOfflineArticles(articles: any[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.OFFLINE_ARTICLES, JSON.stringify(articles));
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============ UTILITY ============
  
  async clearAll(): Promise<boolean> {
    try {
      const keys = Object.values(KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('[Storage] All data cleared');
      return true;
    } catch (error) {
      console.error('[Storage] clearAll error:', error);
      return false;
    }
  },

  async getStorageSummary(): Promise<Record<string, boolean>> {
    const summary: Record<string, boolean> = {};
    for (const [name, key] of Object.entries(KEYS)) {
      try {
        const value = await AsyncStorage.getItem(key);
        summary[name] = value !== null;
      } catch {
        summary[name] = false;
      }
    }
    return summary;
  },
};

// Default export for convenience
export default Storage;
