import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { api } from '@/lib/api-client'
import { type DatabaseUser } from '@/lib/auth'
import { setUserContext, clearUserContext } from '@/lib/sentry'
import { setUserIdentity, trackUserAction } from '@/lib/clarity'

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

  // Load database user when session changes - with better conditions to prevent unnecessary calls
  useEffect(() => {
    console.log('🔍 Auth Effect: Checking database user load', {
      hasSession: !!session?.user,
      userId: session?.user?.id,
      hasDatabaseUser: !!databaseUser,
      databaseUserId: databaseUser?.id
    });
    
    let isMounted = true; // Prevent state updates if component unmounts
    
    if (session?.user && !databaseUser) {
      console.log('📥 Auth: Loading database user for', session.user.email);
      api.auth.getUser().then(response => {
        if (isMounted && response?.user) {
          console.log('✅ Auth: Database user loaded', response.user.email);
          setDatabaseUser(response.user);
        }
      }).catch(error => {
        if (isMounted) {
          console.error('❌ Auth: Failed to load database user:', error);
        }
      });
    } else if (!session?.user) {
      console.log('🚪 Auth: User logged out, clearing database user');
      setDatabaseUser(null);
    } else if (session?.user && databaseUser) {
      console.log('✅ Auth: Database user already loaded, skipping');
    }
    
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]); // Use session.user.id instead of session.user to prevent unnecessary calls

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