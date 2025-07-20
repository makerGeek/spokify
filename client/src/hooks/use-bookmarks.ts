import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { type Song } from '@shared/schema';

export function useBookmarks() {
  const { databaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get user's bookmarked songs
  const { data: bookmarkedSongs = [], isLoading } = useQuery<Song[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "bookmarks"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getBookmarks(databaseUser.id);
    },
    enabled: !!databaseUser?.id,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Mutation to create a bookmark
  const createBookmarkMutation = useMutation({
    mutationFn: async ({ songId }: { songId: number }) => {
      if (!databaseUser?.id) throw new Error("User not authenticated");
      return api.bookmarks.create(databaseUser.id, songId);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch bookmarks
      queryClient.invalidateQueries({
        queryKey: ["/api/users", databaseUser?.id, "bookmarks"]
      });
      
      // Also invalidate bookmark status for the specific song
      queryClient.invalidateQueries({
        queryKey: ["/api/songs", variables.songId, "bookmark"]
      });

      toast({
        title: "Song bookmarked",
        description: "Song added to your saved songs",
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to bookmark song";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a bookmark
  const deleteBookmarkMutation = useMutation({
    mutationFn: async ({ songId }: { songId: number }) => {
      if (!databaseUser?.id) throw new Error("User not authenticated");
      return api.bookmarks.delete(databaseUser.id, songId);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch bookmarks
      queryClient.invalidateQueries({
        queryKey: ["/api/users", databaseUser?.id, "bookmarks"]
      });
      
      // Also invalidate bookmark status for the specific song
      queryClient.invalidateQueries({
        queryKey: ["/api/songs", variables.songId, "bookmark"]
      });

      toast({
        title: "Bookmark removed",
        description: "Song removed from your saved songs",
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to remove bookmark";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Helper function to check if a song is bookmarked
  const isBookmarked = useCallback((songId: number): boolean => {
    return bookmarkedSongs.some(song => song.id === songId);
  }, [bookmarkedSongs]);

  // Helper function to toggle bookmark status
  const toggleBookmark = useCallback(async (songId: number) => {
    if (!databaseUser?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to bookmark songs",
        variant: "destructive",
      });
      return;
    }

    const isCurrentlyBookmarked = isBookmarked(songId);
    
    if (isCurrentlyBookmarked) {
      deleteBookmarkMutation.mutate({ songId });
    } else {
      createBookmarkMutation.mutate({ songId });
    }
  }, [databaseUser?.id, isBookmarked, createBookmarkMutation, deleteBookmarkMutation, toast]);

  return {
    bookmarkedSongs,
    isLoading,
    isBookmarked,
    toggleBookmark,
    isToggling: createBookmarkMutation.isPending || deleteBookmarkMutation.isPending,
  };
}

// Hook for checking bookmark status of a specific song
export function useBookmarkStatus(songId: number) {
  const { databaseUser } = useAuth();

  return useQuery({
    queryKey: databaseUser?.id ? ["/api/songs", songId, "bookmark"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return { isBookmarked: false };
      return api.songs.getBookmarkStatus(songId);
    },
    enabled: !!databaseUser?.id && !!songId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
}