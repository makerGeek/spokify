import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@shared/schema";
import { getAuthToken } from "@/lib/auth";

export function useUser() {
  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }
      
      const response = await apiRequest("GET", "/api/auth/user");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user');
      }
      
      return data.user;
    },
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  return {
    user,
    isLoading,
    error,
    refetch,
  };
}