import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, Trophy, Target, Clock, BookOpen, Flame, Star, MoreHorizontal, Download, Smartphone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { type User, type Vocabulary, type UserProgress } from '@shared/schema'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  // Fetch user data from your backend
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false
  })

  const { data: vocabulary = [] } = useQuery<Vocabulary[]>({
    queryKey: ["/api/users/1/vocabulary"],
    retry: false
  })

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/users/1/progress"],
    retry: false
  })

  // PWA Install functionality
  useEffect(() => {
    console.log('Setting up install prompt listeners')
    
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event received')
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      console.log('App installed event received')
      setDeferredPrompt(null)
      setCanInstall(false)
      toast({
        title: 'App Installed!',
        description: 'LyricLingo has been installed successfully.',
      })
    }

    // Check if we're in a compatible browser
    const isCompatible = 'serviceWorker' in navigator && 'PushManager' in window
    console.log('PWA compatible browser:', isCompatible)
    
    // For development/testing, show install option even without prompt
    if (process.env.NODE_ENV === 'development') {
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [toast])

  const handleInstallApp = async () => {
    console.log('Install button clicked:', { deferredPrompt, canInstall })
    
    if (!deferredPrompt) {
      // Check if app is already installed
      if ('navigator' in window && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        if (registrations.length > 0) {
          toast({
            title: 'App Installation',
            description: 'The app may already be installed, or installation is not available in this browser.',
          })
        } else {
          toast({
            title: 'Installation Not Available',
            description: 'App installation is not available in this browser. Try using Chrome, Edge, or another supported browser.',
          })
        }
      }
      return
    }

    try {
      console.log('Prompting install...')
      const result = await deferredPrompt.prompt()
      console.log('Install result:', result)
      
      if (result.outcome === 'accepted') {
        toast({
          title: 'Installing App...',
          description: 'LyricLingo is being installed.',
        })
      } else {
        toast({
          title: 'Installation Cancelled',
          description: 'App installation was cancelled.',
        })
      }
      setDeferredPrompt(null)
      setCanInstall(false)
    } catch (error) {
      console.error('Install error:', error)
      toast({
        title: 'Installation Failed',
        description: 'Unable to install the app. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const wordsLearned = vocabulary.length
  const songsCompleted = userProgress.filter(p => p.progressPercentage === 100).length
  const weeklyGoal = userData?.weeklyGoal || 50
  const streak = userData?.streak || 0
  const weeklyProgress = Math.min((wordsLearned / weeklyGoal) * 100, 100)

  return (
    <div className="min-h-screen spotify-bg spotify-text-primary">
      {/* Header Section with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 spotify-gradient-header"></div>
        <div className="relative px-6 pt-16 pb-8">
          {/* Profile Header */}
          <div className="flex items-end space-x-6 mb-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-0 shadow-2xl">
                <AvatarImage src={user?.user_metadata?.avatar_url} className="object-cover" />
                <AvatarFallback className="text-4xl bg-[var(--spotify-light-gray)] spotify-text-primary font-bold border-0">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium spotify-text-secondary uppercase tracking-wide mb-2">Profile</p>
              <h1 className="spotify-heading-xl mb-4">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </h1>
              <div className="flex items-center space-x-1 text-sm spotify-text-secondary">
                <span>{wordsLearned} words learned</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button className="spotify-btn-secondary w-12 h-12 !rounded-full !p-0">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="spotify-heading-lg mb-6">Your Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="h-6 w-6 text-[var(--spotify-green)]" />
                <span className="text-3xl font-bold spotify-text-primary">{wordsLearned}</span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">Words Learned</p>
            </div>
            
            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Flame className="h-6 w-6 text-[#ff6b35]" />
                <span className="text-3xl font-bold spotify-text-primary">{streak}</span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">Day Streak</p>
            </div>
            
            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="h-6 w-6 text-[var(--spotify-green)]" />
                <span className="text-3xl font-bold spotify-text-primary">{songsCompleted}</span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">Songs Completed</p>
            </div>
            
            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Clock className="h-6 w-6 text-[#8b5cf6]" />
                <span className="text-3xl font-bold spotify-text-primary">15m</span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">Time Today</p>
            </div>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="spotify-card spotify-hover-lift p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-[var(--spotify-green)]" />
              <h3 className="spotify-heading-md">Weekly Goal</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold spotify-text-primary">{wordsLearned}/{weeklyGoal}</p>
              <p className="spotify-text-secondary text-sm">words</p>
            </div>
          </div>
          <div className="mb-3">
            <div className="spotify-progress">
              <div 
                className="spotify-progress-fill transition-all duration-500 ease-out"
                style={{ width: `${weeklyProgress}%` }}
              ></div>
            </div>
          </div>
          <p className="spotify-text-secondary text-sm">
            {weeklyGoal - wordsLearned > 0 
              ? `${weeklyGoal - wordsLearned} more words to reach your goal`
              : 'Goal achieved this week!'
            }
          </p>
        </div>

        {/* Recent Vocabulary */}
        {vocabulary.length > 0 && (
          <div className="spotify-card p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Star className="h-6 w-6 text-[var(--spotify-green)]" />
                <h3 className="spotify-heading-md">Recent Vocabulary</h3>
              </div>
            </div>
            <div className="space-y-4">
              {vocabulary.slice(0, 5).map((word, index) => (
                <div key={word.id} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-3 -mx-3 transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-[var(--spotify-light-gray)] rounded flex items-center justify-center spotify-text-secondary text-sm font-medium group-hover:bg-[var(--spotify-green)] group-hover:text-black transition-colors duration-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold spotify-text-primary">{word.word}</p>
                      <p className="spotify-text-secondary text-sm">{word.translation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-xs font-medium">
                      {word.difficulty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Install App Section */}
        <div className="spotify-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6 text-[var(--spotify-green)]" />
              <div>
                <h3 className="spotify-heading-md">Install App</h3>
                <p className="spotify-text-secondary text-sm">Get the native app experience</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm spotify-text-secondary">
              <div className="w-2 h-2 bg-[var(--spotify-green)] rounded-full"></div>
              <span>Offline learning capability</span>
            </div>
            <div className="flex items-center space-x-2 text-sm spotify-text-secondary">
              <div className="w-2 h-2 bg-[var(--spotify-green)] rounded-full"></div>
              <span>Faster performance</span>
            </div>
            <div className="flex items-center space-x-2 text-sm spotify-text-secondary">
              <div className="w-2 h-2 bg-[var(--spotify-green)] rounded-full"></div>
              <span>Native notifications</span>
            </div>
          </div>

          <div className="mt-6">
            {canInstall ? (
              <button
                className="spotify-btn-primary w-full"
                onClick={handleInstallApp}
              >
                <Download className="mr-2 h-4 w-4" />
                Install LyricLingo
              </button>
            ) : (
              <div className="text-center p-4 bg-[var(--spotify-light-gray)] rounded-lg">
                <Smartphone className="h-8 w-8 text-[var(--spotify-green)] mx-auto mb-2" />
                <p className="spotify-text-secondary text-sm">
                  App installation is available in supported browsers
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="spotify-card p-6">
          <button
            className="spotify-btn-secondary w-full !border-red-500/20 !text-red-400 hover:!bg-red-500/10 hover:!text-red-300"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}