/**
 * Home Screen - Clean Architecture Version
 * 
 * Key principles:
 * 1. Single source of truth for storage (Storage from src/storage)
 * 2. Simple state management
 * 3. Clear data flow: Storage -> State -> UI
 * 4. No network pre-checks (unreliable on Android)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Share, Platform, Vibration, Image,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Unified imports
import Storage from '../../src/storage';
import { useNews } from '../../src/hooks/useNews';
import { Article } from '../../src/services/NewsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Categories
const CATEGORIES = [
  { id: 'politics', name: 'Politics' },
  { id: 'business', name: 'Business' },
  { id: 'technology', name: 'Technology' },
  { id: 'sports', name: 'Sports' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health', name: 'Health' },
  { id: 'science', name: 'Science' },
];

// Dark theme colors
const COLORS = {
  background: '#000000',
  card: '#0A0A0A',
  cardBorder: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textMuted: '#666666',
  primary: '#FF6B35',
  error: '#FF4444',
  success: '#00C853',
};

// Truncate text helper
const truncateText = (text: string, maxWords: number = 80): string => {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

// Format time helper
const formatTime = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
};

// Article Card Component
const ArticleCard = React.memo(({ 
  article, 
  cardHeight, 
  isBookmarked,
  onBookmark,
  onShare,
  onReadMore,
}: {
  article: Article;
  cardHeight: number;
  isBookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
  onReadMore: () => void;
}) => {
  const imageHeight = cardHeight * 0.48;
  const contentHeight = cardHeight * 0.52;

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      {/* Image Section */}
      <View style={[styles.imageSection, { height: imageHeight }]}>
        {article.image_url ? (
          <Image
            source={{ uri: article.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
          </View>
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.imageGradient}
        />

        {/* Source badge */}
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{article.source?.toUpperCase()}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={onBookmark} style={styles.actionButton}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Section */}
      <View style={[styles.contentSection, { height: contentHeight }]}>
        {/* Category & Time */}
        <View style={styles.metaRow}>
          <Text style={styles.categoryBadge}>{article.category?.toUpperCase()}</Text>
          <Text style={styles.timeText}>{formatTime(article.published)}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={4}>
          {truncateText(article.description, 80)}
        </Text>

        {/* Read More */}
        <TouchableOpacity onPress={onReadMore} style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>Read full story</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Main Home Screen
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  // Get categories from navigation params (passed from onboarding)
  const { initialCategories } = useLocalSearchParams<{ initialCategories?: string }>();

  // State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  // Calculate card height
  const TAB_BAR_HEIGHT = 80;
  const HEADER_HEIGHT = 50;
  const CARD_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT - HEADER_HEIGHT - insets.top;

  // News hook - only initialize after categories are loaded
  const [newsState, newsActions] = useNews(selectedCategories);

  /**
   * Load preferences on mount
   * Priority: URL params > Storage > Defaults
   */
  useEffect(() => {
    const loadData = async () => {
      console.log('[Home] Loading data...');
      
      let categories: string[] = [];

      // Priority 1: Categories from URL params (from onboarding)
      if (initialCategories) {
        categories = initialCategories.split(',').filter(c => c.trim());
        console.log('[Home] Using categories from params:', categories);
      }

      // Priority 2: Categories from storage
      if (categories.length === 0) {
        const prefs = await Storage.getPreferences();
        if (prefs?.categories?.length) {
          categories = prefs.categories;
          console.log('[Home] Using categories from storage:', categories);
        }
      }

      // Priority 3: Default categories
      if (categories.length === 0) {
        categories = ['politics', 'business', 'technology'];
        console.log('[Home] Using default categories:', categories);
      }

      setSelectedCategories(categories);

      // Load bookmarks
      const bookmarks = await Storage.getBookmarks();
      setBookmarkedIds(new Set(bookmarks.map(b => b.id)));

      setIsReady(true);
    };

    loadData();
  }, [initialCategories]);

  /**
   * Refresh preferences when screen is focused (returning from settings)
   */
  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      
      const checkPreferences = async () => {
        const prefs = await Storage.getPreferences();
        if (prefs?.categories) {
          const changed =
            prefs.categories.length !== selectedCategories.length ||
            !prefs.categories.every(c => selectedCategories.includes(c));
          
          if (changed) {
            console.log('[Home] Preferences changed, updating...');
            setSelectedCategories(prefs.categories);
            setActiveFilter('all');
          }
        }
      };
      checkPreferences();
    }, [isReady, selectedCategories])
  );

  /**
   * Filter articles by category
   */
  const filteredArticles = activeFilter === 'all'
    ? newsState.articles
    : newsState.articles.filter(a => a.category === activeFilter);

  /**
   * Handle category filter change
   */
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  /**
   * Bookmark handling
   */
  const handleBookmark = async (article: Article) => {
    if (bookmarkedIds.has(article.id)) {
      await Storage.removeBookmark(article.id);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(article.id);
        return next;
      });
    } else {
      await Storage.addBookmark({
        id: article.id,
        title: article.title,
        description: article.description,
        link: article.link,
        published: article.published,
        source: article.source,
        category: article.category,
        image_url: article.image_url,
      });
      setBookmarkedIds(prev => new Set([...prev, article.id]));
      if (Platform.OS !== 'web') Vibration.vibrate(50);
    }
  };

  /**
   * Share handling
   */
  const handleShare = async (article: Article) => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nRead more: ${article.link}`,
        url: article.link,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  /**
   * Read more handling
   */
  const handleReadMore = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Browser error:', error);
    }
  };

  /**
   * Render loading state
   */
  if (!isReady || (newsState.loading === 'loading' && newsState.articles.length === 0)) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading news...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (newsState.loading === 'error' && newsState.articles.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.errorTitle}>Unable to Load News</Text>
            <Text style={styles.errorMessage}>{newsState.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={newsActions.retry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /**
   * Render main content
   */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header with Category Pills */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <FlatList
          horizontal
          data={[
            { id: 'all', name: 'My Feed' },
            ...CATEGORIES.filter(c => selectedCategories.includes(c.id))
          ]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => handleFilterChange(item.id)}
            >
              <Text style={[
                styles.categoryText,
                activeFilter === item.id && styles.categoryTextActive
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Offline Banner */}
      {newsState.isOfflineData && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={COLORS.text} />
          <Text style={styles.offlineBannerText}>Showing saved articles</Text>
        </View>
      )}

      {/* Error Banner */}
      {newsState.error && !newsState.isOfflineData && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{newsState.error}</Text>
          <TouchableOpacity onPress={newsActions.retry}>
            <Text style={styles.retryLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Articles List */}
      <FlatList
        ref={flatListRef}
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            cardHeight={CARD_HEIGHT}
            isBookmarked={bookmarkedIds.has(item.id)}
            onBookmark={() => handleBookmark(item)}
            onShare={() => handleShare(item)}
            onReadMore={() => handleReadMore(item.link)}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={CARD_HEIGHT}
        decelerationRate="fast"
        refreshControl={
          <RefreshControl
            refreshing={newsState.loading === 'refreshing'}
            onRefresh={newsActions.refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        onEndReached={newsActions.loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { height: CARD_HEIGHT }]}>
            <Ionicons name="newspaper-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Stories Found</Text>
            <Text style={styles.emptyMessage}>
              {selectedCategories.length === 0
                ? 'Please select categories in settings'
                : 'Pull down to refresh'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Header
  header: {
    backgroundColor: COLORS.background,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 24,
  },
  categoryItem: {
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  categoryTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },

  // Banners
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBorder,
  },
  offlineBannerText: {
    fontSize: 12,
    color: COLORS.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.error + '20',
  },
  errorBannerText: {
    fontSize: 12,
    color: COLORS.error,
  },
  retryLink: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
  },
  imageSection: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  sourceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  contentSection: {
    padding: 16,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    flex: 1,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Empty
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
