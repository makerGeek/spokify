import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { type Song } from '@shared/schema';

import { usePremium } from '@/hooks/use-premium';

export interface SongAccessResult {
  canAccess: boolean;
  reason: 'authenticated' | 'not_authenticated' | 'not_active' | 'free_song' | 'premium_required';
  requiresAuth: boolean;
  requiresActivation: boolean;
  requiresPremium: boolean;
}

export function useSongAccess() {
  const { user } = useAuth();
  const { canAccessPremiumContent } = usePremium();

  const checkSongAccess = useCallback((song: Song): SongAccessResult => {
    // All songs require authentication first
    if (!user) {
      return {
        canAccess: false,
        reason: 'not_authenticated',
        requiresAuth: true,
        requiresActivation: false,
        requiresPremium: false,
      };
    }

    // Free songs are accessible once authenticated
    if (song.isFree) {
      return {
        canAccess: true,
        reason: 'free_song',
        requiresAuth: false,
        requiresActivation: false,
        requiresPremium: false,
      };
    }

    // Premium songs require premium subscription
    if (!canAccessPremiumContent) {
      return {
        canAccess: false,
        reason: 'premium_required',
        requiresAuth: false,
        requiresActivation: false,
        requiresPremium: true,
      };
    }

    // User is authenticated and has premium access
    return {
      canAccess: true,
      reason: 'authenticated',
      requiresAuth: false,
      requiresActivation: false,
      requiresPremium: false,
    };
  }, [user, canAccessPremiumContent]);

  return {
    checkSongAccess,
    isActive: true, // All users are now active
    checkingActive: false,
  };
}