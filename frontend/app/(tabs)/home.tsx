import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, Dimensions,
  FlatList, Share, Platform, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
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

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#2563EB' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#059669' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#7C3AED' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#D97706' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#DB2777' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#DC2626' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#0891B2' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

  // Shake to refresh
  const handleShake = useCallback(() => {
    if (!refreshing && !loading) {
      // Vibrate on shake (only on native)
      if (Platform.OS !== 'web') {
        Vibration.vibrate(100);
      }
      setShakeMessage('Refreshing...');
      onRefresh();
      setTimeout(() => setShakeMessage(null), 2000);
    }
  }, [refreshing, loading]);

  useShakeDetector({ onShake: handleShake });

  useEffect(() => { loadPreferencesAndFetch(); loadBookmarks(); }, []);

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

  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#64748B';

  const filteredArticles = activeFilter === 'all' ? articles : articles.filter(a => a.category.toLowerCase() === activeFilter);

  const openArticle = async (url: string) => {
    try { await WebBrowser.openBrowserAsync(url, { toolbarColor: '#000000', controlsColor: '#2563EB' }); }
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

  // Inshorts-style Card Component
  const renderInshortsCard = ({ item, index }: { item: Article; index: number }) => {
    const isBookmarked = bookmarkedIds.has(item.id);
    const timeAgo = getTimeAgo(item.published);
    const categoryColor = getCategoryColor(item.category);

    return (
      <View style={[styles.inshortsCard, { backgroundColor: colors.background }]}>
        {/* Image Section */}
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => openArticle(item.link)}
          activeOpacity={0.95}
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
          
          {/* Source Badge & Actions Overlay */}
          <View style={styles.imageOverlay}>
            <View style={styles.sourceBadge}>
              <Ionicons name="globe-outline" size={14} color="#fff" />
              <Text style={styles.sourceBadgeText}>{item.source}</Text>
            </View>
            
            <View style={styles.imageActions}>
              <TouchableOpacity 
                style={styles.imageActionBtn}
                onPress={() => toggleBookmark(item)}
              >
                <Ionicons 
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                  size={22} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.imageActionBtn}
                onPress={() => shareArticle(item)}
              >
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Content Section */}
        <View style={[styles.contentSection, { backgroundColor: colors.card }]}>
          {/* Category & Time Row */}
          <View style={styles.metaRow}>
            <View style={[styles.categoryTag, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryTagText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo} ago</Text>
          </View>

          {/* Title */}
          <Text style={[styles.inshortsTitle, { color: colors.text }]}>{item.title}</Text>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.inshortsDescription, { color: colors.textSecondary }]}>
              {item.description}
              <Text style={[styles.readMoreLink, { color: colors.primary }]} onPress={() => openArticle(item.link)}>
                {' '}Read more →
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Verityn</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>European News</Text>
      </View>

      {/* Category Tabs */}
      <View style={[styles.categoryTabs, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'all' && styles.tabActive]} 
            onPress={() => { setActiveFilter('all'); setCurrentIndex(0); }}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, activeFilter === 'all' && styles.tabTextActive]}>My Feed</Text>
          </TouchableOpacity>
          {selectedCategories.map((catId) => {
            const category = CATEGORIES.find(c => c.id === catId); 
            if (!category) return null;
            const isActive = activeFilter === catId;
            return (
              <TouchableOpacity 
                key={catId} 
                style={[styles.tab, isActive && styles.tabActive]} 
                onPress={() => { setActiveFilter(catId); setCurrentIndex(0); }}
              >
                <Text style={[styles.tabText, { color: colors.textMuted }, isActive && styles.tabTextActive]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error State */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: isDark ? '#3B1818' : '#FEF2F2' }]}>
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Articles Found</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{activeFilter !== 'all' ? 'No news in this category.' : 'Pull down to refresh.'}</Text>
          </View>
        )}
        
        {/* Progress Indicator */}
        {filteredArticles.length > 0 && (
          <View style={styles.progressBar}>
            <Text style={styles.progressText}>{currentIndex + 1} / {filteredArticles.length}</Text>
          </View>
        )}
        
        {/* Shake Message */}
        {shakeMessage && (
          <View style={styles.shakeMessage}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.shakeMessageText}>{shakeMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 16 },
  
  // Header
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  // Category Tabs
  categoryTabs: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  tabTextActive: { color: '#2563EB', fontWeight: '600' },
  
  // Error
  errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#FEF2F2', marginHorizontal: 16, marginTop: 12, borderRadius: 12, gap: 8 },
  errorText: { color: '#DC2626', fontSize: 14 },
  
  // Cards Container
  cardsContainer: { flex: 1 },
  
  // Inshorts Card
  inshortsCard: { 
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
  },
  imageContainer: {
    height: CARD_HEIGHT * 0.32,
    position: 'relative',
  },
  inshortsImage: { 
    width: '100%', 
    height: '100%',
    backgroundColor: '#1F2937',
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
    padding: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  imageActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Content Section
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inshortsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 14,
  },
  descriptionContainer: {
    flex: 1,
  },
  inshortsDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 12,
  },
  readMoreLink: {
    color: '#2563EB',
    fontWeight: '500',
  },
  
  // Progress Bar
  progressBar: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Shake Message
  shakeMessage: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shakeMessageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
