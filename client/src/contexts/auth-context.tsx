import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { syncUserToDatabase as apiSyncUser, getCurrentUser, type DatabaseUser } from '@/lib/auth'

interface AuthContextType {
  session: Session | null
  user: User | null
  databaseUser: DatabaseUser | null
  loading: boolean
  signOut: () => Promise<void>
  requiresInviteCode: boolean
  setRequiresInviteCode: (required: boolean) => void
  setPendingInviteCode: (code: string | null) => void
  syncUser: (inviteCode?: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  databaseUser: null,
  loading: true,
  signOut: async () => {},
  requiresInviteCode: false,
  setRequiresInviteCode: () => {},
  setPendingInviteCode: () => {},
  syncUser: async () => ({})
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
      if (session?.user) {
        await syncUserToDatabase(session.user)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const syncUserToDatabase = async (user: any) => {
    try {
      console.log('Syncing user to database:', user.email);
      
      // Use new secure API to sync user
      const result = await apiSyncUser(pendingInviteCode || undefined);
      setDatabaseUser(result.user);
      
      // Clear pending invite code after successful sync
      if (result.inviteCodeUsed) {
        setPendingInviteCode(null);
      }
      
      console.log('User sync completed:', result);
    } catch (error) {
      console.error('Failed to sync user:', error);
      // Don't throw here to avoid breaking auth flow
    }
  };

  const syncUser = async (inviteCode?: string) => {
    try {
      if (!user) throw new Error('No authenticated user');
      
      const result = await apiSyncUser(inviteCode);
      setDatabaseUser(result.user);
      return result;
    } catch (error) {
      console.error('Failed to sync user:', error);
      throw error;
    }
  };

  // Load database user when session changes
  useEffect(() => {
    if (session?.user && !databaseUser) {
      getCurrentUser().then(dbUser => {
        if (dbUser) {
          setDatabaseUser(dbUser);
        }
      }).catch(error => {
        console.error('Failed to load database user:', error);
      });
    } else if (!session?.user) {
      setDatabaseUser(null);
    }
  }, [session?.user, databaseUser]);

  const signOut = async () => {
    await supabase.auth.signOut()
    setDatabaseUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      databaseUser,
      loading, 
      signOut, 
      requiresInviteCode, 
      setRequiresInviteCode, 
      setPendingInviteCode,
      syncUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}