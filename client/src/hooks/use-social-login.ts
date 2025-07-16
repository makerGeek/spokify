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
    const result = !isLoading && isEnabled
    console.log('useSocialLogin computed:', { isEnabled, isLoading, result })
    return result
  }, [isLoading, isEnabled])
  
  return {
    showSocialLoginButtons,
    isLoading
  }
}