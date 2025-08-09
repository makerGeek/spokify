import { Trophy, RotateCcw, Home, CheckCircle, Music } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useFillBlanks } from "@/hooks/use-fill-blanks";
import { BlankInput } from "@/components/exercise/blank-input";
import { type Vocabulary } from "@shared/schema";

interface FillBlanksExerciseProps {
  vocabulary: Vocabulary[];
  targetLanguage: string;
  maxExercises?: number;
  mixMode?: boolean;
  onMixComplete?: () => void;
}

export function FillBlanksExercise({ vocabulary, targetLanguage, maxExercises = 5, mixMode = false, onMixComplete }: FillBlanksExerciseProps) {
  const [, setLocation] = useLocation();

  const {
    currentExercise,
    userAnswers,
    showResults,
    isCorrect,
    progress,
    isComplete,
    correctAnswers,
    handleAnswerChange,
    handleSubmit,
    nextExercise,
    tryAgain,
    resetGame
  } = useFillBlanks({
    vocabulary,
    maxExercises
  });

  const handleNewGame = () => {
    resetGame();
  };

  // Auto-advance in mix mode when game completes
  useEffect(() => {
    if (mixMode && isComplete && onMixComplete) {
      // Immediately advance to next exercise in mix mode
      onMixComplete();
    }
  }, [isComplete, mixMode, onMixComplete]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - only show in regular mode */}
      {!mixMode && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="spotify-heading-lg">Fill in the Blanks</h1>
            <p className="spotify-text-muted">Complete the song lyrics</p>
          </div>
          <div className="text-right">
            <div className="text-[var(--spotify-green)] font-semibold text-lg">
              {progress.current}/{progress.total}
            </div>
            <div className="text-xs spotify-text-muted">
              exercises
            </div>
          </div>
        </div>
      )}

      {/* Game Content */}
      {currentExercise && !isComplete && (
        <div>
          {/* Song info */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 spotify-text-muted text-sm">
              <Music size={18} className="text-[var(--spotify-green)]" />
              <span>From: {currentExercise.songName}</span>
            </div>
          </div>

          {/* Exercise card */}
          <div className="spotify-card p-6 mb-8">
            <div className="text-center mb-6">
              <p className="spotify-text-muted text-sm mb-2">Complete the {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : 'target language'} lyrics:</p>
            </div>

            {/* Lyrics with blanks */}
            <div className="text-center text-lg leading-relaxed spotify-text-primary">
              {currentExercise.textWithBlanks.map((part, index) => (
                <span key={index}>
                  {typeof part === 'string' ? (
                    part
                  ) : (
                    <BlankInput
                      key={`blank-${index}`}
                      value={userAnswers[part.blankIndex] || ''}
                      placeholder="..."
                      isCorrect={showResults ? (correctAnswers[part.blankIndex] ? true : false) : null}
                      correctAnswer={showResults ? part.answer : undefined}
                      onChange={(value) => handleAnswerChange(part.blankIndex, value)}
                      disabled={showResults}
                    />
                  )}
                </span>
              ))}
            </div>

            {/* Word hints */}
            {currentExercise.hints.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[var(--spotify-border)]">
                <p className="text-center spotify-text-muted text-sm mb-3">Word bank:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentExercise.hints.map((hint, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Find the first empty blank and fill it
                        const emptyBlankIndex = currentExercise.blanks.findIndex((_, blankIdx) => 
                          !userAnswers[blankIdx]
                        );
                        if (emptyBlankIndex !== -1) {
                          handleAnswerChange(emptyBlankIndex, hint);
                        }
                      }}
                      disabled={showResults}
                      className="px-3 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-sm hover:bg-[var(--spotify-border)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          {!showResults && (
            <div className="text-center mb-6">
              <button
                onClick={handleSubmit}
                className="spotify-btn-primary"
                disabled={Object.keys(userAnswers).length === 0}
              >
                Check Answers
              </button>
            </div>
          )}

          {/* Results */}
          {showResults && (
            <div className="text-center mb-6">
              {isCorrect ? (
                <div className="text-green-400 mb-4">
                  <CheckCircle className="mx-auto mb-2" size={32} />
                  <p className="spotify-text-primary font-semibold">Excellent! All correct!</p>
                </div>
              ) : (
                <div className="text-orange-400 mb-4">
                  <p className="spotify-text-primary font-semibold">
                    {Object.values(correctAnswers).filter(Boolean).length} out of {currentExercise.blanks.length} correct
                  </p>
                </div>
              )}
              
              {/* English translation */}
              <div className="mb-6 p-4 bg-[var(--spotify-light-gray)] rounded-lg">
                <p className="spotify-text-muted text-sm mb-2">English translation:</p>
                <p className="spotify-text-primary italic">"{currentExercise.englishTranslation}"</p>
              </div>
              
              {isCorrect ? (
                <button
                  onClick={nextExercise}
                  className="spotify-btn-primary"
                >
                  Next Exercise
                </button>
              ) : (
                <button
                  onClick={tryAgain}
                  className="spotify-btn-secondary"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Game Complete - only show in regular mode */}
      {isComplete && !mixMode && (
        <div className="text-center py-8">
          <div className="spotify-card p-8 max-w-md mx-auto">
            <Trophy className="mx-auto spotify-text-accent mb-4" size={64} />
            <h2 className="spotify-heading-md mb-4">Well Done! 🎉</h2>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                {progress.current}/{progress.total}
              </div>
              <div className="spotify-text-muted">
                exercises completed correctly
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