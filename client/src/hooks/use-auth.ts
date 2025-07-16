import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, generateInviteCode, getUserInviteCodes, updateProfile } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get user's invite codes
 */
export function useUserInviteCodes() {
  return useQuery({
    queryKey: ['/api/auth/invite-codes'],
    queryFn: getUserInviteCodes,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to generate new invite code
 */
export function useGenerateInviteCode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: generateInviteCode,
    onSuccess: (newCode) => {
      // Invalidate and refetch invite codes
      queryClient.invalidateQueries({ queryKey: ['/api/auth/invite-codes'] });
      
      toast({
        title: 'Invite code generated!',
        description: `Your new invite code: ${newCode.code}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate invite code',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: 'Profile updated!',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update profile',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });
}