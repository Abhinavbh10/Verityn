/**
 * Enterprise-Grade Offline News Cache
 * Smart caching for offline reading with automatic sync
 */

import { secureStorage } from '../utils/secureStorage';
import { Article } from './NewsService';

const OFFLINE_CACHE_KEY = 'verityn_offline_news_cache';
const OFFLINE_CACHE_META_KEY = 'verityn_offline_cache_meta';
const MAX_CACHED_ARTICLES = 100;
const CACHE_EXPIRY_HOURS = 24;

interface CacheMeta {
  lastUpdated: string;
  articleCount: number;
  categories: string[];
  version: number;
}

interface CachedArticle extends Article {
  cachedAt: string;
  expiresAt: string;
}

class OfflineNewsCacheClass {
  private memoryCache: CachedArticle[] = [];
  private isLoaded: boolean = false;

  /**
   * Initialize cache from storage
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const stored = await secureStorage.getItem(OFFLINE_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired articles
        const now = new Date().toISOString();
        this.memoryCache = parsed.filter((a: CachedArticle) => a.expiresAt > now);
      }
      this.isLoaded = true;
      console.log(`[OfflineCache] Loaded ${this.memoryCache.length} cached articles`);
    } catch (error) {
      console.error('[OfflineCache] Init error:', error);
      this.memoryCache = [];
      this.isLoaded = true;
    }
  }

  /**
   * Cache articles for offline reading
   */
  async cacheArticles(articles: Article[], categories: string[]): Promise<void> {
    await this.initialize();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

    const newCached: CachedArticle[] = articles.map(article => ({
      ...article,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }));

    // Merge with existing cache, avoiding duplicates
    const existingIds = new Set(this.memoryCache.map(a => a.id));
    const uniqueNew = newCached.filter(a => !existingIds.has(a.id));

    // Add new articles to front
    this.memoryCache = [...uniqueNew, ...this.memoryCache];

    // Trim to max size
    if (this.memoryCache.length > MAX_CACHED_ARTICLES) {
      this.memoryCache = this.memoryCache.slice(0, MAX_CACHED_ARTICLES);
    }

    // Persist to storage
    await this.persistCache();

    // Update meta
    await this.updateMeta(categories);

    console.log(`[OfflineCache] Cached ${uniqueNew.length} new articles (total: ${this.memoryCache.length})`);
  }

  /**
   * Get cached articles
   */
  async getCachedArticles(categories?: string[]): Promise<Article[]> {
    await this.initialize();

    // Filter out expired articles
    const now = new Date().toISOString();
    const valid = this.memoryCache.filter(a => a.expiresAt > now);

    if (categories && categories.length > 0) {
      return valid.filter(a => categories.includes(a.category.toLowerCase()));
    }

    return valid;
  }

  /**
   * Get cached articles by category
   */
  async getCachedByCategory(category: string): Promise<Article[]> {
    const articles = await this.getCachedArticles();
    return articles.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Check if we have cached content
   */
  async hasCachedContent(): Promise<boolean> {
    await this.initialize();
    const now = new Date().toISOString();
    return this.memoryCache.some(a => a.expiresAt > now);
  }

  /**
   * Get cache metadata
   */
  async getCacheMeta(): Promise<CacheMeta | null> {
    try {
      const stored = await secureStorage.getItem(OFFLINE_CACHE_META_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OfflineCache] Get meta error:', error);
    }
    return null;
  }

  /**
   * Clear all cached articles
   */
  async clearCache(): Promise<void> {
    this.memoryCache = [];
    await secureStorage.deleteItem(OFFLINE_CACHE_KEY);
    await secureStorage.deleteItem(OFFLINE_CACHE_META_KEY);
    console.log('[OfflineCache] Cache cleared');
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    articleCount: number;
    oldestArticle: string | null;
    newestArticle: string | null;
    categories: string[];
    storageSize: number;
  }> {
    await this.initialize();

    const categories = [...new Set(this.memoryCache.map(a => a.category))];
    const sorted = [...this.memoryCache].sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );

    return {
      articleCount: this.memoryCache.length,
      oldestArticle: sorted.length > 0 ? sorted[sorted.length - 1].published : null,
      newestArticle: sorted.length > 0 ? sorted[0].published : null,
      categories,
      storageSize: JSON.stringify(this.memoryCache).length,
    };
  }

  /**
   * Persist cache to storage
   */
  private async persistCache(): Promise<void> {
    try {
      await secureStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(this.memoryCache));
    } catch (error) {
      console.error('[OfflineCache] Persist error:', error);
      // If storage is full, trim and retry
      if (this.memoryCache.length > 50) {
        this.memoryCache = this.memoryCache.slice(0, 50);
        await secureStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(this.memoryCache));
      }
    }
  }

  /**
   * Update cache metadata
   */
  private async updateMeta(categories: string[]): Promise<void> {
    const meta: CacheMeta = {
      lastUpdated: new Date().toISOString(),
      articleCount: this.memoryCache.length,
      categories,
      version: 1,
    };

    try {
      await secureStorage.setItem(OFFLINE_CACHE_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.error('[OfflineCache] Update meta error:', error);
    }
  }
}

// Singleton instance
export const OfflineNewsCache = new OfflineNewsCacheClass();
