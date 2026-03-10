import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/utils/theme';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Inshorts-style: Force dark background at root level
const DARK_BACKGROUND = '#000000';

// Web-specific: Inject dark background style into document
function useWebDarkBackground() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = DARK_BACKGROUND;
      document.body.style.backgroundColor = DARK_BACKGROUND;
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.backgroundColor = DARK_BACKGROUND;
        rootEl.style.minHeight = '100%';
      }
    }
  }, []);
}

function RootLayoutContent() {
  useWebDarkBackground();
  
  useEffect(() => {
    const hideSplash = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await SplashScreen.hideAsync();
    };
    hideSplash();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: DARK_BACKGROUND }}>
      <StatusBar style="light" backgroundColor={DARK_BACKGROUND} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: DARK_BACKGROUND },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: DARK_BACKGROUND }}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
