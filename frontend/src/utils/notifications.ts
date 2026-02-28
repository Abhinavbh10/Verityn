import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const NOTIFICATION_SETTINGS_KEY = 'verityn_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  dailyDigest: boolean;
  digestTime: string; // HH:mm format
  categories: string[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyDigest: false,
  digestTime: '09:00',
  categories: [],
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    // For Android, set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('news-updates', {
        name: 'News Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const stored = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
  }
  return DEFAULT_SETTINGS;
};

export const saveNotificationSettings = async (settings: NotificationSettings): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    
    // Cancel existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule daily digest if enabled
    if (settings.enabled && settings.dailyDigest) {
      const [hours, minutes] = settings.digestTime.split(':').map(Number);
      await scheduleDailyDigest(hours, minutes);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return false;
  }
};

export const scheduleDailyDigest = async (hour: number, minute: number): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Verityn Daily Digest',
        body: 'Check out the latest news from Europe!',
        data: { type: 'daily_digest' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.error('Error scheduling daily digest:', error);
  }
};

export const sendLocalNotification = async (title: string, body: string, data?: any): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
