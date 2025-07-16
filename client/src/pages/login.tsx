import { useLocation } from 'wouter'
import LoginForm from '@/components/login-form'

export default function Login() {
  const [_, setLocation] = useLocation()

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <LoginForm 
        onSuccess={() => setLocation('/home')}
        redirectTo="/home"
      />
    </div>
  )
}