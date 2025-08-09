import { Trophy, RotateCcw, Home, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useMatchingGame } from "@/hooks/use-matching-game";
import { MatchingCard } from "@/components/exercise/matching-card";
import { type Vocabulary } from "@shared/schema";

interface MatchExerciseProps {
  vocabulary: Vocabulary[];
  targetLanguage: string;
  mixMode?: boolean;
  onMixComplete?: () => void;
}

export function MatchExercise({ vocabulary, targetLanguage, mixMode = false, onMixComplete }: MatchExerciseProps) {
  const [, setLocation] = useLocation();

  const {
    leftColumn,
    rightColumn,
    selectedLeft,
    selectedRight,
    matches,
    wrongMatchIds,
    isGameComplete,
    score,
    handleCardSelect,
    resetGame
  } = useMatchingGame({ vocabulary });

  const handleNewGame = () => {
    resetGame();
  };

  // Auto-advance in mix mode when game completes
  useEffect(() => {
    if (mixMode && isGameComplete && onMixComplete) {
      // Immediately advance to next exercise in mix mode (no delay)
      onMixComplete();
    }
  }, [isGameComplete, mixMode, onMixComplete]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - only show in regular mode */}
      {!mixMode && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="spotify-heading-lg">Match the Words</h1>
            <p className="spotify-text-muted">Connect words with their translations</p>
          </div>
          <div className="text-right">
            <div className="text-[var(--spotify-green)] font-semibold text-lg">
              {score.matches}/5
            </div>
            <div className="text-xs spotify-text-muted">
              matches
            </div>
          </div>
        </div>
      )}

      {/* Game Content */}
      {!isGameComplete && (
        <div className="spotify-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Left Column - Foreign Language */}
            <div className="space-y-3">
              <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
                {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : 'Foreign Language'}
              </h3>
              {leftColumn.map((item, index) => (
                <MatchingCard
                  key={item.id}
                  id={item.id}
                  text={item.word}
                  isSelected={selectedLeft === item.id}
                  isMatched={matches.some(m => m.leftId === item.id)}
                  isWrongMatch={wrongMatchIds?.leftId === item.id}
                  side="left"
                  onClick={() => handleCardSelect(item.id, 'left')}
                />
              ))}
            </div>

            {/* Right Column - English */}
            <div className="space-y-3">
              <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
                English
              </h3>
              {rightColumn.map((item, index) => (
                <MatchingCard
                  key={item.id}
                  id={item.id}
                  text={item.translation}
                  isSelected={selectedRight === item.id}
                  isMatched={matches.some(m => m.rightId === item.id)}
                  isWrongMatch={wrongMatchIds?.rightId === item.id}
                  side="right"
                  onClick={() => handleCardSelect(item.id, 'right')}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Complete - only show in regular mode */}
      {isGameComplete && !mixMode && (
        <div className="text-center py-8">
          <div className="spotify-card p-8 max-w-md mx-auto">
            <Trophy className="mx-auto spotify-text-accent mb-4" size={64} />
            <h2 className="spotify-heading-md mb-4">Perfect Match! 🎉</h2>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                5/5
              </div>
              <div className="spotify-text-muted">
                All words matched correctly!
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleNewGame}
                className="flex items-center justify-center space-x-2 spotify-btn-primary"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play Again</span>
              </button>
              <button
                onClick={() => setLocation("/home")}
                className="flex items-center justify-center space-x-2 spotify-btn-secondary"
              >
                <Home className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}