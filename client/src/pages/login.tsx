import { useLocation } from 'wouter'
import { PassportLoginForm } from '@/components/passport-login-form'
import { useAuth } from '@/contexts/passport-auth-context'
import { useEffect } from 'react'

export default function Login() {
  const [_, setLocation] = useLocation()
  const { isAuthenticated } = useAuth()

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/home')
    }
  }, [isAuthenticated, setLocation])

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <PassportLoginForm 
        onSuccess={() => setLocation('/home')}
      />
    </div>
  )
}