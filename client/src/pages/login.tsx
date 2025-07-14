import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Chrome, Facebook, Eye, EyeOff } from 'lucide-react'
import { useLocation } from 'wouter'


export default function Login() {
  const [_, setLocation] = useLocation()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { toast } = useToast()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
      setLocation('/home')
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setLoading(true)
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
      setLoading(false)
    }
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
            {isLogin ? 'Log in to LyricLingo' : 'Sign up for free'}
          </h2>
        </div>

        {/* Social Auth Buttons */}
        <div className="space-y-4 mb-8">
          <button
            className="spotify-social-btn"
            onClick={() => handleSocialAuth('google')}
            disabled={loading}
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </button>
          <button
            className="spotify-social-btn"
            onClick={() => handleSocialAuth('facebook')}
            disabled={loading}
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
              disabled={loading}
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
                disabled={loading}
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
            disabled={loading}
          >
            {loading ? (
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
            disabled={loading}
          >
            {isLogin ? 'Sign up for LyricLingo' : 'Log in instead'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 mb-24">
          <p className="spotify-text-muted text-xs">
            This site is protected by reCAPTCHA and the Google{' '}
            <a href="#" className="spotify-link">Privacy Policy</a> and{' '}
            <a href="#" className="spotify-link">Terms of Service</a> apply.
          </p>
        </div>
      </div>
    </div>
  )
}