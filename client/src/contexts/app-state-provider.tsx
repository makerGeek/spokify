import { ReactNode } from 'react'
import { AuthProvider } from './auth-context'
import { SubscriptionProvider } from './subscription-context'

interface AppStateProviderProps {
  children: ReactNode
}

/**
 * Centralized app state provider that wraps all global state contexts
 * Provides clean separation of concerns and consistent state access patterns
 */
export function AppStateProvider({ children }: AppStateProviderProps) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </AuthProvider>
  )
}