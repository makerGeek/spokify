import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, Trophy, Target, Clock, BookOpen, Flame, Star, MoreHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { type User, type Vocabulary, type UserProgress } from '@shared/schema'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

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
                <span>{userData?.nativeLanguage || 'English'}</span>
                <span>→</span>
                <span className="text-[var(--spotify-green)] font-medium">{userData?.targetLanguage || 'Spanish'}</span>
                <span>•</span>
                <span>Level {userData?.level || 'A1'}</span>
                <span>•</span>
                <span>{wordsLearned} words learned</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button className="spotify-btn-primary px-8 py-3">
              Continue Learning
            </button>
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