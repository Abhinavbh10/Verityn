import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabRefreshEvents } from '../../src/utils/tabRefresh';

// Inshorts-style: Force dark theme colors
const DARK_COLORS = {
  background: '#000000',
  card: '#0A0A0A',
  text: '#FFFFFF',
  textMuted: '#888888',
  border: '#222222',
  primary: '#FF6B35',
};

export default function TabLayout() {
  const colors = DARK_COLORS;
  const insets = useSafeAreaInsets();
  
  // More robust bottom padding calculation for Android devices with gesture navigation
  const androidBottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8) + 12
    : 0;
  
  const iosBottomPadding = Platform.OS === 'ios' ? insets.bottom : 0;
  
  const bottomPadding = Platform.select({
    android: androidBottomPadding,
    ios: iosBottomPadding + 8,
    default: 8,
  });
  
  const tabBarHeight = Platform.select({
    android: 60 + androidBottomPadding,
    ios: 50 + iosBottomPadding + 8,
    default: 60,
  });
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            TabRefreshEvents.emit('home');
          },
        }}
      />
      <Tabs.Screen
        name="foryou"
        options={{
          title: 'For You',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            TabRefreshEvents.emit('foryou');
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            TabRefreshEvents.emit('bookmarks');
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
