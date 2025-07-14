import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, Trophy, Target, Clock, BookOpen, Flame, Star, TrendingUp } from 'lucide-react'
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
    <div className="min-h-screen bg-spotify-bg">
      {/* Header */}
      <div className="bg-gradient-to-b from-spotify-green/20 to-transparent pt-12 pb-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20 border-2 border-spotify-green">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-2xl bg-spotify-green text-black font-bold">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-spotify-text">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-spotify-muted text-sm">
                {userData?.nativeLanguage || 'English'} → {userData?.targetLanguage || 'Spanish'} • Level {userData?.level || 'A1'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-20">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-spotify-card rounded-lg p-4 border border-spotify-muted">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-spotify-text">{wordsLearned}</span>
            </div>
            <p className="text-sm text-spotify-muted">Words Learned</p>
          </div>
          
          <div className="bg-spotify-card rounded-lg p-4 border border-spotify-muted">
            <div className="flex items-center justify-between mb-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-spotify-text">{streak}</span>
            </div>
            <p className="text-sm text-spotify-muted">Day Streak</p>
          </div>
          
          <div className="bg-spotify-card rounded-lg p-4 border border-spotify-muted">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-spotify-text">{songsCompleted}</span>
            </div>
            <p className="text-sm text-spotify-muted">Songs Completed</p>
          </div>
          
          <div className="bg-spotify-card rounded-lg p-4 border border-spotify-muted">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold text-spotify-text">15m</span>
            </div>
            <p className="text-sm text-spotify-muted">Time Today</p>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="bg-spotify-card rounded-lg p-6 border border-spotify-muted mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-spotify-green" />
              <h3 className="text-lg font-semibold text-spotify-text">Weekly Goal</h3>
            </div>
            <Badge variant="secondary" className="bg-spotify-green/20 text-spotify-green border-spotify-green/20">
              {wordsLearned}/{weeklyGoal} words
            </Badge>
          </div>
          <Progress value={weeklyProgress} className="h-3 mb-2" />
          <p className="text-sm text-spotify-muted">
            {weeklyGoal - wordsLearned > 0 
              ? `${weeklyGoal - wordsLearned} more words to reach your goal`
              : 'Goal achieved! 🎉'
            }
          </p>
        </div>

        {/* Recent Vocabulary */}
        {vocabulary.length > 0 && (
          <div className="bg-spotify-card rounded-lg p-6 border border-spotify-muted mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-spotify-text">Recent Vocabulary</h3>
              </div>
              <TrendingUp className="h-4 w-4 text-spotify-green" />
            </div>
            <div className="space-y-3">
              {vocabulary.slice(0, 5).map((word) => (
                <div key={word.id} className="flex items-center justify-between py-2 border-b border-spotify-muted/30 last:border-b-0">
                  <div>
                    <p className="font-medium text-spotify-text">{word.word}</p>
                    <p className="text-sm text-spotify-muted">{word.translation}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {word.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-spotify-card rounded-lg p-6 border border-spotify-muted">
          <Button
            variant="outline"
            className="w-full justify-center bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
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