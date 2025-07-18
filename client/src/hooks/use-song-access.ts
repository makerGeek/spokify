import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { type Song } from '@shared/schema';

export interface SongAccessResult {
  canAccess: boolean;
  reason: 'authenticated' | 'not_authenticated' | 'not_active' | 'free_song';
  requiresAuth: boolean;
  requiresActivation: boolean;
}

export function useSongAccess() {
  const { user, databaseUser } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [checkingActive, setCheckingActive] = useState(false);

  // Check activation status when user changes
  useEffect(() => {
    const checkActiveStatus = async () => {
      if (!user) {
        setIsActive(null);
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
  }, [user, databaseUser]);

  const checkSongAccess = (song: Song): SongAccessResult => {
    // Free songs are always accessible
    if (song.isFree) {
      return {
        canAccess: true,
        reason: 'free_song',
        requiresAuth: false,
        requiresActivation: false,
      };
    }

    // Premium songs require authentication
    if (!user) {
      return {
        canAccess: false,
        reason: 'not_authenticated',
        requiresAuth: true,
        requiresActivation: false,
      };
    }

    // Premium songs require activation
    if (isActive === false) {
      return {
        canAccess: false,
        reason: 'not_active',
        requiresAuth: false,
        requiresActivation: true,
      };
    }

    // User is authenticated and active
    if (isActive === true) {
      return {
        canAccess: true,
        reason: 'authenticated',
        requiresAuth: false,
        requiresActivation: false,
      };
    }

    // Still checking activation status
    return {
      canAccess: false,
      reason: 'not_active',
      requiresAuth: false,
      requiresActivation: true,
    };
  };

  return {
    checkSongAccess,
    isActive,
    checkingActive,
  };
}