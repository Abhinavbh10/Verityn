/**
 * Enterprise-Grade News Service
 * Centralized API service with retry logic, caching, and error handling
 */

import { NetworkManager } from './NetworkManager';

// HARDCODED for reliable APK builds - environment variables are unreliable in Expo standalone builds
const API_BASE_URL = 'https://news-feed-eu.preview.emergentagent.com';

export interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  category: string;
  image_url?: string;
}

export interface NewsResponse {
  articles: Article[];
  total: number;
  categories: string[];
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  useCache?: boolean;
  forceRefresh?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RequestState<T> {
  status: RequestStatus;
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  lastFetched: Date | null;
}

const DEFAULT_OPTIONS: FetchOptions = {
  timeout: 15000, // 15 seconds
  retries: 3,
  retryDelay: 1000, // 1 second base delay
  useCache: true,
  forceRefresh: false,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class NewsServiceClass {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Fetch news articles with enterprise-grade reliability
   */
  async fetchNews(
    categories: string[],
    limit: number = 15,
    offset: number = 0,
    options: FetchOptions = {}
  ): Promise<NewsResponse> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cacheKey = `news_${categories.sort().join(',')}_${limit}_${offset}`;

    // Check cache first (unless force refresh)
    if (opts.useCache && !opts.forceRefresh) {
      const cached = this.getFromCache<NewsResponse>(cacheKey);
      if (cached) {
        console.log('[NewsService] Returning cached data for:', cacheKey);
        return cached;
      }
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log('[NewsService] Returning pending request for:', cacheKey);
      return this.pendingRequests.get(cacheKey)!;
    }

    const request = this.executeWithRetry<NewsResponse>(
      async () => {
        const url = `${API_BASE_URL}/api/news?categories=${categories.join(',')}&limit=${limit}&offset=${offset}`;
        return this.fetchWithTimeout(url, opts.timeout!);
      },
      opts.retries!,
      opts.retryDelay!,
      cacheKey
    );

    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      
      // Cache successful response
      if (opts.useCache) {
        this.setCache(cacheKey, result);
      }

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Search news articles
   */
  async searchNews(
    query: string,
    categories?: string[],
    limit: number = 30,
    options: FetchOptions = {}
  ): Promise<{ articles: Article[]; total: number; query: string }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    let url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    if (categories && categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }

    return this.executeWithRetry(
      () => this.fetchWithTimeout(url, opts.timeout!),
      opts.retries!,
      opts.retryDelay!,
      `search_${query}`
    );
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(url: string, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log('[NewsService] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new NewsServiceError(
          `HTTP ${response.status}: ${errorText}`,
          response.status,
          'HTTP_ERROR'
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new NewsServiceError('Request timeout', 0, 'TIMEOUT');
      }

      if (error instanceof NewsServiceError) {
        throw error;
      }

      throw new NewsServiceError(
        error.message || 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    request: () => Promise<T>,
    maxRetries: number,
    baseDelay: number,
    requestId: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check network before attempting
        if (!NetworkManager.isOnline() && attempt === 0) {
          console.log('[NewsService] Offline, checking cached data...');
          // Will be caught and potentially retried if network comes back
        }

        const result = await request();
        
        if (attempt > 0) {
          console.log(`[NewsService] Request succeeded after ${attempt} retries:`, requestId);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        const isLastAttempt = attempt === maxRetries;
        const shouldRetry = this.shouldRetry(error);

        if (isLastAttempt || !shouldRetry) {
          console.error(`[NewsService] Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, requestId, error.message);
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.log(`[NewsService] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, requestId);
        
        await this.sleep(delay);
      }
    }

    throw lastError || new NewsServiceError('Request failed', 0, 'UNKNOWN');
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof NewsServiceError) {
      // Don't retry client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      // Retry server errors (5xx), timeouts, and network errors
      return true;
    }
    return true;
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout<{ status: string }>(
        `${API_BASE_URL}/api/health`,
        5000
      );
      return response.status === 'healthy';
    } catch {
      return false;
    }
  }
}

/**
 * Custom error class for news service
 */
export class NewsServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'NewsServiceError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'TIMEOUT':
        return 'Request timed out. Please check your connection and try again.';
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'HTTP_ERROR':
        if (this.statusCode >= 500) {
          return 'Server is temporarily unavailable. Please try again later.';
        }
        return 'Something went wrong. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Singleton instance
export const NewsService = new NewsServiceClass();
