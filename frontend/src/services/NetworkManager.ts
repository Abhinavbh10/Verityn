/**
 * Enterprise-Grade Network Manager
 * Handles network state detection, monitoring, and auto-reconnection
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export type NetworkStatus = 'online' | 'offline' | 'checking';

export interface NetworkState {
  status: NetworkStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  lastChecked: Date;
  lastOnline: Date | null;
}

type NetworkListener = (state: NetworkState) => void;

class NetworkManagerClass {
  private state: NetworkState = {
    status: 'checking',
    isConnected: false,
    isInternetReachable: null,
    connectionType: 'unknown',
    lastChecked: new Date(),
    lastOnline: null,
  };

  private listeners: Set<NetworkListener> = new Set();
  private subscription: NetInfoSubscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL_BASE = 2000; // 2 seconds
  private isInitialized: boolean = false;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial state
      const initialState = await NetInfo.fetch();
      this.updateState(initialState);

      // Subscribe to network changes
      this.subscription = NetInfo.addEventListener((state) => {
        this.handleNetworkChange(state);
      });

      this.isInitialized = true;
      console.log('[NetworkManager] Initialized:', this.state.status);
    } catch (error) {
      console.error('[NetworkManager] Initialization error:', error);
      // Assume online if we can't check (better UX than blocking)
      this.state.status = 'online';
      this.state.isConnected = true;
    }
  }

  /**
   * Get current network state
   */
  getState(): NetworkState {
    return { ...this.state };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.state.isConnected && this.state.isInternetReachable !== false;
  }

  /**
   * Force a network check
   */
  async checkConnection(): Promise<boolean> {
    try {
      this.state.status = 'checking';
      this.notifyListeners();

      const netState = await NetInfo.fetch();
      this.updateState(netState);

      // Additional reachability check via actual HTTP request
      if (netState.isConnected) {
        const reachable = await this.pingServer();
        if (!reachable) {
          this.state.isInternetReachable = false;
          this.state.status = 'offline';
        }
      }

      this.notifyListeners();
      return this.isOnline();
    } catch (error) {
      console.error('[NetworkManager] Check connection error:', error);
      return false;
    }
  }

  /**
   * Ping server to verify actual internet connectivity
   */
  private async pingServer(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Use a lightweight endpoint
      const response = await fetch('https://news-feed-eu.preview.emergentagent.com/api/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(netState: NetInfoState): void {
    const wasOnline = this.isOnline();
    this.updateState(netState);
    const isNowOnline = this.isOnline();

    // Detect reconnection
    if (!wasOnline && isNowOnline) {
      console.log('[NetworkManager] Connection restored');
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.notifyListeners();
    }
    // Detect disconnection
    else if (wasOnline && !isNowOnline) {
      console.log('[NetworkManager] Connection lost');
      this.scheduleReconnectCheck();
      this.notifyListeners();
    }
  }

  /**
   * Update internal state
   */
  private updateState(netState: NetInfoState): void {
    const wasOffline = !this.isOnline();

    this.state = {
      status: netState.isConnected && netState.isInternetReachable !== false ? 'online' : 'offline',
      isConnected: netState.isConnected ?? false,
      isInternetReachable: netState.isInternetReachable,
      connectionType: netState.type,
      lastChecked: new Date(),
      lastOnline: netState.isConnected ? new Date() : this.state.lastOnline,
    };

    // If we just came online, notify listeners
    if (wasOffline && this.isOnline()) {
      this.notifyListeners();
    }
  }

  /**
   * Schedule a reconnection check with exponential backoff
   */
  private scheduleReconnectCheck(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log('[NetworkManager] Max reconnect attempts reached');
      return;
    }

    this.clearReconnectTimer();

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = this.RECONNECT_INTERVAL_BASE * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[NetworkManager] Scheduling reconnect check in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      const isOnline = await this.checkConnection();
      if (!isOnline) {
        this.scheduleReconnectCheck();
      }
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[NetworkManager] Listener error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearReconnectTimer();
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const NetworkManager = new NetworkManagerClass();
