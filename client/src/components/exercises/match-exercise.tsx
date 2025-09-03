import { Trophy, RotateCcw, Home, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useMatchingGame } from "@/hooks/use-matching-game";
import { MatchingCard } from "@/components/exercise/matching-card";
import { type Vocabulary } from "@shared/schema";

interface MatchExerciseProps {
  vocabulary: Vocabulary[];
  targetLanguage: string;
  mixMode?: boolean;
  onMixComplete?: () => void;
  hideHeader?: boolean;
  hideCard?: boolean;
}

export function MatchExercise({ vocabulary, targetLanguage, mixMode = false, onMixComplete, hideHeader = false, hideCard = false }: MatchExerciseProps) {
  const [, setLocation] = useLocation();
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(mixMode ? 1 : 4);
  const [roundScores, setRoundScores] = useState<number[]>([]);

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
    setCurrentRound(1);
    setRoundScores([]);
    resetGame();
  };

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      // Record current round score
      setRoundScores(prev => [...prev, score.matches]);
      
      // Move to next round
      setCurrentRound(prev => prev + 1);
      resetGame();
    }
  };

  // Handle round completion
  useEffect(() => {
    if (isGameComplete) {
      if (mixMode && onMixComplete) {
        // Auto-advance in mix mode
        onMixComplete();
      } else if (currentRound < totalRounds) {
        // Auto-advance to next round after a brief delay
        const timer = setTimeout(() => {
          handleNextRound();
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // Final round completed - record score
        setRoundScores(prev => [...prev, score.matches]);
      }
    }
  }, [isGameComplete, mixMode, onMixComplete, currentRound, totalRounds, score.matches]);

  // Check if all rounds are complete
  const allRoundsComplete = currentRound > totalRounds || (currentRound === totalRounds && isGameComplete);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - only show in regular mode */}
      {!mixMode && !hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="spotify-heading-lg">Match the Words</h1>
          </div>
        </div>
      )}

      {/* Progress Bar - only show in regular mode and when not complete */}
      {!mixMode && !allRoundsComplete && (
        <div className="mb-6">
          <div className="w-full bg-[var(--spotify-light-gray)] rounded-full h-2">
            <div 
              className="bg-[var(--spotify-green)] h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((currentRound - 1) / totalRounds + (matches.length / 5) / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Game Content */}
      {!allRoundsComplete && !isGameComplete && (
        hideCard ? (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 max-w-2xl mx-auto">
            {/* Left Column - Foreign Language */}
            <div className="space-y-3">
              <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
                {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : targetLanguage === 'it' ? 'Italian' : targetLanguage === 'nl' ? 'Dutch' : targetLanguage === 'pt' ? 'Portuguese' : 'Foreign Language'}
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
        ) : (
          <div className="spotify-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 max-w-2xl mx-auto">
              {/* Left Column - Foreign Language */}
              <div className="space-y-3">
                <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
                  {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : targetLanguage === 'it' ? 'Italian' : targetLanguage === 'nl' ? 'Dutch' : targetLanguage === 'pt' ? 'Portuguese' : 'Foreign Language'}
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
        )
      )}

      {/* Round Complete - show brief message between rounds */}
      {isGameComplete && !mixMode && currentRound < totalRounds && (
        <div className="text-center py-8">
          <div className="spotify-card p-6 max-w-md mx-auto">
            <CheckCircle className="mx-auto text-[var(--spotify-green)] mb-4" size={48} />
            <h2 className="spotify-heading-md mb-2">Round {currentRound} Complete!</h2>
            <div className="spotify-text-muted mb-4">
              {score.matches}/5 matches - Moving to next round...
            </div>
          </div>
        </div>
      )}

      {/* All Rounds Complete - only show in regular mode */}
      {allRoundsComplete && !mixMode && (
        <div className="text-center py-8">
          <div className="spotify-card p-8 max-w-lg mx-auto">
            <Trophy className="mx-auto spotify-text-accent mb-4" size={64} />
            <h2 className="spotify-heading-md mb-4">All Rounds Complete! 🎉</h2>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                {roundScores.reduce((total, score) => total + score, 0)}/{totalRounds * 5}
              </div>
              <div className="spotify-text-muted mb-4">
                Total matches across all rounds
              </div>
              
              {/* Round breakdown */}
              <div className="grid grid-cols-2 gap-2 text-sm spotify-text-muted">
                {roundScores.map((score, index) => (
                  <div key={index} className="flex justify-between">
                    <span>Round {index + 1}:</span>
                    <span className={score === 5 ? "text-[var(--spotify-green)]" : ""}>{score}/5</span>
                  </div>
                ))}
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
                onClick={() => window.history.back()}
                className="flex items-center justify-center space-x-2 spotify-btn-secondary"
              >
                <Home className="h-4 w-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}