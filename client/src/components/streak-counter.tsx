import { Flame, Trophy, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StreakCounterProps {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate?: string | null;
  className?: string;
}

export function StreakCounter({ 
  currentStreak, 
  bestStreak, 
  lastActiveDate,
  className = "" 
}: StreakCounterProps) {
  const isStreakActive = currentStreak > 0;
  const streakEmoji = currentStreak >= 30 ? "🔥" : currentStreak >= 7 ? "⚡" : "🌟";

  return (
    <Card className={`bg-spotify-card border-spotify-card ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Flame 
                size={24} 
                className={isStreakActive ? "text-orange-500" : "text-spotify-muted"} 
              />
              <div>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-spotify-text">
                    {currentStreak}
                  </span>
                  {isStreakActive && (
                    <span className="text-lg">{streakEmoji}</span>
                  )}
                </div>
                <p className="text-xs text-spotify-muted">
                  {currentStreak === 1 ? "day streak" : "days streak"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center space-x-1 mb-1">
              <Trophy size={16} className="text-yellow-500" />
              <span className="text-lg font-semibold text-spotify-text">
                {bestStreak}
              </span>
            </div>
            <p className="text-xs text-spotify-muted">best streak</p>
          </div>
        </div>

        {/* Motivational text */}
        {currentStreak > 0 && (
          <div className="mt-3 pt-3 border-t border-spotify-border">
            <p className="text-sm text-spotify-text">
              {currentStreak >= 30 
                ? "🔥 On fire! You're unstoppable!" 
                : currentStreak >= 7 
                ? "⚡ Great momentum! Keep it up!" 
                : currentStreak >= 3
                ? "🌟 Building a habit! Nice work!"
                : "🚀 Great start! Let's keep going!"
              }
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}