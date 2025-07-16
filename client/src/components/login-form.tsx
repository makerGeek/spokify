import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Chrome, Facebook, Eye, EyeOff } from 'lucide-react'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { useAuth } from '@/contexts/auth-context'
import { InviteCodeInput } from './invite-code-input'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
  contextMessage?: string
}

export default function LoginForm({ 
  onSuccess, 
  redirectTo = '/home', 
  contextMessage 
}: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [validatedInviteCode, setValidatedInviteCode] = useState<string | null>(null)
  const { toast } = useToast()
  const { isEnabled: socialLoginEnabled } = useFeatureFlag('ENABLE_SOCIAL_LOGIN')
  const { requiresInviteCode } = useAuth()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) {
        // If sign in fails, this might be a new user
        if (requiresInviteCode && !validatedInviteCode) {
          setIsNewUser(true)
          setLoading(false)
          return
        }

        // Try to sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        
        // If user was created successfully, sync to our database
        if (signUpData.user) {
          try {
            await fetch('/api/users/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: signUpData.user.email,
                firstName: null,
                lastName: null,
                profileImageUrl: null,
                inviteCode: validatedInviteCode,
              }),
            });
          } catch (syncError) {
            console.warn('Failed to sync user to database:', syncError);
          }
        }
        
        toast({
          title: 'Account created!',
          description: 'Welcome to Spokify. Please check your email to verify your account.',
        })
      }
      
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const handleInviteCodeValidated = (code: string) => {
    setValidatedInviteCode(code)
    setIsNewUser(false)
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      })
      if (error) throw error
      
      // Note: For social auth, user sync will happen in the auth state change listener
      // since we need to wait for the redirect and get user data from Supabase
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  // Show invite code input if user is new and invite code is required
  if (isNewUser && requiresInviteCode) {
    return (
      <InviteCodeInput
        onCodeValidated={handleInviteCodeValidated}
        onSkip={() => setIsNewUser(false)}
        isLoading={loading}
      />
    )
  }

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1 text-white">Spokify</h1>
        <p className="spotify-text-muted text-xs mb-2">Learn languages through music</p>
        {contextMessage && (
          <div className="mt-3 p-3 bg-spotify-gray rounded-lg border border-spotify-border">
            <p className="spotify-text-secondary text-sm">{contextMessage}</p>
          </div>
        )}
      </div>

      {/* Social Auth Buttons - Only show if feature flag is enabled */}
      {socialLoginEnabled && (
        <>
          <div className="space-y-2 mb-4">
            <button
              className="spotify-social-btn text-xs py-2"
              onClick={() => handleSocialAuth('google')}
              disabled={loading}
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </button>
            <button
              className="spotify-social-btn text-xs py-2"
              onClick={() => handleSocialAuth('facebook')}
              disabled={loading}
            >
              <Facebook className="h-4 w-4" />
              Continue with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="spotify-divider my-4">
            <span>or</span>
          </div>
        </>
      )}

      {/* Email Form */}
      <form onSubmit={handleEmailAuth} className="space-y-3">
        <div className="spotify-form-group">
          <input
            id="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="spotify-input text-sm"
            disabled={loading}
          />
        </div>
        
        <div className="spotify-form-group">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

        <button 
          type="submit" 
          className="spotify-btn-primary w-full text-sm py-3"
          disabled={loading}
        >
          {loading ? (
            <div className="spotify-loading"></div>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="spotify-text-muted text-xs">
          New users will be automatically registered
        </p>
      </div>
    </div>
  )
}