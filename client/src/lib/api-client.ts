import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Create the main API client
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request:', error.config?.url);
      // Could trigger logout or token refresh here if needed
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
  },

  bookmarks: {
    create: (userId: number, songId: number) => api.post('/bookmarks', { userId, songId }),
    delete: (userId: number, songId: number) => api.delete(`/bookmarks/${userId}/${songId}`),
  },

  featureFlags: {
    get: (name: string) => api.get(`/feature-flags/${name}`),
    getAll: () => api.get('/feature-flags'),
  },

  translate: (text: string, targetLanguage: string, fromLanguage: string = "es", songId?: number) => 
    api.post('/translate', { text, fromLanguage, toLanguage: targetLanguage, songId }),
};

export default apiClient;