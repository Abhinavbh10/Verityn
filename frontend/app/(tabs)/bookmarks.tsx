import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { getBookmarks, removeBookmark, clearAllBookmarks, BookmarkedArticle } from '../../src/utils/bookmarks';

const CATEGORIES = [
  { id: 'politics', name: 'Politics', color: '#3B82F6' },
  { id: 'business', name: 'Business', color: '#10B981' },
  { id: 'technology', name: 'Technology', color: '#8B5CF6' },
  { id: 'sports', name: 'Sports', color: '#F59E0B' },
  { id: 'entertainment', name: 'Entertainment', color: '#EC4899' },
  { id: 'health', name: 'Health', color: '#EF4444' },
  { id: 'science', name: 'Science', color: '#06B6D4' },
];

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    setLoading(true);
    const data = await getBookmarks();
    setBookmarks(data);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
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

  const handleRemoveBookmark = async (articleId: string) => {
    await removeBookmark(articleId);
    setBookmarks(prev => prev.filter(b => b.id !== articleId));
  };

  const handleClearAll = () => {
    if (bookmarks.length === 0) return;
    
    Alert.alert(
      'Clear All Bookmarks',
      'Are you sure you want to remove all saved articles?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllBookmarks();
            setBookmarks([]);
          },
        },
      ]
    );
  };

  const renderArticle = ({ item }: { item: BookmarkedArticle }) => {
    const categoryColor = getCategoryColor(item.category);
    
    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => openArticle(item.link)}
        activeOpacity={0.7}
      >
        <View style={styles.articleRow}>
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.articleContent}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {item.category}
              </Text>
            </View>
            <Text style={styles.articleTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveBookmark(item.id)}
            style={styles.removeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.articleFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="bookmark" size={14} color="#F59E0B" />
            <Text style={styles.dateText}>
              Saved {formatDate(item.bookmarkedAt)}
            </Text>
          </View>
          <View style={styles.readRow}>
            <Text style={styles.readText}>Tap to read</Text>
            <Ionicons name="chevron-forward" size={14} color="#64748B" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          <Text style={styles.headerSubtitle}>
            {bookmarks.length} saved article{bookmarks.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bookmarks List */}
      <View style={styles.listContainer}>
        <FlashList
          data={bookmarks}
          renderItem={renderArticle}
          estimatedItemSize={150}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={64} color="#475569" />
              <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
              <Text style={styles.emptyText}>
                Save articles for later by tapping the bookmark icon
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7F1D1D20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 14,
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
    padding: 14,
  },
  articleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  articleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 20,
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    color: '#64748B',
  },
  removeButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readText: {
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
  },
});
