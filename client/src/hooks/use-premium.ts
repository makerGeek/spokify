import { useSubscription } from '@/contexts/subscription-context'

/**
 * Simple hook to access premium subscription status
 * Provides convenient access to subscription information throughout the app
 */
export function usePremium() {
  const { subscription, upgradeToPreemium, manageBilling } = useSubscription()
  
  return {
    isPremium: subscription.isPremium,
    isActive: subscription.isActive,
    canAccessPremiumContent: subscription.canAccessPremiumContent,
    status: subscription.status,
    upgradeToPreemium,
    manageBilling,
    subscription
  }
}