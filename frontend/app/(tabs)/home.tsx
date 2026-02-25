import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import Constants from 'expo-constants';

const STORAGE_KEY = '@user_preferences';

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

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'politics', name: 'Politics', icon: 'business', color: '#3B82F6' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#10B981' },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', color: '#8B5CF6' },
  { id: 'sports', name: 'Sports', icon: 'trophy', color: '#F59E0B' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#EC4899' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#EF4444' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#06B6D4' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://euroews-rss.preview.emergentagent.com';

export default function HomeScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferencesAndFetch();
  }, []);

  const loadPreferencesAndFetch = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
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
      const categoriesParam = categories.join(',');
      const response = await fetch(
        `${API_BASE_URL}/api/news?categories=${categoriesParam}&limit=50`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('Unable to load news. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNews(selectedCategories);
  }, [selectedCategories]);

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      // Fall through to return original
    }
    return dateString;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId.toLowerCase());
    return category?.color || '#64748B';
  };

  const filteredArticles = activeFilter === 'all' 
    ? articles 
    : articles.filter(a => a.category.toLowerCase() === activeFilter);

  const openArticle = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const categoryColor = getCategoryColor(item.category);
    
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
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
          <Text style={styles.articleTitle} numberOfLines={3}>
            {item.title}
          </Text>
          <Text style={styles.articleDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.articleFooter}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.dateText}>{formatDate(item.published)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EuroNews</Text>
          <Text style={styles.headerSubtitle}>Latest from Europe</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {selectedCategories.map((catId) => {
            const category = CATEGORIES.find(c => c.id === catId);
            if (!category) return null;
            const isActive = activeFilter === catId;
            return (
              <TouchableOpacity
                key={catId}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: category.color },
                ]}
                onPress={() => setActiveFilter(catId)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={isActive ? '#fff' : category.color}
                  style={styles.filterIcon}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Articles List */}
      <View style={styles.listContainer}>
        <FlashList
          data={filteredArticles}
          renderItem={renderArticle}
          estimatedItemSize={280}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color="#475569" />
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptyText}>
                {activeFilter !== 'all'
                  ? 'No news in this category. Try another filter.'
                  : 'Pull down to refresh or check your internet connection.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#7F1D1D20',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  articleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  articleImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#334155',
  },
  articleContent: {
    padding: 16,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sourceText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 24,
    marginBottom: 8,
  },
  articleDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
