import { useLocation } from 'wouter'
import LoginForm from '@/components/login-form'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

export default function Login() {
  const [_, setLocation] = useLocation()
  const { isEnabled, flag, isLoading, error } = useFeatureFlag('ENABLE_SOCIAL_LOGIN')

  // Debug output on login page
  console.log('Login page - Feature flag debug:', {
    isEnabled,
    flag,
    isLoading,
    error
  })

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <div className="space-y-4">
        {/* Debug info visible on page */}
        <div className="bg-red-900 text-white p-2 text-xs rounded">
          <p>Debug: ENABLE_SOCIAL_LOGIN = {isEnabled ? 'TRUE' : 'FALSE'}</p>
          <p>Loading: {isLoading ? 'YES' : 'NO'}</p>
          <p>Flag data: {JSON.stringify(flag)}</p>
        </div>
        
        <LoginForm 
          onSuccess={() => setLocation('/home')}
          redirectTo="/home"
        />
      </div>
    </div>
  )
}