import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView, Image, TextInput, Platform, Keyboard, Modal,
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
import { useTheme } from '../../src/utils/theme';
import { 
  getLocationPreferences, 
  saveLocationPreferences, 
  EUROPEAN_COUNTRIES,
} from '../../src/utils/locations';
import { VeritynLoader } from '../../src/components/VeritynLoader';
import { TabRefreshEvents } from '../../src/utils/tabRefresh';

interface UserLocationPreference {
  countries: string[];
  cities: string[];
}

interface Country {
  id: string;
  name: string;
  flag: string;
  cities: string[];
}

interface Article { id: string; title: string; description: string; link: string; published: string; source: string; category: string; image_url?: string; }

// European Elegance theme colors
const CATEGORIES = [
  { id: 'politics', color: '#1E3A5F' }, { id: 'business', color: '#B45309' },
  { id: 'technology', color: '#7C3AED' }, { id: 'sports', color: '#059669' },
  { id: 'entertainment', color: '#DB2777' }, { id: 'health', color: '#DC2626' },
  { id: 'science', color: '#0891B2' },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://news-feed-eu.preview.emergentagent.com';

export default function ForYouScreen() {
  const { colors, isDark } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [locationArticles, setLocationArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'keywords' | 'location'>('location');
  
  // Location state
  const [locationPrefs, setLocationPrefs] = useState<UserLocationPreference>({ countries: [], cities: [] });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { 
    loadAll(); 
  }, []));

  // Subscribe to tab press refresh events
  useEffect(() => {
    const unsubscribe = TabRefreshEvents.subscribe('foryou', () => {
      loadAll();
    });
    return unsubscribe;
  }, []);

  const loadAll = async () => {
    await Promise.all([loadBookmarks(), loadKeywordsAndFetch(), loadLocationPrefsAndFetch()]);
  };

  const loadBookmarks = async () => { 
    const bookmarks = await getBookmarks(); 
    setBookmarkedIds(new Set(bookmarks.map(b => b.id))); 
  };

  const loadLocationPrefsAndFetch = async () => {
    const prefs = await getLocationPreferences();
    setLocationPrefs(prefs);
    setSelectedCountries(prefs.countries);
    setSelectedCities(prefs.cities);
    if (prefs.countries.length > 0) {
      await fetchLocationNews(prefs.countries, prefs.cities);
    }
  };

  const fetchLocationNews = async (countries: string[], cities: string[]) => {
    if (countries.length === 0) {
      setLocationArticles([]);
      return;
    }
    try {
      const citiesParam = cities.length > 0 ? `&cities=${cities.join(',')}` : '';
      const response = await fetch(`${API_BASE_URL}/api/location-news?countries=${countries.join(',')}${citiesParam}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        // Only include articles with images
        const articlesWithImages = (data.articles || []).filter((a: Article) => a.image_url);
        setLocationArticles(articlesWithImages);
      }
    } catch (error) {
      console.error('Error fetching location news:', error);
    }
  };

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

  const onRefresh = useCallback(async () => { 
    setRefreshing(true); 
    await loadBookmarks(); 
    if (activeTab === 'keywords') {
      await fetchNewsForKeywords(keywords);
    } else {
      await fetchLocationNews(locationPrefs.countries, locationPrefs.cities);
    }
    setRefreshing(false);
  }, [keywords, locationPrefs, activeTab]);

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

  const handleSaveLocation = async () => {
    const newPrefs = { countries: selectedCountries, cities: selectedCities };
    await saveLocationPreferences(newPrefs);
    setLocationPrefs(newPrefs);
    setShowLocationModal(false);
    setLoading(true);
    await fetchLocationNews(selectedCountries, selectedCities);
    setLoading(false);
  };

  const toggleCountry = (countryId: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryId) 
        ? prev.filter(c => c !== countryId)
        : [...prev, countryId]
    );
    // Remove cities from this country if country is deselected
    if (selectedCountries.includes(countryId)) {
      const country = EUROPEAN_COUNTRIES.find(c => c.id === countryId);
      if (country) {
        setSelectedCities(prev => prev.filter(city => !country.cities.includes(city)));
      }
    }
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const formatDate = (dateString: string) => { 
    try { const date = parseISO(dateString); if (isValid(date)) return format(date, 'MMM d, h:mm a'); } 
    catch {} return dateString; 
  };
  
  const getCategoryColor = (categoryId: string) => CATEGORIES.find(c => c.id === categoryId.toLowerCase())?.color || colors.textMuted;
  
  const openArticle = async (url: string) => { 
    try { 
      await WebBrowser.openBrowserAsync(url, { 
        toolbarColor: isDark ? colors.background : '#FDF8F3', 
        controlsColor: colors.primary 
      }); 
    } catch (error) { console.error('Error:', error); } 
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

  const currentArticles = activeTab === 'keywords' ? articles : locationArticles;

  const renderArticle = ({ item }: { item: Article }) => {
    const categoryColor = getCategoryColor(item.category); 
    const isBookmarked = bookmarkedIds.has(item.id);
    return (
      <TouchableOpacity 
        style={[styles.articleCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
        onPress={() => openArticle(item.link)} 
        activeOpacity={0.7}
        data-testid={`article-${item.id}`}
      >
        {item.image_url && <Image source={{ uri: item.image_url }} style={styles.articleImage} resizeMode="cover" />}
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleBookmark(item)} style={styles.bookmarkButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={isBookmarked ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.articleFooter}>
            <Text style={[styles.sourceText, { color: colors.textMuted }]}>{item.source}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(item.published)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocationSetup = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location" size={64} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Set Your Location</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Select countries and cities to get news from specific European regions.
      </Text>
      <TouchableOpacity 
        style={[styles.setupButton, { backgroundColor: colors.primary }]} 
        onPress={() => setShowLocationModal(true)}
        data-testid="setup-location-btn"
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.setupButtonText}>Select Locations</Text>
      </TouchableOpacity>
    </View>
  );

  const renderKeywordSetup = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sparkles" size={64} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Add Keywords</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Add keywords to get news tailored to your interests like immigration, expat life, visa updates.
      </Text>
      <Text style={[styles.suggestedTitle, { color: colors.textMuted }]}>Suggested Keywords</Text>
      <View style={styles.suggestedContainer}>
        {SUGGESTED_KEYWORDS.slice(0, 12).map((keyword) => (
          <TouchableOpacity 
            key={keyword} 
            style={[styles.suggestedChip, { backgroundColor: colors.primaryLight, borderColor: colors.border }]} 
            onPress={() => handleAddSuggestedKeyword(keyword)}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.suggestedChipText, { color: colors.primary }]}>{keyword}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLocationModal = () => (
    <Modal visible={showLocationModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowLocationModal(false)} data-testid="close-modal-btn">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Locations</Text>
          <TouchableOpacity onPress={handleSaveLocation} data-testid="save-location-btn">
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>
            Select countries to see regional news. Tap a country to select cities.
          </Text>
          
          {EUROPEAN_COUNTRIES.map((country) => {
            const isSelected = selectedCountries.includes(country.id);
            const isExpanded = expandedCountry === country.id;
            const selectedCityCount = country.cities.filter(c => selectedCities.includes(c)).length;
            
            return (
              <View key={country.id} style={[styles.countrySection, { borderColor: colors.border }]}>
                <TouchableOpacity 
                  style={styles.countryRow}
                  onPress={() => toggleCountry(country.id)}
                  data-testid={`country-${country.id}`}
                >
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[styles.countryName, { color: colors.text }]}>{country.name}</Text>
                    {selectedCityCount > 0 && (
                      <View style={[styles.cityCount, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.cityCountText, { color: colors.primary }]}>{selectedCityCount} cities</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.countryActions}>
                    <TouchableOpacity 
                      onPress={() => setExpandedCountry(isExpanded ? null : country.id)}
                      style={styles.expandButton}
                    >
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <View style={[
                      styles.checkbox, 
                      { borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { backgroundColor: colors.primary }
                    ]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </View>
                </TouchableOpacity>
                
                {isExpanded && isSelected && (
                  <View style={[styles.citiesContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.citiesLabel, { color: colors.textMuted }]}>Select specific cities (optional)</Text>
                    <View style={styles.citiesGrid}>
                      {country.cities.map((city) => {
                        const isCitySelected = selectedCities.includes(city);
                        return (
                          <TouchableOpacity
                            key={city}
                            style={[
                              styles.cityChip,
                              { borderColor: colors.border },
                              isCitySelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                            ]}
                            onPress={() => toggleCity(city)}
                            data-testid={`city-${city}`}
                          >
                            <Text style={[
                              styles.cityChipText, 
                              { color: isCitySelected ? colors.primary : colors.textSecondary }
                            ]}>{city}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          
          <View style={styles.requestSection}>
            <Text style={[styles.requestText, { color: colors.textMuted }]}>
              Don't see your country? More regions coming soon based on user requests.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Generate contextual loading message
  const getLoadingMessage = () => {
    if (activeTab === 'region' && locationPrefs.countries.length > 0) {
      const countryNames = locationPrefs.countries.map(id => 
        EUROPEAN_COUNTRIES.find(c => c.id === id)?.name || id
      ).join(', ');
      return `Finding news from ${countryNames}...`;
    }
    if (keywords.length > 0) {
      return `Searching for "${keywords[0]}"${keywords.length > 1 ? ` and ${keywords.length - 1} more...` : '...'}`;
    }
    return "Finding news for you...";
  };

  if (loading && (keywords.length > 0 || locationPrefs.countries.length > 0)) {
    return <VeritynLoader message={getLoadingMessage()} showTips={false} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>For You</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activeTab === 'location' 
              ? `News from ${locationPrefs.countries.length} region${locationPrefs.countries.length !== 1 ? 's' : ''}`
              : 'News matching your interests'
            }
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => activeTab === 'location' ? setShowLocationModal(true) : setShowKeywordInput(!showKeywordInput)} 
          style={[styles.addButton, { backgroundColor: colors.primaryLight }]}
          data-testid="add-btn"
        >
          <Ionicons name={showKeywordInput ? "close" : "add"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabSwitcher, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'location' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('location')}
          data-testid="tab-location"
        >
          <Ionicons name="location" size={18} color={activeTab === 'location' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'location' ? colors.primary : colors.textMuted }]}>By Region</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'keywords' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('keywords')}
          data-testid="tab-keywords"
        >
          <Ionicons name="sparkles" size={18} color={activeTab === 'keywords' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'keywords' ? colors.primary : colors.textMuted }]}>By Keywords</Text>
        </TouchableOpacity>
      </View>

      {/* Keyword Input */}
      {activeTab === 'keywords' && showKeywordInput && (
        <View style={[styles.addKeywordContainer, { borderBottomColor: colors.border }]}>
          <TextInput 
            style={[styles.keywordInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            placeholder="Add keyword (e.g., immigration, expat)" 
            placeholderTextColor={colors.textMuted} 
            value={newKeyword} 
            onChangeText={setNewKeyword} 
            onSubmitEditing={handleAddKeyword} 
            returnKeyType="done" 
            autoCapitalize="none" 
            autoCorrect={false} 
          />
          <TouchableOpacity 
            style={[styles.addKeywordButton, { backgroundColor: colors.primary }, newKeyword.trim().length < 2 && styles.addKeywordButtonDisabled]} 
            onPress={handleAddKeyword} 
            disabled={newKeyword.trim().length < 2}
          >
            <Text style={styles.addKeywordButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Keywords Chips */}
      {activeTab === 'keywords' && keywords.length > 0 && (
        <View style={[styles.keywordsSection, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keywordsContainer}>
            {keywords.map((keyword) => (
              <View key={keyword} style={styles.keywordChipWrapper}>
                <View style={[styles.keywordChip, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.keywordChipText, { color: colors.primary }]}>{keyword}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeKeywordButton} 
                  onPress={() => handleRemoveKeyword(keyword)} 
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Location Chips */}
      {activeTab === 'location' && locationPrefs.countries.length > 0 && (
        <View style={[styles.keywordsSection, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keywordsContainer}>
            {locationPrefs.countries.map((countryId) => {
              const country = EUROPEAN_COUNTRIES.find(c => c.id === countryId);
              if (!country) return null;
              return (
                <View key={countryId} style={[styles.keywordChip, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.keywordChipText, { color: colors.primary }]}>{country.name}</Text>
                </View>
              );
            })}
            {locationPrefs.cities.length > 0 && (
              <View style={[styles.keywordChip, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.keywordChipText, { color: colors.textSecondary }]}>+{locationPrefs.cities.length} cities</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {activeTab === 'location' && locationPrefs.countries.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{renderLocationSetup()}</ScrollView>
      ) : activeTab === 'keywords' && keywords.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{renderKeywordSetup()}</ScrollView>
      ) : (
        <View style={styles.listContainer}>
          <FlashList 
            data={currentArticles} 
            renderItem={renderArticle} 
            estimatedItemSize={200} 
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.noResultsTitle, { color: colors.text }]}>No news found</Text>
                <Text style={[styles.noResultsText, { color: colors.textMuted }]}>
                  {activeTab === 'location' ? 'Try selecting more countries or cities' : 'Try adding more keywords'}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent} 
          />
        </View>
      )}

      {renderLocationModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  
  // Tab Switcher
  tabSwitcher: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  
  // Keyword input
  addKeywordContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  keywordInput: { flex: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 16, borderWidth: 1 },
  addKeywordButton: { borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  addKeywordButtonDisabled: { opacity: 0.5 },
  addKeywordButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  // Keywords section
  keywordsSection: { borderBottomWidth: 1 },
  keywordsContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  keywordChipWrapper: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  keywordChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 4, gap: 6 },
  keywordChipText: { fontSize: 14, fontWeight: '500' },
  removeKeywordButton: { marginLeft: -4 },
  
  // Content
  scrollContent: { flexGrow: 1 },
  listContainer: { flex: 1 },
  listContent: { padding: 16 },
  
  // Empty states
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  setupButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 8 },
  setupButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  suggestedTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  suggestedContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 4 },
  suggestedChipText: { fontSize: 13, fontWeight: '500' },
  
  // Article card
  articleCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  articleImage: { width: '100%', height: 140 },
  articleContent: { padding: 14 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bookmarkButton: { padding: 4 },
  articleTitle: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 8 },
  articleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceText: { fontSize: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12 },
  
  // No results
  noResultsContainer: { alignItems: 'center', paddingVertical: 48 },
  noResultsTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  noResultsText: { fontSize: 14, textAlign: 'center' },
  
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  modalSectionTitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  // Country section
  countrySection: { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  countryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  countryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  countryFlag: { fontSize: 24 },
  countryName: { fontSize: 16, fontWeight: '500' },
  cityCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  cityCountText: { fontSize: 11, fontWeight: '600' },
  countryActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expandButton: { padding: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  
  // Cities
  citiesContainer: { padding: 14, paddingTop: 0 },
  citiesLabel: { fontSize: 12, marginBottom: 10 },
  citiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  cityChipText: { fontSize: 13, fontWeight: '500' },
  
  // Request section
  requestSection: { paddingVertical: 24, alignItems: 'center' },
  requestText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
