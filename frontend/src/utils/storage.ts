import { secureStorage } from './secureStorage';

const STORAGE_KEY = 'verityn_user_preferences';

export interface UserPreferences {
  categories: string[];
  updatedAt: string;
}

export const getPreferences = async (): Promise<UserPreferences | null> => {
  try {
    const stored = await secureStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting preferences:', error);
  }
  return null;
};

export const savePreferences = async (categories: string[]): Promise<boolean> => {
  try {
    const preferences: UserPreferences = {
      categories,
      updatedAt: new Date().toISOString(),
    };
    await secureStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
};

export const clearPreferences = async (): Promise<boolean> => {
  try {
    await secureStorage.deleteItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing preferences:', error);
    return false;
  }
};

export const hasPreferences = async (): Promise<boolean> => {
  const prefs = await getPreferences();
  return prefs !== null && prefs.categories.length > 0;
};
