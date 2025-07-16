import { useFeatureFlag } from '@/hooks/use-feature-flags'

/**
 * Hook to determine if social login buttons should be shown
 * Returns false during loading to prevent flash of content
 */
export function useSocialLogin() {
  const { isEnabled, isLoading } = useFeatureFlag('ENABLE_SOCIAL_LOGIN')
  
  // Don't show social login buttons during loading or if flag is disabled
  const showSocialLoginButtons = !isLoading && isEnabled
  
  return {
    showSocialLoginButtons,
    isLoading
  }
}