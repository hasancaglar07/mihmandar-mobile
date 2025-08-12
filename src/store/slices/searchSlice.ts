import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SearchResult } from '../../types';
import { searchAll } from '../../services/api';

interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  activeTab: 'all' | 'books' | 'articles' | 'videos';
  recentSearches: string[];
}

const initialState: SearchState = {
  query: '',
  results: [],
  loading: false,
  error: null,
  activeTab: 'all',
  recentSearches: [],
};

// Async thunk for performing search
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async ({ query, authors }: { query: string; authors?: string[] }) => {
    const response = await searchAll(query, authors);
    return response.sonuclar.map((result: any): SearchResult => ({
      type: result.type,
      id: result.id || result.pdf_dosyasi || result.video_id,
      title: result.baslik || result.kitap || result.title,
      author: result.yazar || result.author,
      excerpt: result.alinti || result.excerpt,
      url: result.url,
    }));
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<'all' | 'books' | 'articles' | 'videos'>) => {
      state.activeTab = action.payload;
    },
    clearResults: (state) => {
      state.results = [];
      state.query = '';
      state.error = null;
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload.trim();
      if (query && !state.recentSearches.includes(query)) {
        state.recentSearches.unshift(query);
        // Keep only last 10 searches
        state.recentSearches = state.recentSearches.slice(0, 10);
      }
    },
    removeRecentSearch: (state, action: PayloadAction<string>) => {
      state.recentSearches = state.recentSearches.filter(
        search => search !== action.payload
      );
    },
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(performSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Search failed';
      });
  },
});

export const {
  setQuery,
  setActiveTab,
  clearResults,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = searchSlice.actions;

export default searchSlice.reducer;
