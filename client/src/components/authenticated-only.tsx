import { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import LoginForm from '@/components/login-form'

interface AuthenticatedOnlyProps {
  children: ReactNode
  fallback?: ReactNode
  contextMessage?: string
}

export default function AuthenticatedOnly({ 
  children, 
  fallback,
  contextMessage
}: AuthenticatedOnlyProps) {
  const { user, loading } = useAuth()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spotify-loading w-8 h-8 mx-auto mb-4"></div>
          <p className="spotify-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if user is not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
        <LoginForm 
          contextMessage={contextMessage}
          redirectTo="/home"
        />
      </div>
    )
  }

  // Show children if user is authenticated
  return <>{children}</>
}