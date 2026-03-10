/**
 * Home Screen - Inshorts-Inspired Full-Screen News Cards
 * 
 * Design inspired by Inshorts:
 * - Full-screen cards with swipe navigation
 * - Image at top (45-50%)
 * - Compact content area with source, headline, description
 * - "Tap to read more" bar at bottom
 * - Dark theme aesthetic
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Share, Platform, Vibration, Animated, Image,
  RefreshControl, useColorScheme, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Services & Hooks
import { useNews } from '../../src/hooks/useNews';
import { Article } from '../../src/services/NewsService';
import { NetworkStatusBanner } from '../../src/components/NetworkStatusBanner';

// Utils
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getPreferences } from '../../src/utils/storage';
import { useShakeDetector } from '../../src/hooks/useShakeDetector';
import { TabRefreshEvents } from '../../src/utils/tabRefresh';
import { secureStorage } from '../../src/utils/secureStorage';
import FeatureOverlay from '../../src/components/FeatureOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dark-first color scheme (Inshorts style)
const COLORS = {
  light: {
    background: '#FDFBF7',
    surface: '#FFFFFF',
    cardBg: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#B8B8B8',
    textMuted: '#888888',
    accent: '#FF6B35',
    border: '#333333',
    headerBg: '#000000',
    tabBg: '#0A0A0A',
  },
  dark: {
    background: '#000000',
    surface: '#0A0A0A',
    cardBg: '#0A0A0A',
    text: '#FFFFFF',
    textSecondary: '#B8B8B8',
    textMuted: '#888888',
    accent: '#FF6B35',
    border: '#222222',
    headerBg: '#000000',
    tabBg: '#0A0A0A',
  },
};

interface Category {
  id: string;
  name: string;
  color: string;
  trending?: boolean;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', color: '#E53935' },
  { id: 'business', name: 'Business', color: '#FB8C00' },
  { id: 'technology', name: 'Technology', color: '#8E24AA' },
  { id: 'sports', name: 'Sports', color: '#43A047' },
  { id: 'entertainment', name: 'Entertainment', color: '#E91E63' },
  { id: 'health', name: 'Health', color: '#F44336' },
  { id: 'science', name: 'Science', color: '#00ACC1' },
];

const getCategoryColor = (categoryId: string) =>
  CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#888888';

// Truncate to ~100 words for fuller card content
const truncateToWords = (text: string, maxWords: number = 100): string => {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

// News Card Component - Inshorts Style
interface NewsCardProps {
  article: Article;
  index: number;
  cardHeight: number;
  isBookmarked: boolean;
  onBookmark: (article: Article) => void;
  onShare: (article: Article) => void;
  onOpenArticle: (url: string) => void;
}

const NewsCard = React.memo(({
  article, index, cardHeight, isBookmarked,
  onBookmark, onShare, onOpenArticle
}: NewsCardProps) => {
  const [imageError, setImageError] = useState(false);
  const bookmarkAnim = useRef(new Animated.Value(1)).current;
  const categoryColor = getCategoryColor(article.category);

  const timeAgo = useCallback(() => {
    try {
      const date = parseISO(article.published);
      if (isValid(date)) {
        const distance = formatDistanceToNow(date, { addSuffix: false });
        return distance.replace('about ', '');
      }
    } catch { }
    return 'recently';
  }, [article.published]);

  const handleBookmark = () => {
    Animated.sequence([
      Animated.spring(bookmarkAnim, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(bookmarkAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onBookmark(article);
  };

  const hasImage = article.image_url && !imageError;

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      {/* Image Section - 48% of card */}
      <TouchableOpacity 
        style={styles.imageSection}
        onPress={() => onOpenArticle(article.link)}
        activeOpacity={0.95}
      >
        {hasImage ? (
          <Image
            source={{ uri: article.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: categoryColor + '30' }]}>
            <Ionicons name="newspaper-outline" size={64} color={categoryColor} />
          </View>
        )}
        
        {/* More options button */}
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Content Section - Dark background */}
      <View style={styles.contentSection}>
        {/* Source Row with Actions */}
        <View style={styles.sourceRow}>
          <View style={styles.sourceLeft}>
            <View style={[styles.sourceIcon, { backgroundColor: categoryColor }]}>
              <Text style={styles.sourceIconText}>{article.source.charAt(0)}</Text>
            </View>
            <Text style={styles.sourceName}>{article.source}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleBookmark} style={styles.actionBtn}>
              <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isBookmarked ? '#FF6B35' : '#FFFFFF'}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onShare(article)} style={styles.actionBtn}>
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Description - Show more content to fill the card */}
        <Text style={styles.description}>
          {truncateToWords(article.description, 100)}
        </Text>

        {/* Timestamp */}
        <Text style={styles.timestamp}>{timeAgo()} ago</Text>
      </View>

      {/* Tap to Read More Bar */}
      <TouchableOpacity 
        style={styles.readMoreBar}
        onPress={() => onOpenArticle(article.link)}
        activeOpacity={0.8}
      >
        <Text style={styles.readMoreText}>Tap to read full story</Text>
        <Ionicons name="open-outline" size={16} color="#B8B8B8" />
      </TouchableOpacity>
    </View>
  );
});

// Loading Skeleton
const LoadingSkeleton = ({ cardHeight }: { cardHeight: number }) => (
  <View style={[styles.skeleton, { height: cardHeight }]}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonSourceRow}>
        <View style={styles.skeletonCircle} />
        <View style={[styles.skeletonLine, { width: 80 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: '90%', height: 20 }]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, { width: '70%' }]} />
    </View>
  </View>
);

// Main Home Screen
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = true; // Force dark theme for Inshorts style
  const colors = COLORS.dark;
  const insets = useSafeAreaInsets();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showFeatureOverlay, setShowFeatureOverlay] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Card height: screen - header - tab bar
  const HEADER_HEIGHT = 50;
  const TAB_BAR_HEIGHT = 70;
  const CARD_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - TAB_BAR_HEIGHT - insets.top;

  // Enterprise-grade news hook - enable initialLoad when categories are available
  const [newsState, newsActions] = useNews(selectedCategories, {
    initialLoad: selectedCategories.length > 0,
    autoRefreshOnReconnect: true,
    cacheForOffline: true,
    pageSize: 15,
  });

  const { articles, loadingState, error, isOffline, isOfflineData, hasMore } = newsState;

  // Shake to refresh
  const handleShake = useCallback(() => {
    if (loadingState === 'idle') {
      if (Platform.OS !== 'web') Vibration.vibrate(100);
      newsActions.refresh();
    }
  }, [loadingState, newsActions]);

  useShakeDetector({ onShake: handleShake });

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        console.log('[Home] Loaded preferences:', preferences?.categories);
        
        if (preferences?.categories?.length) {
          setSelectedCategories(preferences.categories);
        } else {
          // DEFAULT CATEGORIES for first launch - ensures news always loads
          const defaultCategories = ['politics', 'business', 'technology'];
          console.log('[Home] No saved categories, using defaults:', defaultCategories);
          setSelectedCategories(defaultCategories);
        }

        const shouldShowOverlay = await secureStorage.getItem('verityn_show_feature_overlay');
        if (shouldShowOverlay === 'true') {
          setShowFeatureOverlay(true);
          await secureStorage.deleteItem('verityn_show_feature_overlay');
        }

        setPreferencesLoaded(true);
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Even on error, set default categories so app isn't blank
        setSelectedCategories(['politics', 'business', 'technology']);
        setPreferencesLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  // Trigger fetch when categories are loaded and changed
  useEffect(() => {
    if (preferencesLoaded && selectedCategories.length > 0) {
      console.log('[Home] Categories loaded, fetching news:', selectedCategories);
      newsActions.refresh();
    }
  }, [preferencesLoaded]); // Only depend on preferencesLoaded, not selectedCategories to avoid loop
  
  // Handle category changes after initial load
  const prevCategoriesRef = useRef<string[]>([]);
  useEffect(() => {
    if (preferencesLoaded && selectedCategories.length > 0) {
      const categoriesChanged = 
        selectedCategories.length !== prevCategoriesRef.current.length ||
        !selectedCategories.every(c => prevCategoriesRef.current.includes(c));
      
      if (categoriesChanged && prevCategoriesRef.current.length > 0) {
        console.log('[Home] Categories changed, refreshing:', selectedCategories);
        newsActions.refresh();
      }
      prevCategoriesRef.current = selectedCategories;
    }
  }, [selectedCategories, preferencesLoaded]);

  // Tab refresh
  useEffect(() => {
    const unsubscribe = TabRefreshEvents.subscribe('home', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      newsActions.refresh();
    });
    return unsubscribe;
  }, [newsActions]);

  // Bookmarks
  useFocusEffect(
    useCallback(() => {
      const loadBookmarks = async () => {
        const bookmarks = await getBookmarks();
        setBookmarkedIds(new Set(bookmarks.map(b => b.id)));
      };
      loadBookmarks();
    }, [])
  );

  // Preference changes
  useFocusEffect(
    useCallback(() => {
      const checkPreferences = async () => {
        const prefs = await getPreferences();
        if (prefs?.categories) {
          const changed =
            prefs.categories.length !== selectedCategories.length ||
            !prefs.categories.every(c => selectedCategories.includes(c));
          if (changed && selectedCategories.length > 0) {
            setSelectedCategories(prefs.categories);
            setActiveFilter('all');
          }
        }
      };
      checkPreferences();
    }, [selectedCategories])
  );

  // Handlers
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const toggleBookmark = async (article: Article) => {
    if (bookmarkedIds.has(article.id)) {
      await removeBookmark(article.id);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.id);
        return newSet;
      });
    } else {
      await addBookmark(article);
      setBookmarkedIds(prev => new Set(prev).add(article.id));
    }
  };

  const shareArticle = async (article: Article) => {
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

  const openArticle = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: '#000000',
        controlsColor: '#FF6B35',
      });
    } catch (error) {
      console.error('Open URL error:', error);
    }
  };

  // Filter articles
  const filteredArticles = activeFilter === 'all'
    ? articles
    : articles.filter(a => a.category.toLowerCase() === activeFilter);

  // Render card
  const renderCard = useCallback(({ item, index }: { item: Article; index: number }) => (
    <NewsCard
      article={item}
      index={index}
      cardHeight={CARD_HEIGHT}
      isBookmarked={bookmarkedIds.has(item.id)}
      onBookmark={toggleBookmark}
      onShare={shareArticle}
      onOpenArticle={openArticle}
    />
  ), [bookmarkedIds, CARD_HEIGHT]);

  // Loading state
  const isInitialLoading = !preferencesLoaded ||
    (loadingState === 'loading' && articles.length === 0) ||
    (preferencesLoaded && selectedCategories.length > 0 && articles.length === 0 && loadingState !== 'idle');

  if (isInitialLoading && !error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <LoadingSkeleton cardHeight={CARD_HEIGHT} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Feature Overlay */}
      <FeatureOverlay visible={showFeatureOverlay} onDismiss={() => setShowFeatureOverlay(false)} />

      {/* Network Banner */}
      <NetworkStatusBanner onRetry={newsActions.retry} />

      {/* Header with Category Pills */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <FlatList
          horizontal
          data={[
            { id: 'all', name: 'My Feed', trending: true },
            ...CATEGORIES.filter(c => selectedCategories.includes(c.id))
          ]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item, index }) => {
            const isActive = activeFilter === item.id;
            const isTrending = item.trending;
            return (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => handleFilterChange(item.id)}
              >
                {isTrending && index === 0 && (
                  <View style={styles.trendingDot} />
                )}
                <Text style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
        {isOfflineData && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="#888" />
          </View>
        )}
      </View>

      {/* Error Banner */}
      {error && !isOfflineData && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={newsActions.retry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* News Feed */}
      <View style={styles.feedContainer}>
        {filteredArticles.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={filteredArticles}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={CARD_HEIGHT}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onEndReached={() => !isOffline && newsActions.loadMore()}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              <View style={[styles.footer, { height: CARD_HEIGHT }]}>
                {loadingState === 'loading-more' ? (
                  <LoadingSkeleton cardHeight={CARD_HEIGHT * 0.9} />
                ) : (
                  <View style={styles.endMessage}>
                    <Ionicons name="checkmark-circle" size={48} color="#FF6B35" />
                    <Text style={styles.endTitle}>You're all caught up!</Text>
                    <Text style={styles.endSubtitle}>Swipe down to refresh</Text>
                  </View>
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={loadingState === 'refreshing'}
                onRefresh={newsActions.refresh}
                tintColor="#FF6B35"
                colors={['#FF6B35']}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No Stories Found</Text>
            <Text style={styles.emptySubtitle}>
              {isOffline ? 'Connect to the internet to load stories.' : 'Swipe down to refresh.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000',
  },

  // Header
  header: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    marginRight: 6,
  },
  categoryText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offlineIndicator: {
    paddingRight: 16,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
  },
  errorText: { color: '#FF6B35', fontSize: 13, flex: 1 },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
  },
  retryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Feed
  feedContainer: { flex: 1 },

  // Card
  card: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000000',
  },

  // Image Section
  imageSection: {
    height: '48%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content Section
  contentSection: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  // Source Row
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sourceIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sourceName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },

  // Headline
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Description
  description: {
    fontSize: 15,
    color: '#B8B8B8',
    lineHeight: 24,
    flex: 1,
  },

  // Timestamp
  timestamp: {
    fontSize: 13,
    color: '#666666',
    marginTop: 8,
  },

  // Read More Bar
  readMoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  readMoreText: {
    fontSize: 14,
    color: '#B8B8B8',
    fontWeight: '500',
  },

  // Skeleton
  skeleton: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000000',
  },
  skeletonImage: {
    height: '48%',
    backgroundColor: '#1A1A1A',
  },
  skeletonContent: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 16,
    gap: 12,
  },
  skeletonSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonCircle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#222222',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#222222',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#000000',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  endMessage: {
    alignItems: 'center',
  },
  endTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  endSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});
