import { API_BASE_URL, API_ENDPOINTS, TIMEOUTS } from '../constants/api';
import { PrayerTimes, QiblaDirection, City } from '../types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: TIMEOUTS.DEFAULT,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Prayer times and location APIs
  async fetchCities(): Promise<{ cities: City[] }> {
    return this.request<{ cities: City[] }>(API_ENDPOINTS.CITIES);
  }

  async fetchPrayerTimes(city: string, district?: string): Promise<PrayerTimes> {
    const params = new URLSearchParams({ city });
    if (district) {
      params.append('district', district);
    }
    
    return this.request<PrayerTimes>(
      `${API_ENDPOINTS.PRAYER_TIMES}?${params.toString()}`
    );
  }

  async fetchQiblaDirection(latitude: number, longitude: number): Promise<QiblaDirection> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
    
    return this.request<QiblaDirection>(
      `${API_ENDPOINTS.QIBLA_DIRECTION}?${params.toString()}`
    );
  }

  // Search APIs
  async searchAll(query: string, authors?: string[]): Promise<any> {
    const params = new URLSearchParams({ q: query });
    if (authors && authors.length > 0) {
      authors.forEach(author => params.append('authors', author));
    }
    
    return this.request<any>(
      `${API_ENDPOINTS.SEARCH_ALL}?${params.toString()}`
    );
  }

  async searchVideos(query: string): Promise<any> {
    const params = new URLSearchParams({ q: query });
    return this.request<any>(
      `${API_ENDPOINTS.SEARCH_VIDEOS}?${params.toString()}`
    );
  }

  async searchAudio(query: string): Promise<any> {
    const params = new URLSearchParams({ q: query });
    return this.request<any>(
      `${API_ENDPOINTS.SEARCH_AUDIO}?${params.toString()}`
    );
  }

  // Content APIs
  async getArticlesByCategory(): Promise<any> {
    return this.request<any>(API_ENDPOINTS.ARTICLES_BY_CATEGORY);
  }

  async getArticlesPaginated(
    page: number = 1,
    limit: number = 12,
    search: string = '',
    category: string = ''
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      category,
    });
    
    return this.request<any>(
      `${API_ENDPOINTS.ARTICLES_PAGINATED}?${params.toString()}`
    );
  }

  async getArticleById(id: number): Promise<any> {
    return this.request<any>(`${API_ENDPOINTS.ARTICLE_BY_ID}/${id}`);
  }

  async getBooksByAuthor(): Promise<any> {
    return this.request<any>(API_ENDPOINTS.BOOKS_BY_AUTHOR);
  }

  // Video analysis APIs
  async startVideoAnalysis(url: string): Promise<any> {
    const params = new URLSearchParams({ url });
    return this.request<any>(
      `${API_ENDPOINTS.ANALYZE_START}?${params.toString()}`,
      { method: 'POST' }
    );
  }

  async getAnalysisStatus(taskId: string): Promise<any> {
    return this.request<any>(`${API_ENDPOINTS.ANALYZE_STATUS}/${taskId}`);
  }

  async getAnalysisHistory(): Promise<any> {
    return this.request<any>(API_ENDPOINTS.ANALYSIS_HISTORY);
  }

  // Audio APIs
  async getAllAudio(): Promise<any> {
    return this.request<any>(API_ENDPOINTS.AUDIO_ALL);
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export individual functions for easier use
export const fetchCities = () => apiService.fetchCities();
export const fetchPrayerTimes = (city: string, district?: string) => 
  apiService.fetchPrayerTimes(city, district);
export const fetchQiblaDirection = (latitude: number, longitude: number) => 
  apiService.fetchQiblaDirection(latitude, longitude);
export const searchAll = (query: string, authors?: string[]) => 
  apiService.searchAll(query, authors);
export const searchVideos = (query: string) => apiService.searchVideos(query);
export const searchAudio = (query: string) => apiService.searchAudio(query);

export default apiService;
