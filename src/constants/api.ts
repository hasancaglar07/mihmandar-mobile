// API Configuration for Mihmandar Mobile App

// Base URLs
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://your-production-api.com';  // Production

export const WEB_BASE_URL = __DEV__
  ? 'http://localhost:3000'  // Development Next.js
  : 'https://mihmandar.org';  // Production

// API Endpoints
export const API_ENDPOINTS = {
  // Prayer times and location
  CITIES: '/cities',
  PRAYER_TIMES: '/prayer-times',
  QIBLA_DIRECTION: '/qibla-direction',
  
  // Search and content
  SEARCH_ALL: '/search/all',
  SEARCH_VIDEOS: '/search/videos',
  SEARCH_AUDIO: '/search/audio',
  SEARCH_ANALYSES: '/search/analyses',
  
  // Articles and books
  ARTICLES_BY_CATEGORY: '/articles/by-category',
  ARTICLES_PAGINATED: '/articles/paginated',
  ARTICLE_BY_ID: '/article',
  BOOKS_BY_AUTHOR: '/books_by_author',
  
  // Video analysis
  ANALYZE_START: '/analyze/start',
  ANALYZE_STATUS: '/analyze/status',
  ANALYSIS_HISTORY: '/analysis_history',
  
  // Audio
  AUDIO_ALL: '/audio/all',
  AUDIO_STREAM: '/audio/stream',
} as const;

// WebView URLs for content
export const WEB_ROUTES = {
  HOME: '/',
  ARTICLES: '/makaleler',
  BOOKS: '/kitaplar',
  AUDIO: '/ses-kayitlari',
  VIDEO_ANALYSIS: '/video-analizi',
  YOUTUBE_SEARCH: '/youtube-arama',
} as const;

// Request timeouts
export const TIMEOUTS = {
  DEFAULT: 10000,  // 10 seconds
  UPLOAD: 30000,   // 30 seconds
  DOWNLOAD: 60000, // 60 seconds
} as const;
