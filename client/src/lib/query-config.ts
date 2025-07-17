import type { UseQueryOptions } from '@tanstack/react-query'

/**
 * Query configuration presets for different data types
 * Based on data sensitivity and update frequency
 */

// Real-time data that must always be fresh (never cached)
export const REAL_TIME_CONFIG: Partial<UseQueryOptions> = {
  staleTime: 0,
  cacheTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  networkMode: 'online',
}

// User-specific data that should be fresh but can have short cache
export const USER_DATA_CONFIG: Partial<UseQueryOptions> = {
  staleTime: 30 * 1000, // 30 seconds
  cacheTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: true,
  refetchOnWindowFocus: true,
}

// Static content that rarely changes (can be cached longer)
export const STATIC_CONTENT_CONFIG: Partial<UseQueryOptions> = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
}

/**
 * Data categorization:
 * 
 * REAL_TIME_CONFIG - Never cache, always fetch fresh:
 * - Feature flags (admin toggles that affect UI behavior)
 * - User authentication status 
 * - Real-time user progress/scores
 * - System status/health checks
 * - Admin settings and configurations
 * 
 * USER_DATA_CONFIG - Short cache, frequent refresh:
 * - User profile data
 * - User vocabulary lists
 * - User learning history
 * - Personal preferences/settings
 * - Recent activity feeds
 * 
 * STATIC_CONTENT_CONFIG - Long cache, infrequent refresh:
 * - Song catalog/library
 * - Song lyrics and metadata
 * - Static translations
 * - Genre/category lists
 * - App version info
 */