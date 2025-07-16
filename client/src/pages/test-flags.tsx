import { useFeatureFlag } from '@/hooks/use-feature-flags'

export default function TestFlags() {
  const { isEnabled, flag, isLoading, error } = useFeatureFlag('ENABLE_SOCIAL_LOGIN')

  return (
    <div className="min-h-screen spotify-bg p-8">
      <div className="max-w-md mx-auto bg-spotify-gray p-6 rounded-lg">
        <h1 className="text-white text-xl mb-4">Feature Flag Test</h1>
        
        <div className="space-y-2 text-sm">
          <p className="text-white">
            <strong>Flag Name:</strong> ENABLE_SOCIAL_LOGIN
          </p>
          <p className="text-white">
            <strong>Is Loading:</strong> {isLoading.toString()}
          </p>
          <p className="text-white">
            <strong>Is Enabled:</strong> {isEnabled.toString()}
          </p>
          <p className="text-white">
            <strong>Flag Data:</strong> {JSON.stringify(flag, null, 2)}
          </p>
          {error && (
            <p className="text-red-400">
              <strong>Error:</strong> {error.toString()}
            </p>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-white text-lg mb-2">Expected Behavior:</h2>
          <p className="text-spotify-text-muted text-sm">
            When isEnabled is true, social login buttons should show.
            When isEnabled is false, only email/password form should show.
          </p>
        </div>

        <div className="mt-4 p-4 bg-spotify-dark rounded border">
          <h3 className="text-white mb-2">Social Login Buttons Test:</h3>
          {isEnabled ? (
            <div className="space-y-2">
              <button className="spotify-social-btn text-xs py-2 w-full">
                Continue with Google
              </button>
              <button className="spotify-social-btn text-xs py-2 w-full">
                Continue with Facebook
              </button>
              <p className="text-green-400 text-xs mt-2">✓ Social buttons are visible</p>
            </div>
          ) : (
            <div>
              <p className="text-red-400 text-xs">✗ Social buttons are hidden</p>
              <p className="text-spotify-text-muted text-xs mt-1">Only email/password form would show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}