import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Cross-platform storage that uses SecureStore on native and localStorage on web
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return true;
      }
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      return false;
    }
  },

  async deleteItem(key: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return true;
      }
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error deleting item ${key}:`, error);
      return false;
    }
  },
};
