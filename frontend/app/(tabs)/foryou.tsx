import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, TextInput, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { addBookmark, removeBookmark, getBookmarks } from '../../src/utils/bookmarks';
import { getKeywords, addKeyword, removeKeyword, SUGGESTED_KEYWORDS } from '../../src/utils/keywords';

interface Article { id: string; title: string; description: string; link: string; published: string; source: string; category: string; image_url?: string; }

const CATEGORIES = [
  { id: 'politics', color: '#2563EB' }, { id: 'business', color: '#059669' },
  { id: 'technology', color: '#7C3AED' }, { id: 'sports', color: '#D97706' },
  { id: 'entertainment', color: '#DB2777' }, { id: 'health', color: '#DC2626' },
  { id: 'science', color: '#0891B2' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ForYouScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeKeyword, setActiveKeyword] = useState<string>('all');

  useFocusEffect(useCallback(() => { loadKeywordsAndFetch(); loadBookmarks(); }, []));

  const loadBookmarks = async () => { const bookmarks = await getBookmarks(); setBookmarkedIds(new Set(bookmarks.map(b => b.id))); };

  const loadKeywordsAndFetch = async () => {
    const userKeywords = await getKeywords();
    setKeywords(userKeywords);
    if (userKeywords.length > 0) await fetchNewsForKeywords(userKeywords);
    else setLoading(false);
  };

  const fetchNewsForKeywords = async (keywordList: string[]) => {
    try {
      const allArticles: Article[] = []; const seenIds = new Set<string>();
      for (const keyword of keywordList.slice(0, 5)) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(keyword)}&limit=20`);
          if (response.ok) {
            const data = await response.json();
            for (const article of data.articles || []) {
              // Only include articles that have images
              if (!seenIds.has(article.id) && article.image_url) { 
                seenIds.add(article.id); 
                allArticles.push(article); 
              }
            }
          }
        } catch (err) { console.error(`Error fetching for keyword ${keyword}:`, err); }
      }
      allArticles.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
      setArticles(allArticles);
    } catch (error) { console.error('Error fetching news:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadBookmarks(); await fetchNewsForKeywords(keywords); }, [keywords]);

  const handleAddKeyword = async () => {
    if (newKeyword.trim().length < 2) return;
    Keyboard.dismiss();
    const success = await addKeyword(newKeyword);
    if (success) {
      const updatedKeywords = [...keywords, newKeyword.trim().toLowerCase()];
      setKeywords(updatedKeywords); setNewKeyword(''); setShowKeywordInput(false);
      setLoading(true); await fetchNewsForKeywords(updatedKeywords);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    await removeKeyword(keyword);
    const updatedKeywords = keywords.filter(k => k !== keyword);
    setKeywords(updatedKeywords);
    if (activeKeyword === keyword) setActiveKeyword('all');
    if (updatedKeywords.length > 0) { setLoading(true); await fetchNewsForKeywords(updatedKeywords); }
    else setArticles([]);
  };

  const handleAddSuggestedKeyword = async (keyword: string) => {
    if (keywords.includes(keyword.toLowerCase())) return;
    const success = await addKeyword(keyword);
    if (success) {
      const updatedKeywords = [...keywords, keyword.toLowerCase()];
      setKeywords(updatedKeywords); setLoading(true); await fetchNewsForKeywords(updatedKeywords);
    }
  };

  const formatDate = (dateString: string) => { try { const date = parseISO(dateString); if (isValid(date)) return format(date, 'MMM d, h:mm a'); } catch {} return dateString; };
  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#64748B';
  const openArticle = async (url: string) => { try { await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#2563EB' }); } catch (error) { console.error('Error:', error); } };

  const toggleBookmark = async (article: Article) => {
    if (bookmarkedIds.has(article.id)) {
      await removeBookmark(article.id); setBookmarkedIds(prev => { const newSet = new Set(prev); newSet.delete(article.id); return newSet; });
    } else { await addBookmark(article); setBookmarkedIds(prev => new Set(prev).add(article.id)); }
  };

  // Only show articles with images
  const articlesWithImages = articles.filter(a => a.image_url);
  const filteredArticles = activeKeyword === 'all' ? articlesWithImages : articlesWithImages.filter(a => a.title.toLowerCase().includes(activeKeyword) || a.description.toLowerCase().includes(activeKeyword));

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

  const renderEmptyKeywords = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles" size={64} color="#2563EB" />
      <Text style={styles.emptyTitle}>Personalize Your Feed</Text>
      <Text style={styles.emptyText}>Add keywords to get news tailored to your interests like immigration, expat life, visa updates, and more.</Text>
      <Text style={styles.suggestedTitle}>Suggested Keywords</Text>
      <View style={styles.suggestedContainer}>
        {SUGGESTED_KEYWORDS.slice(0, 12).map((keyword) => (
          <TouchableOpacity key={keyword} style={styles.suggestedChip} onPress={() => handleAddSuggestedKeyword(keyword)}>
            <Ionicons name="add" size={16} color="#2563EB" /><Text style={styles.suggestedChipText}>{keyword}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading && keywords.length > 0) {
    return <SafeAreaView style={styles.container} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Finding news for you...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>For You</Text><Text style={styles.headerSubtitle}>News matching your interests</Text></View>
        <TouchableOpacity onPress={() => setShowKeywordInput(!showKeywordInput)} style={styles.addButton}>
          <Ionicons name={showKeywordInput ? "close" : "add"} size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>
      {showKeywordInput && (
        <View style={styles.addKeywordContainer}>
          <TextInput style={styles.keywordInput} placeholder="Add keyword (e.g., immigration, expat)" placeholderTextColor="#9CA3AF" value={newKeyword} onChangeText={setNewKeyword} onSubmitEditing={handleAddKeyword} returnKeyType="done" autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity style={[styles.addKeywordButton, newKeyword.trim().length < 2 && styles.addKeywordButtonDisabled]} onPress={handleAddKeyword} disabled={newKeyword.trim().length < 2}>
            <Text style={styles.addKeywordButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
      {keywords.length > 0 && (
        <View style={styles.keywordsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keywordsContainer}>
            <TouchableOpacity style={[styles.keywordChip, activeKeyword === 'all' && styles.keywordChipActive]} onPress={() => setActiveKeyword('all')}>
              <Text style={[styles.keywordChipText, activeKeyword === 'all' && styles.keywordChipTextActive]}>All ({articlesWithImages.length})</Text>
            </TouchableOpacity>
            {keywords.map((keyword) => (
              <View key={keyword} style={styles.keywordChipWrapper}>
                <TouchableOpacity style={[styles.keywordChip, activeKeyword === keyword && styles.keywordChipActive]} onPress={() => setActiveKeyword(keyword)}>
                  <Text style={[styles.keywordChipText, activeKeyword === keyword && styles.keywordChipTextActive]}>{keyword}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeKeywordButton} onPress={() => handleRemoveKeyword(keyword)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      {keywords.length === 0 ? <ScrollView contentContainerStyle={styles.scrollContent}>{renderEmptyKeywords()}</ScrollView> : (
        <View style={styles.listContainer}>
          <FlashList data={filteredArticles} renderItem={renderArticle} estimatedItemSize={200} keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" colors={['#2563EB']} />}
            ListEmptyComponent={<View style={styles.noResultsContainer}><Ionicons name="search-outline" size={48} color="#D1D5DB" /><Text style={styles.noResultsTitle}>No matching news</Text><Text style={styles.noResultsText}>Try adding more keywords or pull to refresh</Text></View>}
            contentContainerStyle={styles.listContent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  addKeywordContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  keywordInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 16, color: '#1E293B', borderWidth: 1, borderColor: '#E5E7EB' },
  addKeywordButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  addKeywordButtonDisabled: { backgroundColor: '#D1D5DB' },
  addKeywordButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  keywordsSection: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  keywordsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  keywordChipWrapper: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  keywordChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 4 },
  keywordChipActive: { backgroundColor: '#2563EB' },
  keywordChipText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  keywordChipTextActive: { color: '#fff' },
  removeKeywordButton: { marginLeft: -4 },
  scrollContent: { flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  suggestedTitle: { fontSize: 16, fontWeight: '600', color: '#64748B', marginBottom: 16 },
  suggestedContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DBEAFE', gap: 4 },
  suggestedChipText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
  listContainer: { flex: 1 },
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
  noResultsContainer: { alignItems: 'center', paddingVertical: 48 },
  noResultsTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  noResultsText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
