import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, Dimensions,
  FlatList, Share, Platform, Vibration, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getPreferences } from '../../src/utils/storage';
import { useTheme } from '../../src/utils/theme';
import { saveArticleOffline, isArticleSavedOffline } from '../../src/utils/offline';
import { useShakeDetector } from '../../src/hooks/useShakeDetector';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 180;

interface Article {
  id: string; title: string; description: string; link: string;
  published: string; source: string; category: string; image_url?: string;
}

interface Category { id: string; name: string; icon: string; color: string; }

// Updated category colors for European Elegance theme
const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#1E3A5F' },      // Navy
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#B45309' },     // Amber (primary)
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#059669' },            // Emerald
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Estimate read time based on description length
const getReadTime = (description: string) => {
  const wordsPerMinute = 200;
  const words = description.split(' ').length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes < 1 ? '1 min read' : `${minutes} min read`;
};

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shakeMessage, setShakeMessage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  // Shake to refresh
  const handleShake = useCallback(() => {
    if (!refreshing && !loading) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(100);
      }
      setShakeMessage('Refreshing...');
      onRefresh();
      setTimeout(() => setShakeMessage(null), 2000);
    }
  }, [refreshing, loading]);

  useShakeDetector({ onShake: handleShake });

  // Load preferences on mount
  useEffect(() => { loadPreferencesAndFetch(); }, []);

  // Reload bookmarks every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    const bookmarks = await getBookmarks();
    setBookmarkedIds(new Set(bookmarks.map(b => b.id)));
  };

  const loadPreferencesAndFetch = async () => {
    try {
      const preferences = await getPreferences();
      if (preferences) {
        setSelectedCategories(preferences.categories || []);
        await fetchNews(preferences.categories || []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setError('Failed to load preferences');
      setLoading(false);
    }
  };

  const fetchNews = async (categories: string[]) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/news?categories=${categories.join(',')}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('Unable to load news. Pull to refresh.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadBookmarks(); await fetchNews(selectedCategories);
  }, [selectedCategories]);

  const formatDate = (dateString: string) => {
    try { const date = parseISO(dateString); if (isValid(date)) return format(date, 'MMM d, h:mm a'); }
    catch {} return dateString;
  };

  const getTimeAgo = (dateString: string) => {
    try { 
      const date = parseISO(dateString); 
      if (isValid(date)) return formatDistanceToNow(date, { addSuffix: false }); 
    }
    catch {} return '';
  };

  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#78716C';

  const filteredArticles = activeFilter === 'all' ? articles : articles.filter(a => a.category.toLowerCase() === activeFilter);

  const openArticle = async (url: string) => {
    try { 
      await WebBrowser.openBrowserAsync(url, { 
        toolbarColor: isDark ? '#18181B' : '#FDF8F3', 
        controlsColor: colors.primary 
      }); 
    }
    catch (error) { console.error('Error opening URL:', error); }
  };

  const shareArticle = async (article: Article) => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nRead more: ${article.link}`,
        url: article.link,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const toggleBookmark = async (article: Article) => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(bookmarkScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();

    if (bookmarkedIds.has(article.id)) {
      await removeBookmark(article.id);
      setBookmarkedIds(prev => { const newSet = new Set(prev); newSet.delete(article.id); return newSet; });
    } else {
      await addBookmark(article);
      setBookmarkedIds(prev => new Set(prev).add(article.id));
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // European Elegance Card Component
  const renderInshortsCard = ({ item, index }: { item: Article; index: number }) => {
    const isBookmarked = bookmarkedIds.has(item.id);
    const timeAgo = getTimeAgo(item.published);
    const categoryColor = getCategoryColor(item.category);
    const readTime = getReadTime(item.description);

    return (
      <View style={[styles.inshortsCard, { backgroundColor: colors.background }]}>
        {/* Image Section with Gradient Overlay */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => openArticle(item.link)}
          activeOpacity={0.95}
          data-testid={`article-image-${index}`}
        >
          {item.image_url ? (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.inshortsImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.imagePlaceholder }]}>
              <Ionicons name="newspaper" size={50} color={categoryColor} />
            </View>
          )}
          
          {/* Gradient Overlay */}
          <View style={styles.imageGradient} />
          
          {/* Source Badge & Actions Overlay */}
          <View style={styles.imageOverlay}>
            <View style={[styles.sourceBadge, { backgroundColor: 'rgba(253,248,243,0.95)' }]}>
              <Ionicons name="globe-outline" size={13} color="#292524" />
              <Text style={[styles.sourceBadgeText, { color: '#292524' }]}>{item.source}</Text>
            </View>
            
            <View style={styles.imageActions}>
              <TouchableOpacity 
                style={[styles.imageActionBtn, { backgroundColor: 'rgba(253,248,243,0.9)' }]}
                onPress={() => toggleBookmark(item)}
                data-testid={`bookmark-btn-${index}`}
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
                style={[styles.imageActionBtn, { backgroundColor: 'rgba(253,248,243,0.9)' }]}
                onPress={() => shareArticle(item)}
                data-testid={`share-btn-${index}`}
              >
                <Ionicons name="share-social-outline" size={20} color="#44403C" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Content Section */}
        <View style={[styles.contentSection, { backgroundColor: colors.card }]}>
          {/* Category, Time & Read Time Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={[styles.categoryTag, { backgroundColor: `${categoryColor}18` }]}>
                <Text style={[styles.categoryTagText, { color: categoryColor }]}>{item.category}</Text>
              </View>
              <View style={styles.readTimeBadge}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.readTimeText, { color: colors.textMuted }]}>{readTime}</Text>
              </View>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo} ago</Text>
          </View>

          {/* Title - Enhanced typography */}
          <Text style={[styles.inshortsTitle, { color: colors.text }]}>{item.title}</Text>
          
          {/* Description with inline Read More */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.inshortsDescription, { color: colors.textSecondary }]}>
              {item.description}
              <Text 
                style={[styles.readMoreLink, { color: colors.primary }]} 
                onPress={() => openArticle(item.link)}
              >
                {' '}Read full story →
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Greeting */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greetingText, { color: colors.textMuted }]}>{getGreeting()}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Verityn</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.primary }]}>European News</Text>
      </View>

      {/* Category Tabs - Enhanced */}
      <View style={[styles.categoryTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeFilter === 'all' && [styles.tabActive, { backgroundColor: colors.primaryLight }]
            ]} 
            onPress={() => { setActiveFilter('all'); setCurrentIndex(0); }}
            data-testid="tab-my-feed"
          >
            <Text style={[
              styles.tabText, 
              { color: colors.textMuted }, 
              activeFilter === 'all' && { color: colors.primary, fontWeight: '600' }
            ]}>My Feed</Text>
          </TouchableOpacity>
          {selectedCategories.map((catId) => {
            const category = CATEGORIES.find(c => c.id === catId); 
            if (!category) return null;
            const isActive = activeFilter === catId;
            return (
              <TouchableOpacity 
                key={catId} 
                style={[
                  styles.tab, 
                  isActive && [styles.tabActive, { backgroundColor: `${category.color}15` }]
                ]} 
                onPress={() => { setActiveFilter(catId); setCurrentIndex(0); }}
                data-testid={`tab-${catId}`}
              >
                <Text style={[
                  styles.tabText, 
                  { color: colors.textMuted }, 
                  isActive && { color: category.color, fontWeight: '600' }
                ]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error State */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}>
          <Ionicons name="alert-circle" size={24} color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.primary }]}>{error}</Text>
        </View>
      )}

      {/* Content - Cards View Only */}
      <View style={styles.cardsContainer}>
        {filteredArticles.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={filteredArticles}
            renderItem={renderInshortsCard}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            snapToInterval={CARD_HEIGHT}
            decelerationRate="fast"
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor={colors.primary} 
                colors={[colors.primary]} 
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Articles Found</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {activeFilter !== 'all' ? 'No news in this category.' : 'Pull down to refresh.'}
            </Text>
          </View>
        )}
        
        {/* Progress Indicator - Enhanced */}
        {filteredArticles.length > 0 && (
          <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(39,39,42,0.9)' : 'rgba(41,37,36,0.85)' }]}>
            <Text style={styles.progressText}>{currentIndex + 1} / {filteredArticles.length}</Text>
          </View>
        )}
        
        {/* Shake Message */}
        {shakeMessage && (
          <View style={[styles.shakeMessage, { backgroundColor: colors.primary }]}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.shakeMessageText}>{shakeMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  
  // Header - Enhanced
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greetingText: { 
    fontSize: 13, 
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: { 
    fontSize: 13, 
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // Category Tabs - Pill style
  categoryTabs: { borderBottomWidth: 1 },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
  },
  tabActive: { 
    borderRadius: 20,
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  
  // Error - Warm colors
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    marginHorizontal: 16, 
    marginTop: 12, 
    borderRadius: 12, 
    gap: 10 
  },
  errorText: { fontSize: 14, fontWeight: '500' },
  
  // Cards Container
  cardsContainer: { flex: 1 },
  
  // Inshorts Card - Refined
  inshortsCard: { 
    height: CARD_HEIGHT,
  },
  imageContainer: {
    height: CARD_HEIGHT * 0.34,
    position: 'relative',
  },
  inshortsImage: { 
    width: '100%', 
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
    // Gradient effect via overlay
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 14,
    paddingBottom: 16,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  imageActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Content Section - Enhanced typography
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
  },
  inshortsTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  descriptionContainer: {
    flex: 1,
  },
  inshortsDescription: {
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  readMoreLink: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Progress Bar - Refined
  progressBar: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  progressText: {
    color: '#FAFAF9',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Shake Message
  shakeMessage: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: -60 }],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shakeMessageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 64, 
    paddingHorizontal: 32 
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
