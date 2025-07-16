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
  setPendingInviteCode: (code: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  requiresInviteCode: false,
  setRequiresInviteCode: () => {},
  setPendingInviteCode: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [requiresInviteCode, setRequiresInviteCode] = useState(false)
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null)
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
      
      // Get user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('No authentication token available');
        return;
      }
      
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteCode: pendingInviteCode, // Use pending invite code if available
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to sync user to database:', response.status, errorData);
        return;
      }

      const userData = await response.json();
      console.log('User synced successfully:', userData.user?.email);
      
      // Clear pending invite code after successful sync
      setPendingInviteCode(null);
    } catch (error) {
      console.error('Error during user sync:', error);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, requiresInviteCode, setRequiresInviteCode, setPendingInviteCode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}