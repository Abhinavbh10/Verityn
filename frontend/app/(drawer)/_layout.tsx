/**
 * Drawer Navigation Layout
 * Replaces bottom tabs with a left-edge swipe drawer menu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path, Circle } from 'react-native-svg';

// Dark theme colors
const COLORS = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textMuted: '#888888',
  primary: '#FF6B35',
  border: '#222222',
};

// Custom Drawer Content
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
      {/* Header with Logo */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Svg width={40} height={40} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="45" fill="#FF6B35" opacity={0.1} />
            <Path
              d="M50 20 L50 55 M50 55 L35 40 M50 55 L65 40"
              stroke="#FF6B35"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="50" cy="72" r="6" fill="#FF6B35" />
          </Svg>
        </View>
        <Text style={styles.logoText}>Verityn</Text>
        <Text style={styles.tagline}>Your News, Your Way</Text>
      </View>

      {/* Navigation Items */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            backgroundColor: COLORS.background,
            width: 280,
          },
          drawerActiveBackgroundColor: COLORS.card,
          drawerActiveTintColor: COLORS.primary,
          drawerInactiveTintColor: COLORS.textMuted,
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '500',
            marginLeft: -16,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginHorizontal: 12,
            marginVertical: 4,
          },
          swipeEdgeWidth: 50,
          swipeMinDistance: 20,
        }}
      >
        <Drawer.Screen
          name="home"
          options={{
            drawerLabel: 'Home',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="foryou"
          options={{
            drawerLabel: 'For You',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="search"
          options={{
            drawerLabel: 'Search',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="bookmarks"
          options={{
            drawerLabel: 'Saved',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="bookmark" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: 'Settings',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Georgia',
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  drawerContent: {
    paddingTop: 16,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
