import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, Trophy, Target, Clock, BookOpen, Flame, Star, MoreHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import BottomNavigation from '@/components/bottom-navigation'
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
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      })
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
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header Section with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1db954]/30 via-[#1db954]/10 to-transparent"></div>
        <div className="relative px-6 pt-16 pb-8">
          {/* Profile Header */}
          <div className="flex items-end space-x-6 mb-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-0 shadow-2xl">
                <AvatarImage src={user?.user_metadata?.avatar_url} className="object-cover" />
                <AvatarFallback className="text-4xl bg-[#282828] text-white font-bold border-0">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">Profile</p>
              <h1 className="text-5xl font-black text-white mb-4 leading-tight">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </h1>
              <div className="flex items-center space-x-1 text-sm text-white/70">
                <span>{userData?.nativeLanguage || 'English'}</span>
                <span>→</span>
                <span className="text-[#1db954] font-medium">{userData?.targetLanguage || 'Spanish'}</span>
                <span>•</span>
                <span>Level {userData?.level || 'A1'}</span>
                <span>•</span>
                <span>{wordsLearned} words learned</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-[#1db954] hover:bg-[#1ed760] text-black font-bold px-8 py-3 rounded-full transition-all duration-200 hover:scale-105"
            >
              Continue Learning
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-12 h-12 rounded-full border-white/20 bg-black/20 hover:bg-white/10 hover:border-white/40 transition-all duration-200"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Your Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#181818] rounded-lg p-6 hover:bg-[#282828] transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="h-6 w-6 text-[#1db954]" />
                <span className="text-3xl font-bold text-white">{wordsLearned}</span>
              </div>
              <p className="text-white/70 text-sm font-medium">Words Learned</p>
            </div>
            
            <div className="bg-[#181818] rounded-lg p-6 hover:bg-[#282828] transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <Flame className="h-6 w-6 text-[#ff6b35]" />
                <span className="text-3xl font-bold text-white">{streak}</span>
              </div>
              <p className="text-white/70 text-sm font-medium">Day Streak</p>
            </div>
            
            <div className="bg-[#181818] rounded-lg p-6 hover:bg-[#282828] transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="h-6 w-6 text-[#1db954]" />
                <span className="text-3xl font-bold text-white">{songsCompleted}</span>
              </div>
              <p className="text-white/70 text-sm font-medium">Songs Completed</p>
            </div>
            
            <div className="bg-[#181818] rounded-lg p-6 hover:bg-[#282828] transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <Clock className="h-6 w-6 text-[#8b5cf6]" />
                <span className="text-3xl font-bold text-white">15m</span>
              </div>
              <p className="text-white/70 text-sm font-medium">Time Today</p>
            </div>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-[#181818] rounded-lg p-6 mb-8 hover:bg-[#282828] transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-[#1db954]" />
              <h3 className="text-xl font-bold text-white">Weekly Goal</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{wordsLearned}/{weeklyGoal}</p>
              <p className="text-white/70 text-sm">words</p>
            </div>
          </div>
          <div className="mb-3">
            <div className="w-full bg-[#282828] rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-[#1db954] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${weeklyProgress}%` }}
              ></div>
            </div>
          </div>
          <p className="text-white/70 text-sm">
            {weeklyGoal - wordsLearned > 0 
              ? `${weeklyGoal - wordsLearned} more words to reach your goal`
              : 'Goal achieved this week!'
            }
          </p>
        </div>

        {/* Recent Vocabulary */}
        {vocabulary.length > 0 && (
          <div className="bg-[#181818] rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Star className="h-6 w-6 text-[#1db954]" />
                <h3 className="text-xl font-bold text-white">Recent Vocabulary</h3>
              </div>
            </div>
            <div className="space-y-4">
              {vocabulary.slice(0, 5).map((word, index) => (
                <div key={word.id} className="flex items-center justify-between group hover:bg-white/5 rounded-lg p-3 -mx-3 transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-[#282828] rounded flex items-center justify-center text-white/70 text-sm font-medium group-hover:bg-[#1db954] group-hover:text-black transition-colors duration-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{word.word}</p>
                      <p className="text-white/70 text-sm">{word.translation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-[#282828] text-white/70 text-xs font-medium">
                      {word.difficulty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="bg-[#181818] rounded-lg p-6">
          <Button
            variant="outline"
            className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-medium py-3 rounded-lg transition-all duration-200"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  )
}