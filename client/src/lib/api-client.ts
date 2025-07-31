import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { getAuthToken } from '@/lib/auth';

// Create the main API client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For CORS with credentials
});

// Request interceptor to add auth token with refresh
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Use the enhanced getAuthToken function that handles refresh
      const token = await getAuthToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we get 401 and haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('Got 401, attempting token refresh and retry:', error.config?.url);
      
      try {
        // Force refresh session
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && session?.access_token) {
          // Update the authorization header and retry
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return apiClient(originalRequest);
        } else {
          // Refresh failed, sign out user
          console.error('Token refresh failed:', refreshError);
          await supabase.auth.signOut();
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        await supabase.auth.signOut();
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper functions for common operations
export const api = {
  // Generic methods
  get: <T = any>(url: string, config?: any) => 
    apiClient.get<T>(url, config).then(res => res.data),
    
  post: <T = any>(url: string, data?: any, config?: any) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
    
  put: <T = any>(url: string, data?: any, config?: any) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
    
  delete: <T = any>(url: string, config?: any) => 
    apiClient.delete<T>(url, config).then(res => res.data),
    
  patch: <T = any>(url: string, data?: any, config?: any) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),

  // Specific API methods
  auth: {
    getUser: () => api.get('/auth/user'),
    syncUser: (userData: any) => api.post('/auth/sync', userData),
    validateInvite: (code: string) => api.post('/auth/validate-invite', { code }),
    generateInvite: (userId: number, maxUses: number, expiresAt?: string) => 
      api.post('/invite-codes/generate', { userId, maxUses, expiresAt }),
  },

  users: {
    getVocabulary: (userId: number) => api.get(`/users/${userId}/vocabulary`),
    getDueVocabulary: (userId: number) => api.get(`/users/${userId}/vocabulary/due`),
    getVocabularyStats: (userId: number) => api.get(`/users/${userId}/vocabulary/stats`),
    getProgress: (userId: number) => api.get(`/users/${userId}/progress`),
    getInviteCodes: (userId: number) => api.get(`/users/${userId}/invite-codes`),
    getBookmarks: (userId: number) => api.get(`/users/${userId}/bookmarks`),
  },

  songs: {
    getAll: () => api.get('/songs'),
    getById: (id: number) => api.get(`/songs/${id}`),
    getBookmarkStatus: (songId: number) => api.get(`/songs/${songId}/bookmark`),
  },

  vocabulary: {
    save: (vocabulary: any) => api.post('/vocabulary', vocabulary),
    submitReview: (vocabularyId: number, answer: string) => 
      api.post(`/vocabulary/${vocabularyId}/review`, { answer }),
    delete: (vocabularyId: number) => api.delete(`/vocabulary/${vocabularyId}`),
  },

  bookmarks: {
    create: (userId: number, songId: number) => api.post('/bookmarks', { userId, songId }),
    delete: (userId: number, songId: number) => api.delete(`/bookmarks/${userId}/${songId}`),
  },

  featureFlags: {
    getAll: () => api.get('/feature-flags'),
    getActive: (): Promise<string[]> => api.get<string[]>('/flags'),
  },

  translate: (text: string, targetLanguage: string, fromLanguage: string = "es", songId?: number) => 
    api.post('/translate', { text, fromLanguage, toLanguage: targetLanguage, songId }),
};

export default apiClient;