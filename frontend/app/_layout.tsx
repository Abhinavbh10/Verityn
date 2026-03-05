import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../src/utils/theme';
import { 
  initializeFirebase, 
  requestNotificationPermission, 
  getFCMToken,
  onForegroundMessage,
  setBackgroundMessageHandler,
  getInitialNotification,
  subscribeToTopic,
  logScreenView,
} from '../src/utils/firebase';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Set up background message handler (must be at top level)
setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[Firebase] Background message:', remoteMessage);
});

function RootLayoutContent() {
  const { isDark, colors } = useTheme();

  useEffect(() => {
    // Initialize Firebase and set up notifications
    const initApp = async () => {
      // Initialize Firebase services
      await initializeFirebase();
      
      // Log initial screen view
      await logScreenView('app_launch');
      
      // Request notification permission on native platforms
      if (Platform.OS !== 'web') {
        const hasPermission = await requestNotificationPermission();
        
        if (hasPermission) {
          // Get FCM token for this device
          const token = await getFCMToken();
          if (token) {
            console.log('[Firebase] FCM Token:', token.substring(0, 20) + '...');
            // Subscribe to general news topic
            await subscribeToTopic('news_general');
          }
        }
        
        // Check if app was opened from a notification
        const initialNotification = await getInitialNotification();
        if (initialNotification) {
          console.log('[Firebase] App opened from notification:', initialNotification.data);
          // Handle deep linking based on notification data here
        }
      }
      
      // Hide splash screen
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };

    initApp();

    // Set up foreground message handler
    const unsubscribe = onForegroundMessage(async (remoteMessage: any) => {
      console.log('[Firebase] Foreground message:', remoteMessage);
      
      // Show alert for foreground notifications
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'News Update',
          remoteMessage.notification.body || '',
          [{ text: 'OK', style: 'default' }]
        );
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
