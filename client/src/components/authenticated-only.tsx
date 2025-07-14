import { ReactNode, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Chrome, Facebook, Eye, EyeOff } from 'lucide-react'

interface AuthenticatedOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function AuthenticatedOnly({ 
  children, 
  fallback 
}: AuthenticatedOnlyProps) {
  const { user, loading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { toast } = useToast()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.',
        })
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast({
          title: 'Account created!',
          description: 'Please check your email for verification.',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      })
    }
    setAuthLoading(false)
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      })
      setAuthLoading(false)
    }
  }

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
      <div className="min-h-screen spotify-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <h1 className="spotify-heading-xl mb-2">LyricLingo</h1>
              <p className="spotify-text-muted">Learn languages through music</p>
            </div>
            <h2 className="spotify-heading-lg mb-4">
              {isLogin ? 'Log in to continue' : 'Sign up for free'}
            </h2>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-4 mb-8">
            <button
              className="spotify-social-btn"
              onClick={() => handleSocialAuth('google')}
              disabled={authLoading}
            >
              <Chrome className="h-5 w-5" />
              Continue with Google
            </button>
            <button
              className="spotify-social-btn"
              onClick={() => handleSocialAuth('facebook')}
              disabled={authLoading}
            >
              <Facebook className="h-5 w-5" />
              Continue with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="spotify-divider">
            <span>or</span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="spotify-form-group">
              <label htmlFor="email" className="spotify-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="spotify-input"
                disabled={authLoading}
              />
            </div>
            
            <div className="spotify-form-group">
              <label htmlFor="password" className="spotify-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="spotify-input pr-12"
                  disabled={authLoading}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="spotify-btn-primary w-full"
              disabled={authLoading}
            >
              {authLoading ? (
                <div className="spotify-loading"></div>
              ) : (
                isLogin ? 'Log In' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center mt-6">
              <a href="#" className="spotify-link text-sm">
                Forgot your password?
              </a>
            </div>
          )}

          {/* Switch Mode */}
          <div className="spotify-divider">
            <span></span>
          </div>

          <div className="text-center">
            <p className="spotify-text-muted text-sm mb-4">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              className="spotify-btn-secondary w-full"
              onClick={() => setIsLogin(!isLogin)}
              disabled={authLoading}
            >
              {isLogin ? 'Sign up for LyricLingo' : 'Log in instead'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show children if user is authenticated
  return <>{children}</>
}