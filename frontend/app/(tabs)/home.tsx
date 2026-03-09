/**
 * Home Screen - Enterprise-Grade News Feed
 * Features:
 * - Network-aware loading with auto-reconnect
 * - Offline mode with cached articles  
 * - Proper error handling and retry logic
 * - Loading states and skeletons
 * - Pull to refresh with haptic feedback
 * - Infinite scroll with pagination
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, Dimensions,
  FlatList, Share, Platform, Vibration, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';

// Services & Hooks
import { useNews } from '../../src/hooks/useNews';
import { Article } from '../../src/services/NewsService';
import { NetworkStatusBanner, OfflineIndicator } from '../../src/components/NetworkStatusBanner';

// Utils
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getPreferences } from '../../src/utils/storage';
import { useTheme } from '../../src/utils/theme';
import { useShakeDetector } from '../../src/hooks/useShakeDetector';
import { VeritynLoader } from '../../src/components/VeritynLoader';
import { TabRefreshEvents } from '../../src/utils/tabRefresh';
import { secureStorage } from '../../src/utils/secureStorage';
import FeatureOverlay from '../../src/components/FeatureOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 180;

interface Category { 
  id: string; 
  name: string; 
  icon: string; 
  color: string; 
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#1E3A5F' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#B45309' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#059669' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

const getCategoryColor = (categoryId: string) => 
  CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#78716C';

const getReadTime = (description: string) => {
  const words = description?.split(' ').length || 0;
  const minutes = Math.ceil(words / 200);
  return minutes < 1 ? '1 min read' : `${minutes} min read`;
};

// Article Card Component
interface ArticleCardProps {
  item: Article;
  index: number;
  colors: any;
  isDark: boolean;
  isBookmarked: boolean;
  onBookmarkToggle: (article: Article) => void;
  onShare: (article: Article) => void;
  onOpenArticle: (url: string) => void;
}

const ArticleCard = React.memo(({ 
  item, index, colors, isDark, isBookmarked,
  onBookmarkToggle, onShare, onOpenArticle
}: ArticleCardProps) => {
  const [imageError, setImageError] = useState(false);
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const categoryColor = getCategoryColor(item.category);
  const readTime = getReadTime(item.description);
  
  const timeAgo = useCallback(() => {
    try { 
      const date = parseISO(item.published); 
      if (isValid(date)) return formatDistanceToNow(date, { addSuffix: false }); 
    } catch {} 
    return '';
  }, [item.published]);

  const handleBookmark = () => {
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(bookmarkScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onBookmarkToggle(item);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      {/* Image Section */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={() => onOpenArticle(item.link)}
        activeOpacity={0.95}
        data-testid={`article-card-${index}`}
      >
        {item.image_url && !imageError ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.image} 
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: `${categoryColor}15` }]}>
            <View style={[styles.placeholderIcon, { backgroundColor: `${categoryColor}20` }]}>
              <Ionicons name="newspaper" size={40} color={categoryColor} />
            </View>
            <Text style={[styles.placeholderText, { color: categoryColor }]}>{item.source}</Text>
          </View>
        )}
        
        {/* Overlay with source and actions */}
        <View style={styles.imageOverlay}>
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(253,248,243,0.95)' }]}>
            <Ionicons name="globe-outline" size={13} color="#292524" />
            <Text style={styles.sourceBadgeText}>{item.source}</Text>
          </View>
          
          <View style={styles.imageActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(253,248,243,0.9)' }]}
              onPress={handleBookmark}
              data-testid={`bookmark-${index}`}
            >
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Ionicons 
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                  size={20} 
                  color={isBookmarked ? colors.primary : '#44403C'} 
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(253,248,243,0.9)' }]}
              onPress={() => onShare(item)}
              data-testid={`share-${index}`}
            >
              <Ionicons name="share-social-outline" size={20} color="#44403C" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Content Section */}
      <View style={[styles.contentSection, { backgroundColor: colors.card }]}>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <View style={[styles.categoryTag, { backgroundColor: `${categoryColor}18` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <View style={styles.readTime}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.readTimeText, { color: colors.textMuted }]}>{readTime}</Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo()} ago</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {item.description}
            <Text 
              style={[styles.readMore, { color: colors.primary }]} 
              onPress={() => onOpenArticle(item.link)}
            >
              {' '}Read full story →
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
});

// Loading Skeleton
const LoadingSkeleton = ({ colors }: { colors: any }) => (
  <View style={[styles.skeleton, { backgroundColor: colors.surface }]}>
    <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '30%', backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLine, { width: '100%', backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLine, { width: '80%', backgroundColor: colors.border }]} />
    </View>
  </View>
);

// Main Home Screen Component
export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showFeatureOverlay, setShowFeatureOverlay] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Use the enterprise-grade news hook
  const [newsState, newsActions] = useNews(selectedCategories, {
    initialLoad: false, // We'll trigger load after preferences are loaded
    autoRefreshOnReconnect: true,
    cacheForOffline: true,
    pageSize: 15,
  });

  const { 
    articles, 
    loadingState, 
    error, 
    isOffline, 
    isOfflineData,
    hasMore, 
    networkStatus 
  } = newsState;

  // Shake to refresh
  const handleShake = useCallback(() => {
    if (loadingState === 'idle') {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(100);
      }
      newsActions.refresh();
    }
  }, [loadingState, newsActions]);

  useShakeDetector({ onShake: handleShake });

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        if (preferences?.categories?.length) {
          setSelectedCategories(preferences.categories);
        }
        
        // Check if we should show feature overlay (first time user)
        const shouldShowOverlay = await secureStorage.getItem('verityn_show_feature_overlay');
        if (shouldShowOverlay === 'true') {
          setShowFeatureOverlay(true);
          // Clear the flag
          await secureStorage.deleteItem('verityn_show_feature_overlay');
        }
        
        setPreferencesLoaded(true);
      } catch (error) {
        console.error('Error loading preferences:', error);
        setPreferencesLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  // Trigger initial load once preferences are loaded
  useEffect(() => {
    if (preferencesLoaded && selectedCategories.length > 0) {
      newsActions.refresh();
    }
  }, [preferencesLoaded, selectedCategories]);

  // Tab press refresh
  useEffect(() => {
    const unsubscribe = TabRefreshEvents.subscribe('home', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      newsActions.refresh();
    });
    return unsubscribe;
  }, [newsActions]);

  // Reload bookmarks on focus
  useFocusEffect(
    useCallback(() => {
      const loadBookmarks = async () => {
        const bookmarks = await getBookmarks();
        setBookmarkedIds(new Set(bookmarks.map(b => b.id)));
      };
      loadBookmarks();
    }, [])
  );

  // Check for preference changes on focus
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
    setCurrentIndex(0);
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
        toolbarColor: isDark ? '#18181B' : '#FDF8F3', 
        controlsColor: colors.primary 
      }); 
    } catch (error) { 
      console.error('Open URL error:', error); 
    }
  };

  // Filter articles by active category
  const filteredArticles = activeFilter === 'all' 
    ? articles 
    : articles.filter(a => a.category.toLowerCase() === activeFilter);

  // Render article card
  const renderCard = useCallback(({ item, index }: { item: Article; index: number }) => (
    <ArticleCard
      item={item}
      index={index}
      colors={colors}
      isDark={isDark}
      isBookmarked={bookmarkedIds.has(item.id)}
      onBookmarkToggle={toggleBookmark}
      onShare={shareArticle}
      onOpenArticle={openArticle}
    />
  ), [colors, isDark, bookmarkedIds]);

  // Initial loading state
  if (loadingState === 'loading' && articles.length === 0) {
    return <VeritynLoader message="Loading your news..." showTips={true} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Feature Overlay for first-time users */}
      <FeatureOverlay 
        visible={showFeatureOverlay} 
        onDismiss={() => setShowFeatureOverlay(false)} 
      />
      
      {/* Network Status Banner */}
      <NetworkStatusBanner onRetry={newsActions.retry} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Verityn</Text>
          <OfflineIndicator compact />
        </View>
      </View>

      {/* Category Tabs */}
      <View style={[styles.categoryTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'all' && [styles.tabActive, { backgroundColor: colors.primaryLight }]]} 
            onPress={() => handleFilterChange('all')}
            data-testid="tab-my-feed"
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, activeFilter === 'all' && { color: colors.primary, fontWeight: '600' }]}>
              My Feed
            </Text>
          </TouchableOpacity>
          
          {selectedCategories.map((catId) => {
            const category = CATEGORIES.find(c => c.id === catId);
            if (!category) return null;
            const isActive = activeFilter === catId;
            return (
              <TouchableOpacity 
                key={catId} 
                style={[styles.tab, isActive && [styles.tabActive, { backgroundColor: `${category.color}15` }]]} 
                onPress={() => handleFilterChange(catId)}
                data-testid={`tab-${catId}`}
              >
                <Text style={[styles.tabText, { color: colors.textMuted }, isActive && { color: category.color, fontWeight: '600' }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Offline Data Banner */}
      {isOfflineData && (
        <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.offlineBannerText, { color: colors.primary }]}>
            Showing cached articles
          </Text>
        </View>
      )}

      {/* Error Banner with Retry */}
      {error && !isOfflineData && (
        <View style={[styles.errorBanner, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={24} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.primary }]}>{error}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={newsActions.retry}
            data-testid="retry-button"
          >
            <Ionicons name="refresh" size={16} color="#fff" />
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
              <View style={[styles.footer, { backgroundColor: colors.background }]}>
                {loadingState === 'loading-more' ? (
                  <>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                      Loading more stories...
                    </Text>
                  </>
                ) : hasMore && !isOffline ? (
                  <TouchableOpacity 
                    style={[styles.loadMoreBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={newsActions.loadMore}
                    data-testid="load-more-button"
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
                    <Text style={[styles.footerTitle, { color: colors.text }]}>You're all caught up!</Text>
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                      Pull down to refresh for new articles
                    </Text>
                    <TouchableOpacity 
                      style={[styles.loadMoreBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={newsActions.refresh}
                    >
                      <Ionicons name="refresh" size={18} color={colors.primary} />
                      <Text style={[styles.loadMoreText, { color: colors.primary }]}>Refresh</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl 
                refreshing={loadingState === 'refreshing'} 
                onRefresh={newsActions.refresh} 
                tintColor={colors.primary} 
                colors={[colors.primary]} 
              />
            }
          />
        ) : loadingState === 'loading' ? (
          <View style={styles.skeletonContainer}>
            <LoadingSkeleton colors={colors} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Articles Found</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isOffline 
                ? 'Connect to the internet to load articles.' 
                : activeFilter !== 'all' 
                  ? 'No news in this category.' 
                  : 'Pull down to refresh.'}
            </Text>
            {!isOffline && (
              <TouchableOpacity 
                style={[styles.loadMoreBtn, { backgroundColor: colors.primaryLight, marginTop: 24 }]}
                onPress={newsActions.retry}
              >
                <Ionicons name="refresh" size={18} color={colors.primary} />
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  
  // Category Tabs
  categoryTabs: { borderBottomWidth: 1 },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tabActive: { borderRadius: 20 },
  tabText: { fontSize: 14, fontWeight: '500' },
  
  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  offlineBannerText: { fontSize: 13, fontWeight: '500' },
  
  // Error Banner
  errorBanner: { 
    flexDirection: 'column', 
    alignItems: 'center', 
    padding: 16, 
    marginHorizontal: 16, 
    marginTop: 12, 
    borderRadius: 12, 
    gap: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Feed Container
  feedContainer: { flex: 1 },
  
  // Card Styles
  card: { height: CARD_HEIGHT },
  imageContainer: {
    height: CARD_HEIGHT * 0.34,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 14, fontWeight: '600' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 14,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  sourceBadgeText: { fontSize: 12, fontWeight: '600', color: '#292524' },
  imageActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Content Section
  contentSection: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  readTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readTimeText: { fontSize: 11, fontWeight: '500' },
  timeAgo: { fontSize: 12 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 14, letterSpacing: -0.3 },
  descriptionContainer: { flex: 1 },
  description: { fontSize: 15, lineHeight: 26, marginBottom: 12 },
  readMore: { fontWeight: '600' },
  
  // Skeleton
  skeleton: { height: CARD_HEIGHT, padding: 16 },
  skeletonImage: { height: '35%', borderRadius: 12, marginBottom: 16 },
  skeletonContent: { gap: 12 },
  skeletonLine: { height: 16, borderRadius: 4 },
  skeletonContainer: { flex: 1 },
  
  // Empty State
  emptyContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  
  // Footer
  footer: {
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  footerTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  footerText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  loadMoreText: { fontSize: 16, fontWeight: '600' },
});
