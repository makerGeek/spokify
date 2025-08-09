import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

export function useActivityTracking() {
  const { user } = useAuth();

  const trackActivity = useCallback(async (type: 'song' | 'vocabulary', count: number = 1) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const data = {
        date: today,
        ...(type === 'song' && { songsLearned: count }),
        ...(type === 'vocabulary' && { vocabularyReviewed: count }),
      };

      await api.activity.trackActivity(data);
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't throw error to avoid disrupting user experience
    }
  }, [user]);

  const trackSongCompletion = useCallback(() => {
    return trackActivity('song', 1);
  }, [trackActivity]);

  const trackVocabularyReview = useCallback((count: number = 1) => {
    return trackActivity('vocabulary', count);
  }, [trackActivity]);

  return {
    trackSongCompletion,
    trackVocabularyReview,
  };
}