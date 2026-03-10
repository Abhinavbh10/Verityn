/**
 * useNews Hook - Simplified and Robust
 * 
 * Key design decisions:
 * 1. ALWAYS try API first - don't pre-check network status (unreliable on Android)
 * 2. Fall back to cache ONLY if API actually fails
 * 3. Simple state management - avoid complex loading states
 * 4. Clear error messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsService, Article } from '../services/NewsService';
import Storage from '../storage';

export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error';

export interface NewsState {
  articles: Article[];
  loading: LoadingState;
  error: string | null;
  hasMore: boolean;
  isOfflineData: boolean;
}

export interface NewsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
}

const PAGE_SIZE = 15;

export function useNews(categories: string[]): [NewsState, NewsActions] {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [offset, setOffset] = useState(0);
  
  const isMounted = useRef(true);
  const categoriesRef = useRef<string[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  /**
   * Fetch news - ALWAYS tries API first
   */
  const fetchNews = useCallback(async (
    fetchOffset: number = 0,
    isRefresh: boolean = false
  ): Promise<void> => {
    // Validate categories
    if (!categories || categories.length === 0) {
      setError('No categories selected. Please select at least one category in settings.');
      setLoading('idle');
      return;
    }

    // Set loading state
    setLoading(isRefresh ? 'refreshing' : 'loading');
    if (isRefresh) {
      setError(null);
    }

    try {
      console.log('[useNews] Fetching:', categories, 'offset:', fetchOffset);
      
      // ALWAYS try API first - don't check network status
      const response = await NewsService.fetchNews(
        categories,
        PAGE_SIZE,
        fetchOffset,
        { forceRefresh: isRefresh }
      );

      if (!isMounted.current) return;

      // Success - update state
      if (fetchOffset === 0) {
        setArticles(response.articles);
      } else {
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newArticles = response.articles.filter(a => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });
      }

      setHasMore(response.has_more);
      setOffset(fetchOffset + response.articles.length);
      setIsOfflineData(false);
      setError(null);
      setLoading('idle');

      // Cache for offline use
      if (fetchOffset === 0 && response.articles.length > 0) {
        Storage.saveOfflineArticles(response.articles);
      }

    } catch (err: any) {
      if (!isMounted.current) return;

      console.error('[useNews] API Error:', err.message);

      // API failed - try offline cache
      try {
        const cachedArticles = await Storage.getOfflineArticles();
        if (cachedArticles.length > 0) {
          setArticles(cachedArticles);
          setIsOfflineData(true);
          setError('Unable to connect. Showing saved articles.');
          setLoading('idle');
          return;
        }
      } catch (cacheErr) {
        console.error('[useNews] Cache error:', cacheErr);
      }

      // No cache available
      setError('Unable to load news. Please check your internet connection and try again.');
      setLoading('error');
    }
  }, [categories]);

  /**
   * Initial load and category change detection
   */
  useEffect(() => {
    const categoriesChanged = 
      categories.length !== categoriesRef.current.length ||
      !categories.every(c => categoriesRef.current.includes(c));

    if (categoriesChanged && categories.length > 0) {
      console.log('[useNews] Categories changed, fetching...');
      categoriesRef.current = [...categories];
      fetchNews(0, false);
    }
  }, [categories, fetchNews]);

  /**
   * Actions
   */
  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchNews(0, true);
  }, [fetchNews]);

  const loadMore = useCallback(async () => {
    if (loading !== 'idle' || !hasMore || isOfflineData) return;
    await fetchNews(offset, false);
  }, [loading, hasMore, isOfflineData, offset, fetchNews]);

  const retry = useCallback(async () => {
    await fetchNews(0, true);
  }, [fetchNews]);

  // Return state and actions
  const state: NewsState = {
    articles,
    loading,
    error,
    hasMore,
    isOfflineData,
  };

  const actions: NewsActions = {
    refresh,
    loadMore,
    retry,
  };

  return [state, actions];
}
