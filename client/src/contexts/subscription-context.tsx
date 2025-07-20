import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { api } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export interface SubscriptionInfo {
  status: 'free' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionEndsAt?: Date
  isActive: boolean
  isPremium: boolean
  canAccessPremiumContent: boolean
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo
  loading: boolean
  refreshSubscription: () => Promise<void>
  upgradeToPreemium: () => Promise<void>
  manageBilling: () => Promise<void>
  verifySubscription: () => Promise<boolean>
}

const defaultSubscription: SubscriptionInfo = {
  status: 'free',
  isActive: false,
  isPremium: false,
  canAccessPremiumContent: false
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: defaultSubscription,
  loading: true,
  refreshSubscription: async () => {},
  upgradeToPreemium: async () => {},
  manageBilling: async () => {},
  verifySubscription: async () => false
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription)
  const [loading, setLoading] = useState(true)
  const { databaseUser, session } = useAuth()
  const { toast } = useToast()

  // Helper function to calculate subscription info from database user
  const calculateSubscriptionInfo = (user: any): SubscriptionInfo => {
    if (!user) return defaultSubscription

    const status = user.subscriptionStatus || 'free'
    const isActive = status === 'active'
    const isPremium = isActive
    const canAccessPremiumContent = isPremium

    return {
      status,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionEndsAt: user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : undefined,
      isActive,
      isPremium,
      canAccessPremiumContent
    }
  }

  // Update subscription info when database user changes - optimize to prevent unnecessary updates
  useEffect(() => {
    console.log('🔍 Subscription Effect: Checking subscription update', {
      hasDatabaseUser: !!databaseUser,
      userId: databaseUser?.id,
      subscriptionStatus: databaseUser?.subscriptionStatus,
      hasSession: !!session
    });
    
    if (databaseUser) {
      const newSubscription = calculateSubscriptionInfo(databaseUser)
      console.log('📊 Subscription: Calculated subscription info', newSubscription);
      
      // Only update if subscription data actually changed
      setSubscription(prevSub => {
        if (prevSub.status !== newSubscription.status || 
            prevSub.stripeCustomerId !== newSubscription.stripeCustomerId ||
            prevSub.stripeSubscriptionId !== newSubscription.stripeSubscriptionId) {
          console.log('🔄 Subscription: Updating subscription data', { 
            oldStatus: prevSub.status, 
            newStatus: newSubscription.status 
          });
          return newSubscription
        }
        console.log('✅ Subscription: No changes needed, keeping existing');
        return prevSub
      })
      setLoading(false)
    } else if (!session) {
      console.log('🚪 Subscription: User logged out, resetting to default');
      setSubscription(defaultSubscription)
      setLoading(false)
    }
  }, [databaseUser?.subscriptionStatus, databaseUser?.stripeCustomerId, databaseUser?.stripeSubscriptionId, session?.user?.id])

  const refreshSubscription = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      const response = await api.auth.getUser()
      if (response?.user) {
        const newSubscription = calculateSubscriptionInfo(response.user)
        setSubscription(newSubscription)
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
      toast({
        title: 'Failed to refresh subscription',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const verifySubscription = async (): Promise<boolean> => {
    if (!session?.user) return false

    try {
      const data = await api.post('/verify-subscription')
      
      if (data.subscriptionActive) {
        // Refresh subscription data after verification
        await refreshSubscription()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Subscription verification failed:', error)
      return false
    }
  }

  const upgradeToPreemium = async () => {
    if (!session?.user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to upgrade to premium',
        variant: 'destructive',
      })
      return
    }

    try {
      const data = await api.post('/stripe-portal', {
        customerId: subscription.stripeCustomerId,
        returnUrl: `${window.location.origin}/subscription-confirmation`
      })
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Failed to start upgrade process:', error)
      toast({
        title: 'Upgrade failed',
        description: 'Unable to start the upgrade process. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const manageBilling = async () => {
    if (!session?.user || !subscription.stripeCustomerId) {
      toast({
        title: 'No billing account found',
        description: 'Please upgrade to premium first',
        variant: 'destructive',
      })
      return
    }

    try {
      const data = await api.post('/stripe-portal', {
        customerId: subscription.stripeCustomerId,
        returnUrl: `${window.location.origin}/profile`
      })
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to create billing portal session')
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      toast({
        title: 'Billing portal unavailable',
        description: 'Unable to open billing management. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      refreshSubscription,
      upgradeToPreemium,
      manageBilling,
      verifySubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}