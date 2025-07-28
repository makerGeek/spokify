import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

interface SongsResponse {
  songs: Song[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

interface UseSongsInfiniteOptions {
  genre?: string;
  language?: string;
  difficulty?: string;
  limit?: number;
}

export function useSongsInfinite({
  genre,
  language,
  difficulty,
  limit = 15
}: UseSongsInfiniteOptions = {}) {
  return useInfiniteQuery<SongsResponse | Song[]>({
    queryKey: ["/api/songs", "infinite", genre, language, difficulty, limit],
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) || 1;
      const params = new URLSearchParams();
      
      if (genre && genre !== "all") {
        params.append("genre", genre);
      }
      if (language) {
        params.append("language", language);
      }
      if (difficulty) {
        params.append("difficulty", difficulty);
      }
      
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      return api.get(`/songs?${params}`);
    },
    getNextPageParam: (lastPage, allPages) => {
      // Handle both old format (array) and new format (object)
      if (Array.isArray(lastPage)) {
        // Old format: if we got fewer songs than requested, no more pages
        const currentPage = allPages.length;
        return lastPage.length === limit ? currentPage + 1 : undefined;
      } else {
        // New format: use hasMore property
        return lastPage.hasMore ? lastPage.page + 1 : undefined;
      }
    },
    initialPageParam: 1,
  });
}