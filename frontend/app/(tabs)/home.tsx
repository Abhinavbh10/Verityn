import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getPreferences } from '../../src/utils/storage';

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

  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#64748B';

  const filteredArticles = activeFilter === 'all' ? articles : articles.filter(a => a.category.toLowerCase() === activeFilter);

  const openArticle = async (url: string) => {
    try { await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#2563EB' }); }
    catch (error) { console.error('Error opening URL:', error); }
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

  const renderArticle = ({ item }: { item: Article }) => {
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
    return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Loading news...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Svg width={32} height={32} viewBox="0 0 100 100">
            <Defs><LinearGradient id="headerLogo" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#2563EB" /><Stop offset="100%" stopColor="#1D4ED8" /></LinearGradient></Defs>
            <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#headerLogo)" strokeWidth="4" />
            <Path d="M30 35 L50 70 L70 35" fill="none" stroke="url(#headerLogo)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View><Text style={styles.headerTitle}>Verityn</Text><Text style={styles.headerSubtitle}>European News</Text></View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}><Ionicons name="refresh" size={24} color="#2563EB" /></TouchableOpacity>
      </View>
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]} onPress={() => setActiveFilter('all')}>
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {selectedCategories.map((catId) => {
            const category = CATEGORIES.find(c => c.id === catId); if (!category) return null;
            const isActive = activeFilter === catId;
            return (
              <TouchableOpacity key={catId} style={[styles.filterChip, isActive && { backgroundColor: category.color }]} onPress={() => setActiveFilter(catId)}>
                <Ionicons name={category.icon as any} size={16} color={isActive ? '#fff' : category.color} style={styles.filterIcon} />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {error && <View style={styles.errorContainer}><Ionicons name="alert-circle" size={24} color="#DC2626" /><Text style={styles.errorText}>{error}</Text></View>}
      <View style={styles.listContainer}>
        <FlashList data={filteredArticles} renderItem={renderArticle} estimatedItemSize={280} keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="newspaper-outline" size={64} color="#D1D5DB" /><Text style={styles.emptyTitle}>No Articles Found</Text><Text style={styles.emptyText}>{activeFilter !== 'all' ? 'No news in this category.' : 'Pull down to refresh.'}</Text></View>}
          contentContainerStyle={styles.listContent} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  refreshButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  filterSection: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  filterChipActive: { backgroundColor: '#2563EB' },
  filterIcon: { marginRight: 6 },
  filterChipText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#FEF2F2', marginHorizontal: 16, marginTop: 12, borderRadius: 12, gap: 8 },
  errorText: { color: '#DC2626', fontSize: 14 },
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
