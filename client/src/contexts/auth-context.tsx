import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { api } from '@/lib/api-client'
import { type DatabaseUser } from '@/lib/auth'

interface AuthContextType {
  session: Session | null
  user: User | null
  databaseUser: DatabaseUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
  requiresInviteCode: boolean
  setRequiresInviteCode: (required: boolean) => void
  setPendingInviteCode: (code: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  databaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
  requiresInviteCode: false,
  setRequiresInviteCode: () => {},
  setPendingInviteCode: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null)
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
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load database user when session changes
  // User sync happens automatically via middleware on first API call
  useEffect(() => {
    if (session?.user && !databaseUser) {
      // Only load if we don't already have database user data
      api.auth.getUser().then(response => {
        if (response?.user) {
          setDatabaseUser(response.user);
        }
      }).catch(error => {
        console.error('Failed to load database user:', error);
      });
    } else if (!session?.user) {
      setDatabaseUser(null);
    }
  }, [session?.user]); // Removed databaseUser from dependencies to prevent infinite loop

  const signOut = async () => {
    await supabase.auth.signOut()
    setDatabaseUser(null)
  }

  const refreshUserData = async () => {
    if (session?.user) {
      try {
        const response = await api.auth.getUser();
        if (response?.user) {
          setDatabaseUser(response.user);
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      databaseUser,
      loading, 
      signOut, 
      refreshUserData,
      requiresInviteCode, 
      setRequiresInviteCode, 
      setPendingInviteCode
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}