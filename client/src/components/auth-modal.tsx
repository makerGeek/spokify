import { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog'
import LoginForm from '@/components/login-form'

interface AuthModalProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthModal({ children, fallback }: AuthModalProps) {
  const { user, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-spotify-dark">
        <div className="spotify-loading"></div>
      </div>
    )
  }

  // If user is authenticated, show children normally
  if (user) {
    return <>{children}</>
  }

  // If not authenticated, show blurred background with modal
  return (
    <div className="relative min-h-screen">
      {/* Blurred background content */}
      <div 
        className="absolute inset-0 filter blur-md pointer-events-none select-none"
        style={{ filter: 'blur(8px) brightness(0.3)' }}
      >
        {children}
      </div>
      
      {/* Modal overlay */}
      <Dialog open={true} modal>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-spotify-gray bg-spotify-card p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-spotify-text-primary">
              Sign in to continue
            </h2>
            <p className="text-sm text-spotify-text-secondary">
              You need to be signed in to access this content
            </p>
          </div>
          
          {/* Use the existing LoginForm component */}
          <LoginForm />
          
          {/* Custom fallback content if provided */}
          {fallback && (
            <div className="mt-4 pt-4 border-t border-spotify-gray">
              {fallback}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}