import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { type Song } from '@shared/schema';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { usePremium } from '@/hooks/use-premium';

export interface SongAccessResult {
  canAccess: boolean;
  reason: 'authenticated' | 'not_authenticated' | 'not_active' | 'free_song' | 'premium_required';
  requiresAuth: boolean;
  requiresActivation: boolean;
  requiresPremium: boolean;
}

export function useSongAccess() {
  const { user, databaseUser } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [checkingActive, setCheckingActive] = useState(false);
  const { isEnabled: inviteCodesEnabled } = useFeatureFlag('ENABLE_INVITE_CODES');
  const { canAccessPremiumContent } = usePremium();

  // Check activation status when user changes - only if invite codes are enabled
  useEffect(() => {
    const checkActiveStatus = async () => {
      if (!user) {
        setIsActive(null);
        return;
      }

      // If invite codes are disabled, all users are considered active
      if (!inviteCodesEnabled) {
        setIsActive(true);
        setCheckingActive(false);
        return;
      }

      // If we have database user data, use it
      if (databaseUser) {
        setIsActive(databaseUser.isActive);
        return;
      }

      setCheckingActive(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setIsActive(false);
          setCheckingActive(false);
          return;
        }

        const response = await fetch('/api/auth/isActive', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsActive(data.isActive);
        } else {
          setIsActive(false);
        }
      } catch (error) {
        console.error('Error checking user active status:', error);
        setIsActive(false);
      }
      setCheckingActive(false);
    };

    checkActiveStatus();
  }, [user, databaseUser, inviteCodesEnabled]);

  const checkSongAccess = useCallback((song: Song): SongAccessResult => {
    // Free songs are always accessible
    if (song.isFree) {
      return {
        canAccess: true,
        reason: 'free_song',
        requiresAuth: false,
        requiresActivation: false,
        requiresPremium: false,
      };
    }

    // Premium songs require authentication
    if (!user) {
      return {
        canAccess: false,
        reason: 'not_authenticated',
        requiresAuth: true,
        requiresActivation: false,
        requiresPremium: false,
      };
    }

    // Premium songs require activation (if invite codes are enabled)
    if (isActive === false) {
      return {
        canAccess: false,
        reason: 'not_active',
        requiresAuth: false,
        requiresActivation: true,
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

    // User is authenticated, active, and has premium access
    if (isActive === true) {
      return {
        canAccess: true,
        reason: 'authenticated',
        requiresAuth: false,
        requiresActivation: false,
        requiresPremium: false,
      };
    }

    // Still checking activation status
    return {
      canAccess: false,
      reason: 'not_active',
      requiresAuth: false,
      requiresActivation: true,
      requiresPremium: false,
    };
  }, [user, isActive, canAccessPremiumContent]); // Memoize based on user, isActive state, and premium access

  return {
    checkSongAccess,
    isActive,
    checkingActive,
  };
}