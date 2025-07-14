import { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import Login from '@/pages/login'

interface AuthenticatedOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function AuthenticatedOnly({ 
  children, 
  fallback 
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

  // Show login page if user is not authenticated
  if (!user) {
    return fallback || <Login />
  }

  // Show children if user is authenticated
  return <>{children}</>
}