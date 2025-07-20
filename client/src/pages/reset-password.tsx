import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function ResetPassword() {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [_, setLocation] = useLocation()
  const { toast } = useToast()

  // Check if we have the necessary hash parameters from the email link
  useEffect(() => {
    const handleAuthStateChange = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // If user is already signed in and we're not in a password reset flow,
      // redirect to home
      if (session && !window.location.hash.includes('type=recovery')) {
        setLocation('/home')
      }
    }

    handleAuthStateChange()
  }, [setLocation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      })
      
      // Redirect to home after a short delay
      setTimeout(() => {
        setLocation('/home')
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-spotify-green/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-spotify-green" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2 text-white">Password updated!</h1>
            <p className="spotify-text-muted mb-6 text-sm">
              Your password has been successfully updated. You'll be redirected to your dashboard shortly.
            </p>
            
            <div className="spotify-loading mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2 text-white">Set new password</h1>
          <p className="spotify-text-muted text-sm">
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="spotify-form-group">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="spotify-input pr-10 text-sm"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="spotify-form-group">
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="spotify-input pr-10 text-sm"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password requirements */}
          <div className="text-xs spotify-text-muted space-y-1">
            <p className={password.length >= 6 ? 'text-spotify-green' : ''}>
              • At least 6 characters
            </p>
            <p className={password === confirmPassword && password.length > 0 ? 'text-spotify-green' : ''}>
              • Passwords match
            </p>
          </div>

          <button 
            type="submit" 
            className="spotify-btn-primary w-full text-sm py-3"
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          >
            {loading ? (
              <div className="spotify-loading"></div>
            ) : (
              'Update password'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="spotify-text-muted text-xs">
            Remember your password?{' '}
            <button 
              onClick={() => setLocation('/login')}
              className="text-spotify-green hover:underline cursor-pointer"
            >
              Back to login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}