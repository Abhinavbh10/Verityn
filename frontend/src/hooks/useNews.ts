/**
 * useNews Hook - Enterprise-grade news fetching with network awareness
 * Handles loading, error states, offline mode, and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NetworkManager, NetworkState } from '../services/NetworkManager';
import { NewsService, Article, NewsServiceError } from '../services/NewsService';
import { OfflineNewsCache } from '../services/OfflineNewsCache';

export type NewsLoadingState = 'idle' | 'loading' | 'refreshing' | 'loading-more' | 'offline-loading';

export interface UseNewsState {
  articles: Article[];
  loadingState: NewsLoadingState;
  error: string | null;
  isOffline: boolean;
  isOfflineData: boolean;
  hasMore: boolean;
  currentOffset: number;
  lastUpdated: Date | null;
  networkStatus: 'online' | 'offline' | 'checking';
}

export interface UseNewsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
  clearError: () => void;
}

export interface UseNewsOptions {
  initialLoad?: boolean;
  autoRefreshOnReconnect?: boolean;
  cacheForOffline?: boolean;
  pageSize?: number;
}

const DEFAULT_OPTIONS: UseNewsOptions = {
  initialLoad: true,
  autoRefreshOnReconnect: true,
  cacheForOffline: true,
  pageSize: 15,
};

export function useNews(
  categories: string[],
  options: UseNewsOptions = {}
): [UseNewsState, UseNewsActions] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingState, setLoadingState] = useState<NewsLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Refs
  const isMounted = useRef(true);
  const previousCategories = useRef<string[]>([]);
  const isInitialLoad = useRef(true);
  const wasOffline = useRef(false);

  /**
   * Fetch news from API or cache
   */
  const fetchNews = useCallback(async (
    offset: number = 0,
    isRefresh: boolean = false
  ): Promise<void> => {
    if (!categories.length) {
      setError('No categories selected');
      return;
    }

    const isInitial = offset === 0;

    try {
      // Set appropriate loading state
      if (isRefresh) {
        setLoadingState('refreshing');
      } else if (isInitial) {
        setLoadingState('loading');
      } else {
        setLoadingState('loading-more');
      }

      setError(null);

      // ALWAYS try API first - NetworkManager.isOnline() is unreliable on Android first launch
      // Only use offline cache if the API call actually fails
      try {
        console.log('[useNews] Fetching from API...');
        
        const response = await NewsService.fetchNews(
          categories,
          opts.pageSize!,
          offset,
          { forceRefresh: isRefresh }
        );

        if (!isMounted.current) return;

        // API succeeded - we're online
        setIsOffline(false);
        setIsOfflineData(false);

        if (isInitial) {
          setArticles(response.articles);
        } else {
          // Append new articles, avoiding duplicates
          setArticles(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const newArticles = response.articles.filter(a => !existingIds.has(a.id));
            return [...prev, ...newArticles];
          });
        }

        setHasMore(response.has_more);
        setCurrentOffset(offset + response.articles.length);
        setLastUpdated(new Date());

        // Cache for offline use
        if (opts.cacheForOffline && isInitial && response.articles.length > 0) {
          OfflineNewsCache.cacheArticles(response.articles, categories);
        }

      } catch (apiError: any) {
        // API failed - try offline cache
        console.log('[useNews] API failed, trying offline cache:', apiError.message);
        setIsOffline(true);
        setLoadingState('offline-loading');
        
        const cachedArticles = await OfflineNewsCache.getCachedArticles(categories);
        
        if (cachedArticles.length > 0) {
          setArticles(cachedArticles);
          setIsOfflineData(true);
          setHasMore(false);
          setError('You\'re offline. Showing cached articles.');
        } else {
          // No cache available
          throw apiError; // Re-throw to be caught by outer catch
        }
      }

    } catch (err: any) {
      if (!isMounted.current) return;

      console.error('[useNews] Error fetching news:', err);
      
      let errorMessage = 'Failed to load news. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (err.message.includes('network') || err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      setError(errorMessage);
    } finally {
      if (isMounted.current) {
        setLoadingState('idle');
      }
    }
  }, [categories, opts.pageSize, opts.cacheForOffline]);

  /**
   * Refresh news (pull to refresh)
   */
  const refresh = useCallback(async (): Promise<void> => {
    setCurrentOffset(0);
    setHasMore(true);
    await fetchNews(0, true);
  }, [fetchNews]);

  /**
   * Load more articles (infinite scroll)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingState !== 'idle' || !hasMore || isOffline) return;
    await fetchNews(currentOffset, false);
  }, [fetchNews, loadingState, hasMore, isOffline, currentOffset]);

  /**
   * Retry after error
   */
  const retry = useCallback(async (): Promise<void> => {
    setError(null);
    await fetchNews(0, true);
  }, [fetchNews]);

  /**
   * Clear error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initialize network manager and services
  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      await NetworkManager.initialize();
      await OfflineNewsCache.initialize();
    };

    init();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = NetworkManager.subscribe((state: NetworkState) => {
      setNetworkStatus(state.status);
      const online = state.isConnected && state.isInternetReachable !== false;
      
      // Auto-refresh when coming back online
      if (wasOffline.current && online && opts.autoRefreshOnReconnect) {
        console.log('[useNews] Connection restored - refreshing');
        refresh();
      }
      
      wasOffline.current = !online;
      setIsOffline(!online);
    });

    return unsubscribe;
  }, [refresh, opts.autoRefreshOnReconnect]);

  // Handle app state changes (refresh when app comes to foreground after long time)
  useEffect(() => {
    let lastBackground: number | null = null;
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        lastBackground = Date.now();
      } else if (nextState === 'active' && lastBackground) {
        const elapsed = Date.now() - lastBackground;
        if (elapsed > STALE_THRESHOLD && NetworkManager.isOnline()) {
          console.log('[useNews] App resumed after long time - refreshing');
          refresh();
        }
        lastBackground = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refresh]);

  // Initial load and category change handling
  useEffect(() => {
    const categoriesChanged = 
      categories.length !== previousCategories.current.length ||
      !categories.every(cat => previousCategories.current.includes(cat));

    // Always update previousCategories when they change
    if (categoriesChanged) {
      console.log('[useNews] Categories changed:', previousCategories.current, '->', categories);
      previousCategories.current = [...categories];
    }

    // Fetch when:
    // 1. Initial load is enabled AND this is the first load AND we have categories
    // 2. Categories have changed AND we have categories
    const shouldFetch = 
      (isInitialLoad.current && opts.initialLoad && categories.length > 0) ||
      (categoriesChanged && categories.length > 0 && !isInitialLoad.current);

    if (shouldFetch) {
      console.log('[useNews] Triggering fetch, isInitial:', isInitialLoad.current);
      isInitialLoad.current = false;
      fetchNews(0, false);
    }
  }, [categories, opts.initialLoad, fetchNews]);

  const state: UseNewsState = {
    articles,
    loadingState,
    error,
    isOffline,
    isOfflineData,
    hasMore,
    currentOffset,
    lastUpdated,
    networkStatus,
  };

  const actions: UseNewsActions = {
    refresh,
    loadMore,
    retry,
    clearError,
  };

  return [state, actions];
}
