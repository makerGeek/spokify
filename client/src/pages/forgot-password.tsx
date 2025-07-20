import { useState } from 'react'
import { Link } from 'wouter'
import { ChevronLeft, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setSent(true)
      toast({
        title: 'Reset email sent',
        description: 'Check your email for a link to reset your password.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-spotify-green/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-spotify-green" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2 text-white">Check your email</h1>
            <p className="spotify-text-muted mb-6 text-sm">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
            
            <div className="space-y-3">
              <Link href="/login">
                <button className="spotify-btn-primary w-full text-sm py-3">
                  Back to login
                </button>
              </Link>
              
              <button
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
                className="spotify-btn-secondary w-full text-sm py-3"
              >
                Send to different email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/login">
            <button className="text-white/70 hover:text-white transition-colors mr-3">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
        </div>

        <div className="mb-6">
          <p className="spotify-text-muted text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="spotify-form-group">
            <input
              id="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="spotify-input text-sm"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="spotify-btn-primary w-full text-sm py-3"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <div className="spotify-loading"></div>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link href="/login">
            <button className="spotify-text-muted hover:text-white text-sm transition-colors">
              Back to login
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}