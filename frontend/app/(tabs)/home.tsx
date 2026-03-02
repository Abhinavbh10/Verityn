import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, Dimensions,
  FlatList, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getPreferences } from '../../src/utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 180; // Account for header, tabs, and bottom bar

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
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
    
    // Calculate reading time (avg 200 words per minute)
    const wordCount = (item.title + ' ' + item.description).split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
      <View style={styles.inshortsCard}>
        {/* Image Section - Reduced height */}
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
            <View style={[styles.imagePlaceholder, { backgroundColor: `${categoryColor}15` }]}>
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

        {/* Content Section - Expanded */}
        <View style={styles.contentSection}>
          {/* Category & Time Row */}
          <View style={styles.metaRow}>
            <View style={[styles.categoryTag, { backgroundColor: `${categoryColor}15` }]}>
              <Text style={[styles.categoryTagText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <Text style={styles.timeText}>{timeAgo} ago</Text>
          </View>

          {/* Title */}
          <Text style={styles.inshortsTitle}>{item.title}</Text>
          
          {/* Description - Full display */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.inshortsDescription}>
              {item.description}
              <Text style={styles.readMoreLink} onPress={() => openArticle(item.link)}>
                {' '}Read more →
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // List Card Component (Original)
  const renderListCard = ({ item }: { item: Article }) => {
    const categoryColor = getCategoryColor(item.category);
    const isBookmarked = bookmarkedIds.has(item.id);
    return (
      <TouchableOpacity style={styles.articleCard} onPress={() => openArticle(item.link)} activeOpacity={0.7}>
        {item.image_url && <Image source={{ uri: item.image_url }} style={styles.articleImage} resizeMode="cover" />}
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleBookmark(item)} style={styles.bookmarkButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={isBookmarked ? '#2563EB' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.articleTitle} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.articleDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.articleFooter}>
            <View style={styles.sourceRow}><Ionicons name="newspaper-outline" size={14} color="#9CA3AF" /><Text style={styles.sourceText}>{item.source}</Text></View>
            <View style={styles.dateRow}><Ionicons name="time-outline" size={14} color="#9CA3AF" /><Text style={styles.dateText}>{formatDate(item.published)}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verityn</Text>
        <Text style={styles.headerSubtitle}>European News</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'all' && styles.tabActive]} 
            onPress={() => { setActiveFilter('all'); setCurrentIndex(0); }}
          >
            <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>My Feed</Text>
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
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {viewMode === 'cards' ? (
        // Inshorts-style Cards View
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptyText}>{activeFilter !== 'all' ? 'No news in this category.' : 'Pull down to refresh.'}</Text>
            </View>
          )}
          
          {/* Progress Indicator */}
          {filteredArticles.length > 0 && (
            <View style={styles.progressBar}>
              <Text style={styles.progressText}>{currentIndex + 1} / {filteredArticles.length}</Text>
            </View>
          )}
        </View>
      ) : (
        // List View
        <View style={styles.listContainer}>
          <FlashList 
            data={filteredArticles} 
            renderItem={renderListCard} 
            estimatedItemSize={280} 
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Articles Found</Text>
                <Text style={styles.emptyText}>{activeFilter !== 'all' ? 'No news in this category.' : 'Pull down to refresh.'}</Text>
              </View>
            }
            contentContainerStyle={styles.listContent} 
          />
        </View>
      )}
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
  
  // Swipe Indicator
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  swipeText: {
    fontSize: 10,
    color: '#CBD5E1',
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
  
  // List View Styles
  listContainer: { flex: 1 },
  listContent: { padding: 16 },
  articleCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  articleImage: { width: '100%', height: 180, backgroundColor: '#F1F5F9' },
  articleContent: { padding: 16 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  bookmarkButton: { padding: 4 },
  articleTitle: { fontSize: 17, fontWeight: '600', color: '#1E293B', lineHeight: 24, marginBottom: 8 },
  articleDescription: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 12 },
  articleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceText: { fontSize: 12, color: '#9CA3AF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  
  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
