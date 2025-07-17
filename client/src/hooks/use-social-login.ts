import { useMemo } from 'react'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

/**
 * Hook to determine if social login buttons should be shown
 * Returns false during loading to prevent flash of content
 */
export function useSocialLogin() {
  const { isEnabled, isLoading } = useFeatureFlag('ENABLE_SOCIAL_LOGIN')
  
  // Use useMemo to ensure proper reactivity
  const showSocialLoginButtons = useMemo(() => {
    return !isLoading && isEnabled
  }, [isLoading, isEnabled])
  
  return {
    showSocialLoginButtons,
    isLoading
  }
}