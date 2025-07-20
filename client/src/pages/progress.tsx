import { useQuery } from "@tanstack/react-query";
import { Trophy, Target, Flame, BookOpen, Star, Crown, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { api } from "@/lib/api-client";
import { type Vocabulary } from "@shared/schema";

export default function Progress() {
  // Mock user ID - in a real app, this would come from authentication
  const userId = 1;

  const { data: vocabulary = [] } = useQuery<Vocabulary[]>({
    queryKey: ["/api/users", userId, "vocabulary"],
    queryFn: async () => {
      return api.users.getVocabulary(userId);
    }
  });

  // Calculate progress stats
  const weeklyGoal = 50;
  const wordsLearned = vocabulary.length;
  const progressPercentage = Math.min((wordsLearned / weeklyGoal) * 100, 100);
  const streak = 12; // Mock streak data
  const recentVocabulary = vocabulary.slice(-3);

  return (
    <div className="min-h-screen bg-spotify-bg pb-24">
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6 circular-font text-spotify-text">Your Progress</h2>
          
          {/* Weekly Goal */}
          <Card className="bg-spotify-card border-spotify-card mb-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-spotify-text">Weekly Goal</h3>
                <Target className="text-spotify-green" size={24} />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-spotify-muted">Words learned</span>
                    <span className="text-spotify-text">{wordsLearned}/{weeklyGoal}</span>
                  </div>
                  <ProgressBar 
                    value={progressPercentage} 
                    className="h-2 bg-spotify-muted"
                  />
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-spotify-green to-spotify-accent rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{Math.round(progressPercentage)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Streak */}
          <Card className="bg-spotify-card border-spotify-card mb-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-spotify-text">Learning Streak</h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl font-bold spotify-green">{streak}</div>
                  <div className="text-sm text-spotify-muted">Days</div>
                </div>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-6 h-6 rounded-full ${
                        i < 3 ? "bg-spotify-green" : "bg-spotify-muted"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <Flame className="text-orange-500 mx-auto" size={24} />
                  <div className="text-sm text-spotify-muted">Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recently Learned */}
          <Card className="bg-spotify-card border-spotify-card mb-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-spotify-text">Recently Learned</h3>
              {recentVocabulary.length > 0 ? (
                <div className="space-y-3">
                  {recentVocabulary.map((vocab) => (
                    <div key={vocab.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-spotify-text">{vocab.word}</div>
                        <div className="text-sm text-spotify-muted">{vocab.translation}</div>
                      </div>
                      <div className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
                        {vocab.difficulty}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-spotify-muted">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start learning songs to see your vocabulary here!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-spotify-card border-spotify-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-spotify-text">Achievements</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-spotify-bg rounded-lg p-3 text-center">
                  <Music className="text-spotify-green mx-auto mb-1" size={24} />
                  <div className="text-sm font-medium text-spotify-text">First Song</div>
                </div>
                <div className={`bg-spotify-bg rounded-lg p-3 text-center ${
                  wordsLearned >= 10 ? "" : "opacity-50"
                }`}>
                  <BookOpen className="text-spotify-green mx-auto mb-1" size={24} />
                  <div className="text-sm font-medium text-spotify-text">10 Words</div>
                </div>
                <div className={`bg-spotify-bg rounded-lg p-3 text-center ${
                  wordsLearned >= 50 ? "" : "opacity-50"
                }`}>
                  <Star className="text-yellow-500 mx-auto mb-1" size={24} />
                  <div className="text-sm font-medium text-spotify-text">Level Up</div>
                </div>
                <div className={`bg-spotify-bg rounded-lg p-3 text-center ${
                  progressPercentage >= 100 ? "" : "opacity-50"
                }`}>
                  <Crown className="text-gold-500 mx-auto mb-1" size={24} />
                  <div className="text-sm font-medium text-spotify-text">Week Master</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation currentPage="progress" />
    </div>
  );
}
