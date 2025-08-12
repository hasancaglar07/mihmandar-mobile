import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '../store';
import { 
  performSearch, 
  setQuery, 
  setActiveTab, 
  addRecentSearch,
  removeRecentSearch,
  clearResults 
} from '../store/slices/searchSlice';
import { RootStackParamList, SearchResult } from '../types';
import { Colors } from '../constants/colors';
import { WEB_BASE_URL, WEB_ROUTES } from '../constants/api';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const tabs = [
  { key: 'all', title: 'Tümü', icon: 'search' },
  { key: 'books', title: 'Kitaplar', icon: 'book' },
  { key: 'articles', title: 'Makaleler', icon: 'article' },
  { key: 'videos', title: 'Videolar', icon: 'play-circle-filled' },
];

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { query, results, loading, error, activeTab, recentSearches } = useAppSelector(state => state.search);
  
  const [searchInput, setSearchInput] = useState(query);
  const [showRecentSearches, setShowRecentSearches] = useState(true);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || searchInput.trim();
    
    if (finalQuery.length < 2) {
      return;
    }

    dispatch(setQuery(finalQuery));
    dispatch(addRecentSearch(finalQuery));
    dispatch(performSearch({ query: finalQuery }));
    setShowRecentSearches(false);
  };

  const handleTabPress = (tabKey: string) => {
    dispatch(setActiveTab(tabKey as any));
  };

  const handleRecentSearchPress = (searchQuery: string) => {
    setSearchInput(searchQuery);
    handleSearch(searchQuery);
  };

  const handleRemoveRecentSearch = (searchQuery: string) => {
    dispatch(removeRecentSearch(searchQuery));
  };

  const handleResultPress = (result: SearchResult) => {
    let webUrl = '';
    
    switch (result.type) {
      case 'book':
        webUrl = `${WEB_BASE_URL}${WEB_ROUTES.BOOKS}?book=${encodeURIComponent(result.title)}`;
        break;
      case 'article':
        webUrl = `${WEB_BASE_URL}${WEB_ROUTES.ARTICLES}/${result.id}`;
        break;
      case 'video':
        webUrl = `${WEB_BASE_URL}${WEB_ROUTES.VIDEO_ANALYSIS}?video=${result.id}`;
        break;
      default:
        webUrl = `${WEB_BASE_URL}${WEB_ROUTES.HOME}`;
    }

    navigation.navigate('WebContent', {
      url: webUrl,
      title: result.title,
    });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    dispatch(clearResults());
    setShowRecentSearches(true);
  };

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return results;
    }
    
    const typeMap: { [key: string]: string } = {
      books: 'book',
      articles: 'article',
      videos: 'video',
    };
    
    return results.filter(result => result.type === typeMap[activeTab]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'book':
        return 'book';
      case 'article':
        return 'article';
      case 'video':
        return 'play-circle-filled';
      default:
        return 'description';
    }
  };

  const getResultTypeText = (type: string) => {
    switch (type) {
      case 'book':
        return 'Kitap';
      case 'article':
        return 'Makale';
      case 'video':
        return 'Video';
      default:
        return 'İçerik';
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultIcon}>
        <Icon name={getResultIcon(item.type)} size={20} color={Colors.primary} />
      </View>
      
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.resultType}>
            {getResultTypeText(item.type)}
          </Text>
        </View>
        
        {item.author && (
          <Text style={styles.resultAuthor}>
            {item.author}
          </Text>
        )}
        
        {item.excerpt && (
          <Text style={styles.resultExcerpt} numberOfLines={3}>
            {item.excerpt}
          </Text>
        )}
      </View>
      
      <Icon name="chevron-right" size={20} color={Colors.darkGray} />
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <View style={styles.recentSearchItem}>
      <TouchableOpacity
        style={styles.recentSearchContent}
        onPress={() => handleRecentSearchPress(item)}
      >
        <Icon name="history" size={16} color={Colors.darkGray} />
        <Text style={styles.recentSearchText}>{item}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeRecentButton}
        onPress={() => handleRemoveRecentSearch(item)}
      >
        <Icon name="close" size={16} color={Colors.darkGray} />
      </TouchableOpacity>
    </View>
  );

  const filteredResults = getFilteredResults();

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { paddingTop: insets.top }]}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={Colors.darkGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kitap, makale veya video ara..."
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            placeholderTextColor={Colors.darkGray}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Icon name="clear" size={20} color={Colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearch()}
          disabled={searchInput.trim().length < 2}
        >
          <Text style={[
            styles.searchButtonText,
            searchInput.trim().length < 2 && styles.searchButtonTextDisabled
          ]}>
            Ara
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {!showRecentSearches && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => handleTabPress(tab.key)}
            >
              <Icon
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
              {activeTab === tab.key && (
                <View style={styles.resultCount}>
                  <Text style={styles.resultCountText}>
                    {filteredResults.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Aranıyor...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Icon name="error-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleSearch()}
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : showRecentSearches ? (
          <View style={styles.recentSearchesContainer}>
            <Text style={styles.recentSearchesTitle}>Son Aramalar</Text>
            {recentSearches.length > 0 ? (
              <FlatList
                data={recentSearches}
                keyExtractor={(item, index) => `recent-${index}`}
                renderItem={renderRecentSearch}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="search" size={48} color={Colors.lightGray} />
                <Text style={styles.emptyStateText}>
                  Henüz arama yapmadınız
                </Text>
              </View>
            )}
          </View>
        ) : filteredResults.length > 0 ? (
          <FlatList
            data={filteredResults}
            keyExtractor={(item, index) => `result-${index}`}
            renderItem={renderSearchResult}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.centerContent}>
            <Icon name="search-off" size={48} color={Colors.lightGray} />
            <Text style={styles.noResultsText}>
              "{query}" için sonuç bulunamadı
            </Text>
            <Text style={styles.noResultsSubtext}>
              Farklı anahtar kelimeler deneyin
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    color: Colors.text,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  searchButtonTextDisabled: {
    opacity: 0.5,
  },
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    minHeight: 36,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.white,
  },
  resultCount: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.darkGray,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'center',
    marginTop: 8,
  },
  recentSearchesContainer: {
    flex: 1,
  },
  recentSearchesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recentSearchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recentSearchText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  removeRecentButton: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.darkGray,
    marginTop: 12,
  },
  resultItem: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  resultType: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.secondary,
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultAuthor: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 6,
  },
  resultExcerpt: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  separator: {
    height: 12,
  },
});

export default SearchScreen;
