import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid } from 'date-fns';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { getBookmarks, removeBookmark, clearAllBookmarks, BookmarkedArticle } from '../../src/utils/bookmarks';

// European Elegance theme colors
const CATEGORIES = [
  { id: 'politics', color: '#1E3A5F' }, { id: 'business', color: '#B45309' },
  { id: 'technology', color: '#7C3AED' }, { id: 'sports', color: '#059669' },
  { id: 'entertainment', color: '#DB2777' }, { id: 'health', color: '#DC2626' },
  { id: 'science', color: '#0891B2' },
];

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadBookmarks(); }, []));

  const loadBookmarks = async () => { setLoading(true); const data = await getBookmarks(); setBookmarks(data); setLoading(false); };

  const formatDate = (dateString: string) => { try { const date = parseISO(dateString); if (isValid(date)) return format(date, 'MMM d, yyyy'); } catch {} return dateString; };
  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || '#64748B';
  const openArticle = async (url: string) => { try { await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#2563EB' }); } catch (error) { console.error('Error:', error); } };

  const handleRemoveBookmark = async (articleId: string) => { await removeBookmark(articleId); setBookmarks(prev => prev.filter(b => b.id !== articleId)); };

  const handleClearAll = () => {
    if (bookmarks.length === 0) return;
    
    const doClear = async () => {
      try {
        await clearAllBookmarks();
        setBookmarks([]);
      } catch (err) {
        console.error('Error clearing bookmarks:', err);
      }
    };
    
    // On web, use window.confirm; on native, use Alert.alert
    if (Platform.OS === 'web') {
      // For web, show confirm dialog
      let confirmed = true;
      if (typeof window !== 'undefined') {
        confirmed = window.confirm('Clear All Bookmarks?\n\nAre you sure you want to remove all saved articles?');
      }
      
      if (confirmed) {
        doClear();
      }
    } else {
      Alert.alert('Clear All Bookmarks', 'Are you sure you want to remove all saved articles?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: doClear },
      ]);
    }
  };

  const renderArticle = ({ item }: { item: BookmarkedArticle }) => {
    const categoryColor = getCategoryColor(item.category);
    return (
      <TouchableOpacity style={styles.articleCard} onPress={() => openArticle(item.link)} activeOpacity={0.7}>
        <View style={styles.articleRow}>
          {item.image_url && <Image source={{ uri: item.image_url }} style={styles.articleImage} resizeMode="cover" />}
          <View style={styles.articleContent}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}><Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text></View>
            <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
          <TouchableOpacity onPress={() => handleRemoveBookmark(item.id)} style={styles.removeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
        <View style={styles.articleFooter}>
          <View style={styles.dateRow}><Ionicons name="bookmark" size={14} color="#2563EB" /><Text style={styles.dateText}>Saved {formatDate(item.bookmarkedAt)}</Text></View>
          <View style={styles.readRow}><Text style={styles.readText}>Tap to read</Text><Ionicons name="chevron-forward" size={14} color="#9CA3AF" /></View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>Saved</Text><Text style={styles.headerSubtitle}>{bookmarks.length} saved article{bookmarks.length !== 1 ? 's' : ''}</Text></View>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" /><Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.listContainer}>
        <FlashList data={bookmarks} renderItem={renderArticle} estimatedItemSize={150} keyExtractor={(item) => item.id}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="bookmark-outline" size={64} color="#D1D5DB" /><Text style={styles.emptyTitle}>No Bookmarks Yet</Text><Text style={styles.emptyText}>Save articles for later by tapping the bookmark icon</Text></View>}
          contentContainerStyle={styles.listContent} />
      </View>
    </SafeAreaView>
  );
}

// European Elegance styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E7E5E4' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#292524', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#78716C', marginTop: 2 },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  clearButtonText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  listContainer: { flex: 1 },
  listContent: { padding: 16 },
  articleCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#E7E5E4', shadowColor: '#44403C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  articleRow: { flexDirection: 'row', gap: 12 },
  articleImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E7E5E4' },
  articleContent: { flex: 1, justifyContent: 'center' },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  categoryText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  articleTitle: { fontSize: 14, fontWeight: '600', color: '#292524', lineHeight: 20, marginBottom: 4 },
  sourceText: { fontSize: 12, color: '#A8A29E' },
  removeButton: { padding: 8, alignSelf: 'flex-start' },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E7E5E4' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: '#78716C' },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readText: { fontSize: 12, color: '#A8A29E' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#292524', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#78716C', textAlign: 'center' },
});
