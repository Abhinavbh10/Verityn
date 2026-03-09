/**
 * Home Screen - Flipboard/Inshorts Style News Feed
 * 
 * Design: Full-screen immersive cards with:
 * - Hero images (50-60% of screen)
 * - Gradient overlay for text readability
 * - Serif headlines (editorial feel)
 * - Vertical swipe navigation
 * - Auto light/dark theme
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

// Design System Colors
const COLORS = {
  light: {
    background: '#FDFBF7',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#595959',
    textMuted: '#8C8C8C',
    accent: '#D93025',
    border: '#E5E0D8',
    categoryPill: '#F5F3EF',
    categoryPillActive: '#1A1A1A',
  },
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    text: '#FAFAFA',
    textSecondary: '#B0B0B0',
    textMuted: '#707070',
    accent: '#FF6B6B',
    border: '#2A2A2A',
    categoryPill: '#1E1E1E',
    categoryPillActive: '#FAFAFA',
  },
};

interface Category {
  id: string;
  name: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', color: '#1E3A5F' },
  { id: 'business', name: 'Business', color: '#B45309' },
  { id: 'technology', name: 'Technology', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', color: '#059669' },
  { id: 'entertainment', name: 'Entertainment', color: '#DB2777' },
  { id: 'health', name: 'Health', color: '#DC2626' },
  { id: 'science', name: 'Science', color: '#0891B2' },
];

const getCategoryColor = (categoryId: string) =>
  CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#595959';

// Immersive News Card Component
interface NewsCardProps {
  article: Article;
  index: number;
  colors: typeof COLORS.light;
  isDark: boolean;
  isBookmarked: boolean;
  cardHeight: number;
  onBookmark: (article: Article) => void;
  onShare: (article: Article) => void;
  onOpenArticle: (url: string) => void;
}

const NewsCard = React.memo(({
  article, index, colors, isDark, isBookmarked, cardHeight,
  onBookmark, onShare, onOpenArticle
}: NewsCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bookmarkAnim = useRef(new Animated.Value(1)).current;

  const categoryColor = getCategoryColor(article.category);

  const timeAgo = useCallback(() => {
    try {
      const date = parseISO(article.published);
      if (isValid(date)) return formatDistanceToNow(date, { addSuffix: false });
    } catch { }
    return '';
  }, [article.published]);

  const handleBookmark = () => {
    Animated.sequence([
      Animated.spring(bookmarkAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(bookmarkAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onBookmark(article);
  };

  const hasImage = article.image_url && !imageError;

  return (
    <Animated.View
      style={[
        styles.card,
        { height: cardHeight, backgroundColor: colors.background, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => onOpenArticle(article.link)}
        activeOpacity={0.98}
        data-testid={`article-card-${index}`}
      >
        {/* Hero Image Section */}
        <View style={styles.imageSection}>
          {hasImage ? (
            <>
              <Image
                source={{ uri: article.image_url }}
                style={styles.heroImage}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {/* Gradient Overlay for text readability */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.5, 1]}
                style={styles.imageGradient}
              />
            </>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: `${categoryColor}15` }]}>
              <View style={[styles.placeholderIconContainer, { backgroundColor: `${categoryColor}20` }]}>
                <Ionicons name="newspaper-outline" size={48} color={categoryColor} />
              </View>
            </View>
          )}

          {/* Source Badge - Top Left */}
          <View style={styles.sourceBadgeContainer}>
            <View style={[styles.sourceBadge, { backgroundColor: hasImage ? 'rgba(255,255,255,0.95)' : colors.surface }]}>
              <Text style={[styles.sourceText, { color: hasImage ? '#1A1A1A' : colors.text }]}>
                {article.source}
              </Text>
            </View>
          </View>

          {/* Action Buttons - Top Right */}
          <View style={styles.actionButtonsTop}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: hasImage ? 'rgba(255,255,255,0.9)' : colors.surface }]}
              onPress={handleBookmark}
              data-testid={`bookmark-btn-${index}`}
            >
              <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isBookmarked ? '#D93025' : (hasImage ? '#1A1A1A' : colors.text)}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: hasImage ? 'rgba(255,255,255,0.9)' : colors.surface }]}
              onPress={() => onShare(article)}
              data-testid={`share-btn-${index}`}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color={hasImage ? '#1A1A1A' : colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Title on Image (if has image) */}
          {hasImage && (
            <View style={styles.titleOverlay}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryBadgeText}>{article.category}</Text>
              </View>
              <Text style={styles.titleOnImage} numberOfLines={3}>
                {article.title}
              </Text>
              <View style={styles.metaOnImage}>
                <Text style={styles.metaTextOnImage}>{timeAgo()} ago</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content Section (for cards without image) */}
        {!hasImage && (
          <View style={[styles.contentSection, { backgroundColor: colors.surface }]}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor, alignSelf: 'flex-start' }]}>
              <Text style={styles.categoryBadgeText}>{article.category}</Text>
            </View>
            <Text style={[styles.titleNoImage, { color: colors.text }]} numberOfLines={3}>
              {article.title}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={4}>
              {article.description}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{timeAgo()} ago</Text>
              <TouchableOpacity onPress={() => onOpenArticle(article.link)}>
                <Text style={[styles.readMoreText, { color: colors.accent }]}>Read full story →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Section for image cards */}
        {hasImage && (
          <View style={[styles.bottomSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.descriptionCompact, { color: colors.textSecondary }]} numberOfLines={2}>
              {article.description}
            </Text>
            <TouchableOpacity onPress={() => onOpenArticle(article.link)}>
              <Text style={[styles.readMoreText, { color: colors.accent }]}>Read full story →</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// Loading Skeleton
const LoadingSkeleton = ({ colors, cardHeight }: { colors: typeof COLORS.light; cardHeight: number }) => (
  <View style={[styles.skeleton, { height: cardHeight, backgroundColor: colors.background }]}>
    <Animated.View style={[styles.skeletonImage, { backgroundColor: colors.border }]}>
      <View style={styles.skeletonShimmer} />
    </Animated.View>
    <View style={[styles.skeletonContent, { backgroundColor: colors.surface }]}>
      <View style={[styles.skeletonLine, { width: '25%', backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLine, { width: '90%', height: 24, backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLine, { width: '100%', backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.border }]} />
    </View>
  </View>
);

// Main Home Screen
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showFeatureOverlay, setShowFeatureOverlay] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Calculate card height (full screen minus tabs and safe areas)
  const CARD_HEIGHT = SCREEN_HEIGHT - 140 - insets.bottom;

  // Enterprise-grade news hook
  const [newsState, newsActions] = useNews(selectedCategories, {
    initialLoad: false,
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

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferences();
        if (preferences?.categories?.length) {
          setSelectedCategories(preferences.categories);
        }

        const shouldShowOverlay = await secureStorage.getItem('verityn_show_feature_overlay');
        if (shouldShowOverlay === 'true') {
          setShowFeatureOverlay(true);
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

  // Initial fetch
  useEffect(() => {
    if (preferencesLoaded && selectedCategories.length > 0) {
      newsActions.refresh();
    }
  }, [preferencesLoaded, selectedCategories]);

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
        toolbarColor: isDark ? '#0A0A0A' : '#FDFBF7',
        controlsColor: colors.accent,
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
      colors={colors}
      isDark={isDark}
      isBookmarked={bookmarkedIds.has(item.id)}
      cardHeight={CARD_HEIGHT}
      onBookmark={toggleBookmark}
      onShare={shareArticle}
      onOpenArticle={openArticle}
    />
  ), [colors, isDark, bookmarkedIds, CARD_HEIGHT]);

  // Loading state
  if (loadingState === 'loading' && articles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loaderContainer}>
          <LoadingSkeleton colors={colors} cardHeight={CARD_HEIGHT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Feature Overlay */}
      <FeatureOverlay visible={showFeatureOverlay} onDismiss={() => setShowFeatureOverlay(false)} />

      {/* Network Banner */}
      <NetworkStatusBanner onRetry={newsActions.retry} />

      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.text }]}>Verityn</Text>
        {isOfflineData && (
          <View style={[styles.offlineBadge, { backgroundColor: colors.categoryPill }]}>
            <Ionicons name="cloud-offline" size={12} color={colors.textMuted} />
            <Text style={[styles.offlineBadgeText, { color: colors.textMuted }]}>Offline</Text>
          </View>
        )}
      </View>

      {/* Category Pills */}
      <View style={[styles.categoryContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={[{ id: 'all', name: 'For You' }, ...CATEGORIES.filter(c => selectedCategories.includes(c.id))]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  { backgroundColor: isActive ? colors.categoryPillActive : colors.categoryPill },
                ]}
                onPress={() => handleFilterChange(item.id)}
                data-testid={`tab-${item.id}`}
              >
                <Text style={[
                  styles.categoryPillText,
                  { color: isActive ? (isDark ? colors.background : '#FFFFFF') : colors.textSecondary }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Error Banner */}
      {error && !isOfflineData && (
        <View style={[styles.errorBanner, { backgroundColor: isDark ? '#2C1810' : '#FEF2F2' }]}>
          <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={newsActions.retry}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
              <View style={[styles.footer, { height: CARD_HEIGHT, backgroundColor: colors.background }]}>
                {loadingState === 'loading-more' ? (
                  <LoadingSkeleton colors={colors} cardHeight={CARD_HEIGHT * 0.8} />
                ) : hasMore && !isOffline ? (
                  <TouchableOpacity
                    style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                    onPress={newsActions.loadMore}
                  >
                    <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>Load More</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.endMessage}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
                    <Text style={[styles.endTitle, { color: colors.text }]}>You're all caught up!</Text>
                    <Text style={[styles.endSubtitle, { color: colors.textMuted }]}>
                      Pull down to refresh for new stories
                    </Text>
                  </View>
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={loadingState === 'refreshing'}
                onRefresh={newsActions.refresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
          />
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stories Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {isOffline ? 'Connect to the internet to load stories.' : 'Pull down to refresh.'}
            </Text>
            {!isOffline && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent, marginTop: 24 }]}
                onPress={newsActions.retry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
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
  loaderContainer: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineBadgeText: { fontSize: 11, fontWeight: '600' },

  // Category Pills
  categoryContainer: {
    borderBottomWidth: 1,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Feed
  feedContainer: { flex: 1 },

  // Card
  card: { width: SCREEN_WIDTH },
  cardTouchable: { flex: 1 },

  // Image Section
  imageSection: {
    height: '55%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Source Badge
  sourceBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  sourceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action Buttons
  actionButtonsTop: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Title on Image
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleOnImage: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaOnImage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaTextOnImage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },

  // Content Section (no image)
  contentSection: {
    flex: 1,
    padding: 24,
  },
  titleNoImage: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 36,
    marginTop: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom Section (with image)
  bottomSection: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  descriptionCompact: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },

  // Skeleton
  skeleton: { width: SCREEN_WIDTH },
  skeletonImage: {
    height: '55%',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skeletonContent: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  // Footer
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  endMessage: {
    alignItems: 'center',
  },
  endTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 16,
  },
  endSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
