import { Platform } from 'react-native';

// Firebase modules - only import on native platforms
let analytics: any = null;
let crashlytics: any = null;
let messaging: any = null;

// Check if we're running on native (not web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Initialize Firebase services
export const initializeFirebase = async () => {
  if (!isNative) {
    console.log('[Firebase] Skipping initialization on web platform');
    return;
  }

  try {
    // Dynamically import Firebase modules on native only
    const firebaseApp = await import('@react-native-firebase/app');
    analytics = (await import('@react-native-firebase/analytics')).default;
    crashlytics = (await import('@react-native-firebase/crashlytics')).default;
    messaging = (await import('@react-native-firebase/messaging')).default;

    console.log('[Firebase] Initialized successfully');
    
    // Enable crashlytics collection
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Log app open event
    await logEvent('app_open', {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
  }
};

// Analytics: Log custom events
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  if (!isNative || !analytics) {
    console.log(`[Analytics] Event (web/mock): ${eventName}`, params);
    return;
  }

  try {
    await analytics().logEvent(eventName, params);
    console.log(`[Analytics] Event logged: ${eventName}`);
  } catch (error) {
    console.error('[Analytics] Error logging event:', error);
  }
};

// Analytics: Log screen view
export const logScreenView = async (screenName: string, screenClass?: string) => {
  if (!isNative || !analytics) {
    console.log(`[Analytics] Screen view (web/mock): ${screenName}`);
    return;
  }

  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`[Analytics] Screen view logged: ${screenName}`);
  } catch (error) {
    console.error('[Analytics] Error logging screen view:', error);
  }
};

// Analytics: Set user properties
export const setUserProperty = async (name: string, value: string) => {
  if (!isNative || !analytics) return;

  try {
    await analytics().setUserProperty(name, value);
  } catch (error) {
    console.error('[Analytics] Error setting user property:', error);
  }
};

// Crashlytics: Log error
export const logError = async (error: Error, context?: string) => {
  if (!isNative || !crashlytics) {
    console.error(`[Crashlytics] Error (web/mock): ${context}`, error);
    return;
  }

  try {
    if (context) {
      await crashlytics().log(context);
    }
    await crashlytics().recordError(error);
    console.log(`[Crashlytics] Error recorded: ${error.message}`);
  } catch (err) {
    console.error('[Crashlytics] Error recording error:', err);
  }
};

// Crashlytics: Log message
export const logMessage = async (message: string) => {
  if (!isNative || !crashlytics) {
    console.log(`[Crashlytics] Message (web/mock): ${message}`);
    return;
  }

  try {
    await crashlytics().log(message);
  } catch (error) {
    console.error('[Crashlytics] Error logging message:', error);
  }
};

// Crashlytics: Set user identifier
export const setUserId = async (userId: string) => {
  if (!isNative || !crashlytics) return;

  try {
    await crashlytics().setUserId(userId);
    if (analytics) {
      await analytics().setUserId(userId);
    }
  } catch (error) {
    console.error('[Crashlytics] Error setting user ID:', error);
  }
};

// Messaging: Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNative || !messaging) {
    console.log('[Messaging] Permission request (web/mock)');
    return false;
  }

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[Messaging] Notification permission granted');
      await logEvent('notification_permission_granted');
    } else {
      console.log('[Messaging] Notification permission denied');
      await logEvent('notification_permission_denied');
    }

    return enabled;
  } catch (error) {
    console.error('[Messaging] Error requesting permission:', error);
    return false;
  }
};

// Messaging: Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  if (!isNative || !messaging) {
    console.log('[Messaging] FCM token (web/mock): null');
    return null;
  }

  try {
    const token = await messaging().getToken();
    console.log('[Messaging] FCM Token obtained');
    return token;
  } catch (error) {
    console.error('[Messaging] Error getting FCM token:', error);
    return null;
  }
};

// Messaging: Subscribe to topic
export const subscribeToTopic = async (topic: string) => {
  if (!isNative || !messaging) return;

  try {
    await messaging().subscribeToTopic(topic);
    console.log(`[Messaging] Subscribed to topic: ${topic}`);
    await logEvent('topic_subscribed', { topic });
  } catch (error) {
    console.error('[Messaging] Error subscribing to topic:', error);
  }
};

// Messaging: Unsubscribe from topic
export const unsubscribeFromTopic = async (topic: string) => {
  if (!isNative || !messaging) return;

  try {
    await messaging().unsubscribeFromTopic(topic);
    console.log(`[Messaging] Unsubscribed from topic: ${topic}`);
    await logEvent('topic_unsubscribed', { topic });
  } catch (error) {
    console.error('[Messaging] Error unsubscribing from topic:', error);
  }
};

// Messaging: Set up foreground message handler
export const onForegroundMessage = (callback: (message: any) => void) => {
  if (!isNative || !messaging) {
    console.log('[Messaging] Foreground handler (web/mock): skipped');
    return () => {};
  }

  return messaging().onMessage(callback);
};

// Messaging: Set up background message handler (call at app root level)
export const setBackgroundMessageHandler = (callback: (message: any) => Promise<void>) => {
  if (!isNative || !messaging) {
    console.log('[Messaging] Background handler (web/mock): skipped');
    return;
  }

  messaging().setBackgroundMessageHandler(callback);
};

// Messaging: Get initial notification (app opened via notification)
export const getInitialNotification = async () => {
  if (!isNative || !messaging) return null;

  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      await logEvent('app_opened_from_notification', {
        notification_id: remoteMessage.messageId,
      });
    }
    return remoteMessage;
  } catch (error) {
    console.error('[Messaging] Error getting initial notification:', error);
    return null;
  }
};

// Export messaging module for direct access if needed
export const getMessaging = () => messaging;
