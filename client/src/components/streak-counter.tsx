import { Flame, Trophy } from "lucide-react";

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

  return (
    <div className={`spotify-card-nohover p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Flame className={`h-6 w-6 ${isStreakActive ? "text-orange-500" : "spotify-text-muted"}`} />
          <div>
            <h3 className="spotify-heading-md">Daily Streak</h3>
            <p className="spotify-text-secondary text-sm">
              Keep your learning momentum going
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <span className="text-3xl font-bold spotify-text-primary">
              {currentStreak}
            </span>
            {isStreakActive && (
              <Flame className="h-5 w-5 text-orange-500" />
            )}
          </div>
          <p className="spotify-text-secondary text-sm font-medium">
            Current Streak
          </p>
          <p className="spotify-text-muted text-xs">
            {currentStreak === 1 ? "day" : "days"}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <span className="text-3xl font-bold spotify-text-primary">
              {bestStreak}
            </span>
            <Trophy className="h-5 w-5 text-[var(--spotify-green)]" />
          </div>
          <p className="spotify-text-secondary text-sm font-medium">
            Best Streak
          </p>
          <p className="spotify-text-muted text-xs">
            {bestStreak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      {/* Motivational text */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--spotify-border)]">
          <p className="spotify-text-secondary text-sm text-center">
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
    </div>
  );
}