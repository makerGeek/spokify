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
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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