/**
 * Network Status Banner - Shows connection status to users
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkManager, NetworkState } from '../services/NetworkManager';

interface NetworkBannerProps {
  onRetry?: () => void;
  style?: any;
}

export const NetworkStatusBanner: React.FC<NetworkBannerProps> = ({ onRetry, style }) => {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-60))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Initialize and subscribe
    NetworkManager.initialize();

    const unsubscribe = NetworkManager.subscribe((state) => {
      setNetworkState(state);
      
      const shouldShow = state.status === 'offline' || 
                        (state.status === 'checking' && !state.isConnected);
      
      if (shouldShow !== isVisible) {
        setIsVisible(shouldShow);
        
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: shouldShow ? 0 : -60,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    return unsubscribe;
  }, [isVisible]);

  if (!isVisible && !networkState) return null;

  const isOffline = networkState?.status === 'offline';
  const isChecking = networkState?.status === 'checking';

  return (
    <Animated.View
      style={[
        styles.container,
        isOffline ? styles.offlineContainer : styles.checkingContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isOffline ? 'cloud-offline-outline' : 'refresh'}
          size={18}
          color={isOffline ? '#fff' : '#B45309'}
        />
        <Text style={[styles.text, isOffline ? styles.offlineText : styles.checkingText]}>
          {isOffline
            ? 'No internet connection'
            : 'Checking connection...'}
        </Text>
      </View>
      
      {isOffline && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

/**
 * Inline offline indicator (smaller, for embedding in headers)
 */
export const OfflineIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    NetworkManager.initialize();
    
    const unsubscribe = NetworkManager.subscribe((state) => {
      setIsOffline(state.status === 'offline');
    });

    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  if (compact) {
    return (
      <View style={styles.compactIndicator}>
        <Ionicons name="cloud-offline" size={14} color="#EF4444" />
      </View>
    );
  }

  return (
    <View style={styles.indicator}>
      <Ionicons name="cloud-offline-outline" size={14} color="#EF4444" />
      <Text style={styles.indicatorText}>Offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineContainer: {
    backgroundColor: '#7C2D12',
  },
  checkingContainer: {
    backgroundColor: '#FEF3C7',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  offlineText: {
    color: '#fff',
  },
  checkingText: {
    color: '#B45309',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  compactIndicator: {
    padding: 4,
  },
});
