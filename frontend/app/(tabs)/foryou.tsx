import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Keyboard,
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

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  category: string;
  image_url?: string;
}

const CATEGORIES = [
  { id: 'politics', color: '#3B82F6' },
  { id: 'business', color: '#10B981' },
  { id: 'technology', color: '#8B5CF6' },
  { id: 'sports', color: '#F59E0B' },
  { id: 'entertainment', color: '#EC4899' },
  { id: 'health', color: '#EF4444' },
  { id: 'science', color: '#06B6D4' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  '';

export default function ForYouScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeKeyword, setActiveKeyword] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      loadKeywordsAndFetch();
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    const bookmarks = await getBookmarks();
    setBookmarkedIds(new Set(bookmarks.map(b => b.id)));
  };

  const loadKeywordsAndFetch = async () => {
    const userKeywords = await getKeywords();
    setKeywords(userKeywords);
    if (userKeywords.length > 0) {
      await fetchNewsForKeywords(userKeywords);
    } else {
      setLoading(false);
    }
  };

  const fetchNewsForKeywords = async (keywordList: string[]) => {
    try {
      // Fetch news for each keyword and combine
      const allArticles: Article[] = [];
      const seenIds = new Set<string>();

      for (const keyword of keywordList.slice(0, 5)) { // Limit to 5 keywords
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/search?q=${encodeURIComponent(keyword)}&limit=15`
          );
          if (response.ok) {
            const data = await response.json();
            for (const article of data.articles || []) {
              if (!seenIds.has(article.id)) {
                seenIds.add(article.id);
                allArticles.push({ ...article, matchedKeyword: keyword });
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching for keyword ${keyword}:`, err);
        }
      }

      // Sort by date
      allArticles.sort((a, b) => 
        new Date(b.published).getTime() - new Date(a.published).getTime()
      );

      setArticles(allArticles);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookmarks();
    await fetchNewsForKeywords(keywords);
  }, [keywords]);

  const handleAddKeyword = async () => {
    if (newKeyword.trim().length < 2) return;
    
    Keyboard.dismiss();
    const success = await addKeyword(newKeyword);
    if (success) {
      const updatedKeywords = [...keywords, newKeyword.trim().toLowerCase()];
      setKeywords(updatedKeywords);
      setNewKeyword('');
      setShowKeywordInput(false);
      setLoading(true);
      await fetchNewsForKeywords(updatedKeywords);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    await removeKeyword(keyword);
    const updatedKeywords = keywords.filter(k => k !== keyword);
    setKeywords(updatedKeywords);
    if (activeKeyword === keyword) {
      setActiveKeyword('all');
    }
    if (updatedKeywords.length > 0) {
      setLoading(true);
      await fetchNewsForKeywords(updatedKeywords);
    } else {
      setArticles([]);
    }
  };

  const handleAddSuggestedKeyword = async (keyword: string) => {
    if (keywords.includes(keyword.toLowerCase())) return;
    
    const success = await addKeyword(keyword);
    if (success) {
      const updatedKeywords = [...keywords, keyword.toLowerCase()];
      setKeywords(updatedKeywords);
      setLoading(true);
      await fetchNewsForKeywords(updatedKeywords);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      // Fall through
    }
    return dateString;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId.toLowerCase());
    return category?.color || '#64748B';
  };

  const openArticle = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: '#0F172A',
        controlsColor: '#3B82F6',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (error) {
      console.error('Error opening URL:', error);
    }
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

  const filteredArticles = activeKeyword === 'all' 
    ? articles 
    : articles.filter(a => 
        a.title.toLowerCase().includes(activeKeyword) || 
        a.description.toLowerCase().includes(activeKeyword)
      );

  const renderArticle = ({ item }: { item: Article }) => {
    const categoryColor = getCategoryColor(item.category);
    const isBookmarked = bookmarkedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => openArticle(item.link)}
        activeOpacity={0.7}
      >
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {item.category}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleBookmark(item)}
              style={styles.bookmarkButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isBookmarked ? '#F59E0B' : '#64748B'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.articleFooter}>
            <Text style={styles.sourceText}>{item.source}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={12} color="#64748B" />
              <Text style={styles.dateText}>{formatDate(item.published)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyKeywords = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles" size={64} color="#8B5CF6" />
      <Text style={styles.emptyTitle}>Personalize Your Feed</Text>
      <Text style={styles.emptyText}>
        Add keywords to get news tailored to your interests like immigration, expat life, visa updates, and more.
      </Text>
      
      <Text style={styles.suggestedTitle}>Suggested Keywords</Text>
      <View style={styles.suggestedContainer}>
        {SUGGESTED_KEYWORDS.slice(0, 12).map((keyword) => (
          <TouchableOpacity
            key={keyword}
            style={styles.suggestedChip}
            onPress={() => handleAddSuggestedKeyword(keyword)}
          >
            <Ionicons name="add" size={16} color="#8B5CF6" />
            <Text style={styles.suggestedChipText}>{keyword}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading && keywords.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Finding news for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>For You</Text>
          <Text style={styles.headerSubtitle}>News matching your interests</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowKeywordInput(!showKeywordInput)} 
          style={styles.addButton}
        >
          <Ionicons name={showKeywordInput ? "close" : "add"} size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Add Keyword Input */}
      {showKeywordInput && (
        <View style={styles.addKeywordContainer}>
          <TextInput
            style={styles.keywordInput}
            placeholder="Add keyword (e.g., immigration, expat)"
            placeholderTextColor="#64748B"
            value={newKeyword}
            onChangeText={setNewKeyword}
            onSubmitEditing={handleAddKeyword}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addKeywordButton, newKeyword.trim().length < 2 && styles.addKeywordButtonDisabled]}
            onPress={handleAddKeyword}
            disabled={newKeyword.trim().length < 2}
          >
            <Text style={styles.addKeywordButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Keywords Filter */}
      {keywords.length > 0 && (
        <View style={styles.keywordsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.keywordsContainer}
          >
            <TouchableOpacity
              style={[
                styles.keywordChip,
                activeKeyword === 'all' && styles.keywordChipActive,
              ]}
              onPress={() => setActiveKeyword('all')}
            >
              <Text style={[
                styles.keywordChipText,
                activeKeyword === 'all' && styles.keywordChipTextActive,
              ]}>
                All ({articles.length})
              </Text>
            </TouchableOpacity>
            {keywords.map((keyword) => (
              <View key={keyword} style={styles.keywordChipWrapper}>
                <TouchableOpacity
                  style={[
                    styles.keywordChip,
                    activeKeyword === keyword && styles.keywordChipActive,
                  ]}
                  onPress={() => setActiveKeyword(keyword)}
                >
                  <Text style={[
                    styles.keywordChipText,
                    activeKeyword === keyword && styles.keywordChipTextActive,
                  ]}>
                    {keyword}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeKeywordButton}
                  onPress={() => handleRemoveKeyword(keyword)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {keywords.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderEmptyKeywords()}
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            data={filteredArticles}
            renderItem={renderArticle}
            estimatedItemSize={200}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8B5CF6"
                colors={['#8B5CF6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#475569" />
                <Text style={styles.noResultsTitle}>No matching news</Text>
                <Text style={styles.noResultsText}>
                  Try adding more keywords or pull to refresh
                </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addKeywordContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  keywordInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#F8FAFC',
  },
  addKeywordButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addKeywordButtonDisabled: {
    backgroundColor: '#475569',
  },
  addKeywordButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  keywordsSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  keywordsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  keywordChipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  keywordChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 4,
  },
  keywordChipActive: {
    backgroundColor: '#8B5CF6',
  },
  keywordChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  keywordChipTextActive: {
    color: '#fff',
  },
  removeKeywordButton: {
    marginLeft: -4,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  suggestedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
  },
  suggestedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B5CF620',
    gap: 4,
  },
  suggestedChipText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  articleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  articleImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#334155',
  },
  articleContent: {
    padding: 14,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookmarkButton: {
    padding: 4,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 22,
    marginBottom: 8,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceText: {
    fontSize: 12,
    color: '#64748B',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
