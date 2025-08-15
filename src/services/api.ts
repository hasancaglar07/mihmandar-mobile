import { API_BASE_URL, API_ENDPOINTS, TIMEOUTS } from '../constants/api';
import { PrayerTimes, QiblaDirection, City } from '../types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 3
  ): Promise<T> {
    // Farklı base URL'leri dene
    const baseUrls = [
      this.baseURL,
      'https://new-production-1016.up.railway.app',
      'https://mihmandar.org/api'
    ];
    
    for (const baseUrl of baseUrls) {
      const url = `${baseUrl}${endpoint}`;
      
      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`🌐 API: ${endpoint} - ${baseUrl} - Deneme ${attempt}/${retryCount}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const config: RequestInit = {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Mihmandar-Mobile/1.0',
              ...options.headers,
            },
            signal: controller.signal,
            ...options,
          };

          const response = await fetch(url, config);
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`✅ API: ${endpoint} - Başarılı (${baseUrl})`);
          return data;
          
        } catch (error) {
          console.error(`❌ API: ${endpoint} - ${baseUrl} - Deneme ${attempt} başarısız:`, error.message);
          
          if (attempt < retryCount) {
            // Bir sonraki deneme için bekle
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
            console.log(`⏳ API: ${delay}ms bekleyip tekrar denenecek...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
    
    // Tüm URL'ler başarısız, fallback'leri kontrol et
    console.log(`🔄 API: ${endpoint} - Tüm URL'ler başarısız, fallback kontrol ediliyor...`);
    
    // Şehirler için fallback
    if (endpoint === API_ENDPOINTS.CITIES) {
      console.log('🏙️ API: Şehirler için fallback kullanılıyor');
      return {
        cities: [
          { name: 'İstanbul', districts: ['Fatih', 'Beyoğlu', 'Kadıköy', 'Üsküdar', 'Beşiktaş'] },
          { name: 'Ankara', districts: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan'] },
          { name: 'İzmir', districts: ['Konak', 'Bornova', 'Karşıyaka', 'Bayraklı', 'Gaziemir'] },
          { name: 'Bursa', districts: ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'Gemlik'] },
          { name: 'Antalya', districts: ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Aksu', 'Döşemealtı'] },
          { name: 'Adana', districts: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Karaisalı'] },
          { name: 'Konya', districts: ['Meram', 'Karatay', 'Selçuklu', 'Ereğli', 'Akşehir'] },
          { name: 'Gaziantep', districts: ['Şahinbey', 'Şehitkamil', 'Oğuzeli', 'Nizip', 'Araban'] },
          { name: 'Kayseri', districts: ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı'] },
          { name: 'Mersin', districts: ['Akdeniz', 'Yenişehir', 'Toroslar', 'Mezitli', 'Tarsus'] }
        ]
      } as T;
    }
    
    throw new Error(`API request failed for all URLs: ${endpoint}`);
  }

  // Prayer times and location APIs
  async fetchCities(): Promise<{ cities: City[] }> {
    return this.request<{ cities: City[] }>(API_ENDPOINTS.CITIES);
  }

  async fetchPrayerTimes(city: string, district?: string): Promise<PrayerTimes> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🕌 Namaz vakitleri çekiliyor (deneme ${attempt}/${maxRetries}):`, city, district);
        return await this.fetchPrayerTimesFromVakit(city, district);
      } catch (error) {
        console.error(`❌ Namaz vakitleri deneme ${attempt} başarısız:`, error.message);
        
        if (attempt === maxRetries) {
          // Son deneme başarısız, fallback kullan
          console.log('🔄 Namaz vakitleri fallback kullanılıyor...');
          
          const today = new Date().toISOString().split('T')[0];
          const fallbackTimes = {
            imsak: '05:30',
            gunes: '07:00',
            ogle: '13:00',
            ikindi: '16:30',
            aksam: '19:00',
            yatsi: '20:30'
          };
          
          return {
            date: today,
            city: city || 'Varsayılan Şehir',
            district: district || '',
            times: fallbackTimes,
            next_prayer: this.calculateNextPrayer(fallbackTimes),
          };
        }
        
        // Bir sonraki deneme için bekle
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`⏳ ${delay}ms bekleyip tekrar denenecek...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Prayer times failed unexpectedly');
  }

  async fetchPrayerTimesFromVakit(city: string, district?: string): Promise<PrayerTimes> {
    try {
      // Search for place
      const searchUrl = `https://vakit.vercel.app/api/searchPlaces?q=${encodeURIComponent(district || city)}&lang=tr`;
      const searchResponse = await fetch(searchUrl);
      const places = await searchResponse.json();
      
      if (!places || places.length === 0) {
        throw new Error('Yer bulunamadı');
      }
      
      const place = places[0];
      const tzOffset = -new Date().getTimezoneOffset();
      
      // Get times for place
      const timesUrl = `https://vakit.vercel.app/api/timesForPlace?id=${place.id}&timezoneOffset=${tzOffset}&lang=tr`;
      const timesResponse = await fetch(timesUrl);
      const vakitData = await timesResponse.json();
      
      // Parse vakit.vercel.app format
      const times = this.parseVakitTimes(vakitData);
      
      return {
        date: new Date().toISOString().split('T')[0],
        city: place.stateName || city,
        district: place.name || district || '',
        times,
        next_prayer: this.calculateNextPrayer(times),
      };
    } catch (error) {
      console.error('Vakit API error:', error);
      throw error;
    }
  }

  private parseVakitTimes(vakitData: any): PrayerTimes['times'] {
    // Structure: { times: { 'YYYY-MM-DD': [fajr,sunrise,dhuhr,asr,maghrib,isha] } }
    if (vakitData?.times && typeof vakitData.times === 'object') {
      const dates = Object.keys(vakitData.times);
      if (dates.length > 0) {
        const arr = vakitData.times[dates[0]];
        if (Array.isArray(arr) && arr.length >= 6) {
          const clean = (t: string) => t ? String(t).split(' ')[0] : '';
          return {
            imsak: clean(arr[0]),
            gunes: clean(arr[1]),
            ogle: clean(arr[2]),
            ikindi: clean(arr[3]),
            aksam: clean(arr[4]),
            yatsi: clean(arr[5]),
          };
        }
      }
    }
    
    // Fallback format
    const first = vakitData?.times?.[0] || vakitData?.data || {};
    return {
      imsak: first.fajr || first.imsak || '',
      gunes: first.sunrise || first.gunes || '',
      ogle: first.dhuhr || first.ogle || '',
      ikindi: first.asr || first.ikindi || '',
      aksam: first.maghrib || first.aksam || '',
      yatsi: first.isha || first.yatsi || '',
    };
  }

  private calculateNextPrayer(times: PrayerTimes['times']): PrayerTimes['next_prayer'] {
    const now = new Date();
    const prayers = [
      { name: 'İmsak', time: times.imsak },
      { name: 'Güneş', time: times.gunes },
      { name: 'Öğle', time: times.ogle },
      { name: 'İkindi', time: times.ikindi },
      { name: 'Akşam', time: times.aksam },
      { name: 'Yatsı', time: times.yatsi },
    ];
    
    for (const prayer of prayers) {
      if (!prayer.time || prayer.time === '' || prayer.time === 'undefined') continue;
      
      const timeParts = prayer.time.split(':');
      if (timeParts.length !== 2) continue;
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) continue;
      
      const prayerDate = new Date();
      prayerDate.setHours(hours, minutes, 0, 0);
      
      if (prayerDate > now) {
        const remaining = Math.floor((prayerDate.getTime() - now.getTime()) / 60000);
        return {
          name: prayer.name,
          time: prayer.time,
          remaining_minutes: remaining,
        };
      }
    }
    
    // Tomorrow's first prayer
    const firstPrayer = prayers.find(p => p.time && p.time !== '' && p.time !== 'undefined');
    if (firstPrayer) {
      const timeParts = firstPrayer.time.split(':');
      if (timeParts.length === 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (!isNaN(hours) && !isNaN(minutes)) {
          const tomorrowPrayer = new Date();
          tomorrowPrayer.setDate(tomorrowPrayer.getDate() + 1);
          tomorrowPrayer.setHours(hours, minutes, 0, 0);
          
          const remaining = Math.floor((tomorrowPrayer.getTime() - now.getTime()) / 60000);
          return {
            name: firstPrayer.name,
            time: firstPrayer.time,
            remaining_minutes: remaining,
          };
        }
      }
    }
    
    // Fallback
    return {
      name: 'Öğle',
      time: '13:00',
      remaining_minutes: 0,
    };
  }

  async fetchPrayerTimesByGPS(latitude: number, longitude: number): Promise<PrayerTimes> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌍 GPS API çağrısı (deneme ${attempt}/${maxRetries}):`, { latitude, longitude });
        
        const tzOffset = -new Date().getTimezoneOffset();
        const today = new Date().toISOString().split('T')[0];
        
        // Ana API URL'i
        const url = `https://vakit.vercel.app/api/timesForGPS?lat=${latitude}&lng=${longitude}&date=${today}&days=1&timezoneOffset=${tzOffset}&calculationMethod=Turkey&lang=tr`;
        console.log('🔗 API URL:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mihmandar-Mobile/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('📡 API yanıtı alındı:', response.status, response.statusText);
        
        const vakitData = await response.json();
        console.log('📊 Ham API verisi:', vakitData);
        
        const times = this.parseVakitTimes(vakitData);
        console.log('⏰ Parse edilmiş namaz vakitleri:', times);
        
        // Namaz vakitlerinin geçerli olup olmadığını kontrol et
        if (!times.imsak || !times.gunes || !times.ogle || !times.ikindi || !times.aksam || !times.yatsi) {
          throw new Error('Geçersiz namaz vakitleri verisi');
        }
        
        // Konum adını al (opsiyonel)
        let locationName = '';
        try {
          const placeUrl = `https://vakit.vercel.app/api/place?lat=${latitude}&lng=${longitude}&lang=tr`;
          console.log('📍 Konum adı API URL:', placeUrl);
          
          const placeController = new AbortController();
          const placeTimeoutId = setTimeout(() => placeController.abort(), 5000);
          
          const placeResponse = await fetch(placeUrl, {
            signal: placeController.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mihmandar-Mobile/1.0'
            }
          });
          
          clearTimeout(placeTimeoutId);
          
          if (placeResponse.ok) {
            const place = await placeResponse.json();
            locationName = place?.name || place?.city || place?.province || '';
            console.log('🏙️ Konum adı alındı:', locationName);
          }
        } catch (placeError) {
          console.warn('⚠️ Konum adı alınamadı:', placeError.message);
          // Konum adı alınamazsa devam et
        }
        
        const result = {
          date: today,
          city: locationName || 'GPS Konumu',
          district: '',
          times,
          next_prayer: this.calculateNextPrayer(times),
        };
        
        console.log('✅ Final GPS namaz vakitleri:', result);
        return result;
        
      } catch (error) {
        console.error(`❌ GPS API deneme ${attempt} başarısız:`, error.message);
        
        if (attempt === maxRetries) {
          // Son deneme başarısız, fallback kullan
          console.log('🔄 GPS API fallback kullanılıyor...');
          
          const today = new Date().toISOString().split('T')[0];
          const fallbackTimes = {
            imsak: '05:30',
            gunes: '07:00',
            ogle: '13:00',
            ikindi: '16:30',
            aksam: '19:00',
            yatsi: '20:30'
          };
          
          const fallbackResult = {
            date: today,
            city: 'Varsayılan Konum',
            district: '',
            times: fallbackTimes,
            next_prayer: this.calculateNextPrayer(fallbackTimes),
          };
          
          console.log('⚠️ Fallback namaz vakitleri kullanılıyor:', fallbackResult);
          return fallbackResult;
        }
        
        // Bir sonraki deneme için bekle
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`⏳ ${delay}ms bekleyip tekrar denenecek...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('GPS prayer times failed unexpectedly');
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
