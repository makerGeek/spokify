import { useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { InviteCodeInput } from '@/components/invite-code-input'
import { useToast } from '@/hooks/use-toast'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [checkingActive, setCheckingActive] = useState(false)
  const [needsInviteCode, setNeedsInviteCode] = useState(false)
  const { toast } = useToast()
  const { isEnabled: inviteCodesEnabled } = useFeatureFlag('ENABLE_INVITE_CODES')

  // Check if user is active when session changes - only if invite codes are enabled
  useEffect(() => {
    console.log('🔍 AuthGuard: Checking activation status', {
      hasUser: !!user,
      inviteCodesEnabled,
      userEmail: user?.email
    });

    const checkActiveStatus = async () => {
      if (!user) {
        setIsActive(null)
        setNeedsInviteCode(false)
        return
      }

      // If invite codes are disabled, all users are considered active
      if (!inviteCodesEnabled) {
        console.log('✅ AuthGuard: Invite codes disabled, user automatically active');
        setIsActive(true)
        setNeedsInviteCode(false)
        setCheckingActive(false)
        return
      }

      console.log('🔍 AuthGuard: Checking activation status for', user.email);
      setCheckingActive(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setIsActive(false)
          setCheckingActive(false)
          return
        }

        const response = await fetch('/api/auth/isActive', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ AuthGuard: Activation check result', data);
          setIsActive(data.isActive)
          setNeedsInviteCode(!data.isActive)
        } else {
          console.log('❌ AuthGuard: Activation check failed');
          setIsActive(false)
          setNeedsInviteCode(true)
        }
      } catch (error) {
        console.error('❌ AuthGuard: Error checking user active status:', error)
        setIsActive(false)
        setNeedsInviteCode(true)
      }
      setCheckingActive(false)
    }

    checkActiveStatus()
  }, [user, inviteCodesEnabled])

  const handleInviteCodeValidated = async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication session')
      }

      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteCode: code }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to activate account')
      }

      toast({
        title: 'Account activated!',
        description: 'Welcome to Spokify. Your account is now active.',
      })

      setIsActive(true)
      setNeedsInviteCode(false)
    } catch (error: any) {
      toast({
        title: 'Activation Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Sign out error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  // Show loading state while checking authentication or activation status
  if (loading || checkingActive) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spotify-loading w-8 h-8 mx-auto mb-4"></div>
          <p className="spotify-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Show invite code input if user needs activation
  if (user && needsInviteCode) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold mb-1 text-white">Welcome to Spokify</h1>
            <p className="spotify-text-muted text-xs mb-2">Spokify is currently invite-only</p>
            <div className="mt-3 p-3 bg-spotify-gray rounded-lg border border-spotify-border">
              <p className="spotify-text-secondary text-sm">
                Please enter your invite code to activate your account
              </p>
            </div>
          </div>
          <InviteCodeInput
            onCodeValidated={handleInviteCodeValidated}
            onSkip={handleSignOut}
            isLoading={false}
          />
        </div>
      </div>
    )
  }

  // Show children if user is authenticated and active
  if (user && isActive) {
    return <>{children}</>
  }

  // Default to not showing protected content
  return null
}