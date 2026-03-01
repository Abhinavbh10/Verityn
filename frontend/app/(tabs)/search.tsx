import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Image, Keyboard, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';

interface Article { id: string; title: string; description: string; link: string; published: string; source: string; category: string; image_url?: string; }

const CATEGORIES = [
  { id: 'politics', color: '#2563EB' }, { id: 'business', color: '#059669' },
  { id: 'technology', color: '#7C3AED' }, { id: 'sports', color: '#D97706' },
  { id: 'entertainment', color: '#DB2777' }, { id: 'health', color: '#DC2626' },
  { id: 'science', color: '#0891B2' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const loadBookmarks = async () => { const bookmarks = await getBookmarks(); setBookmarkedIds(new Set(bookmarks.map(b => b.id))); };

  const searchNews = useCallback(async () => {
    if (query.trim().length < 2) return;
    Keyboard.dismiss(); setLoading(true); setSearched(true); await loadBookmarks();
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}&limit=50`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) { console.error('Error searching:', error); setArticles([]); }
    finally { setLoading(false); }
  }, [query]);

  const formatDate = (dateString: string) => { try { const date = parseISO(dateString); if (isValid(date)) return format(date, 'MMM d, h:mm a'); } catch {} return dateString; };
  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#64748B';
  const openArticle = async (url: string) => { try { await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#2563EB' }); } catch (error) { console.error('Error:', error); } };

  const toggleBookmark = async (article: Article) => {
    if (bookmarkedIds.has(article.id)) {
      await removeBookmark(article.id); setBookmarkedIds(prev => { const newSet = new Set(prev); newSet.delete(article.id); return newSet; });
    } else { await addBookmark(article); setBookmarkedIds(prev => new Set(prev).add(article.id)); }
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const categoryColor = getCategoryColor(item.category); const isBookmarked = bookmarkedIds.has(item.id);
    return (
      <TouchableOpacity style={styles.articleCard} onPress={() => openArticle(item.link)} activeOpacity={0.7}>
        {item.image_url && <Image source={{ uri: item.image_url }} style={styles.articleImage} resizeMode="cover" />}
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}><Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text></View>
            <TouchableOpacity onPress={() => toggleBookmark(item)} style={styles.bookmarkButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={isBookmarked ? '#2563EB' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.articleFooter}>
            <Text style={styles.sourceText}>{item.source}</Text>
            <View style={styles.dateRow}><Ionicons name="time-outline" size={12} color="#9CA3AF" /><Text style={styles.dateText}>{formatDate(item.published)}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search News</Text>
        <Text style={styles.headerSubtitle}>Find articles across all categories</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput style={styles.searchInput} placeholder="Search for news..." placeholderTextColor="#9CA3AF" value={query} onChangeText={setQuery} onSubmitEditing={searchNews} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color="#9CA3AF" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={[styles.searchButton, query.trim().length < 2 && styles.searchButtonDisabled]} onPress={searchNews} disabled={query.trim().length < 2}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Searching...</Text></View>
        ) : searched ? (
          <FlashList data={articles} renderItem={renderArticle} estimatedItemSize={200} keyExtractor={(item) => item.id}
            ListHeaderComponent={articles.length > 0 ? <Text style={styles.resultsCount}>Found {articles.length} article{articles.length !== 1 ? 's' : ''}</Text> : null}
            ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="search-outline" size={64} color="#D1D5DB" /><Text style={styles.emptyTitle}>No Results Found</Text><Text style={styles.emptyText}>Try a different search term</Text></View>}
            contentContainerStyle={styles.listContent} />
        ) : (
          <View style={styles.initialContainer}>
            <Ionicons name="search" size={64} color="#D1D5DB" />
            <Text style={styles.initialTitle}>Search Verityn</Text>
            <Text style={styles.initialText}>Enter a keyword to search through all news articles</Text>
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Popular searches:</Text>
              {['AI', 'Climate', 'Economy', 'Ukraine'].map((term) => (
                <TouchableOpacity key={term} style={styles.suggestionChip} onPress={() => setQuery(term)}>
                  <Text style={styles.suggestionText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  searchButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  searchButtonDisabled: { backgroundColor: '#D1D5DB' },
  searchButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultsContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 16 },
  resultsCount: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  listContent: { padding: 16 },
  articleCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  articleImage: { width: '100%', height: 140, backgroundColor: '#F1F5F9' },
  articleContent: { padding: 14 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bookmarkButton: { padding: 4 },
  articleTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', lineHeight: 22, marginBottom: 8 },
  articleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceText: { fontSize: 12, color: '#9CA3AF' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  initialContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  initialTitle: { fontSize: 22, fontWeight: '600', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  initialText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, gap: 8 },
  suggestionsTitle: { width: '100%', textAlign: 'center', fontSize: 13, color: '#64748B', marginBottom: 4 },
  suggestionChip: { backgroundColor: '#F0F7FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE' },
  suggestionText: { color: '#2563EB', fontSize: 14, fontWeight: '500' },
});
