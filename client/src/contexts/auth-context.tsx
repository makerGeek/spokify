import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  requiresInviteCode: boolean
  setRequiresInviteCode: (required: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  requiresInviteCode: false,
  setRequiresInviteCode: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [requiresInviteCode, setRequiresInviteCode] = useState(false)
  const { isEnabled: inviteCodeEnabled } = useFeatureFlag('ENABLE_INVITE_CODES')

  useEffect(() => {
    // Set invite code requirement based on feature flag
    setRequiresInviteCode(inviteCodeEnabled)
  }, [inviteCodeEnabled])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Sync user to our database if they exist
      if (session?.user) {
        syncUserToDatabase(session.user)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Sync user to our database on sign up or sign in
      if (session?.user && (event === 'SIGNED_UP' || event === 'SIGNED_IN')) {
        await syncUserToDatabase(session.user)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const syncUserToDatabase = async (user: any) => {
    try {
      console.log('Syncing user to database:', user.email);
      
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          firstName: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.first_name || null,
          lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.last_name || null,
          profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          inviteCode: null, // For existing users, no invite code needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to sync user to database:', response.status, errorData);
        return;
      }

      const userData = await response.json();
      console.log('User synced successfully:', userData.email);
    } catch (error) {
      console.error('Error during user sync:', error);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, requiresInviteCode, setRequiresInviteCode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}