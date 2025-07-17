import { ReactNode, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import LoginForm from '@/components/login-form'

interface AuthModalProps {
  children: ReactNode
  onClose?: () => void
}

export function AuthModal({ children, onClose }: AuthModalProps) {
  const { user, loading } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

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

  // If not authenticated, show blurred background with compact modal
  return (
    <div className="relative">
      {/* Blurred background content */}
      <div 
        className={`transition-all duration-500 ${isVisible ? 'filter blur-sm brightness-50' : ''} pointer-events-none select-none`}
      >
        {children}
      </div>
      
      {/* Compact Modal Overlay */}
      <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
          isVisible ? 'bg-black/60 backdrop-blur-sm opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={handleOverlayClick}
      >
        <div 
          className={`spotify-card-glass border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 transition-all duration-500 transform relative ${
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
          }`}
          style={{
            background: 'rgba(24, 24, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-spotify-muted hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          )}
          
          {/* Compact header */}
          <div className="text-center mb-6 pr-8">
            <h2 className="spotify-heading-sm text-white mb-2">
              Sign in to save words
            </h2>
            <p className="spotify-text-muted text-sm">
              Create an account to build your vocabulary
            </p>
          </div>
          
          {/* Compact login form */}
          <div className="space-y-4">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}