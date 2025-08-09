import { Trophy, RotateCcw, Home, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useWordBuilder } from "@/hooks/use-word-builder";
import { WordTile } from "@/components/exercise/word-tile";
import { DropZone } from "@/components/exercise/drop-zone";
import { type Vocabulary } from "@shared/schema";

interface WordBuilderExerciseProps {
  vocabulary: Vocabulary[];
  targetLanguage: string;
  maxSentences?: number;
  mixMode?: boolean;
  onMixComplete?: () => void;
  hideHeader?: boolean;
}

export function WordBuilderExercise({ vocabulary, targetLanguage, maxSentences = 5, mixMode = false, onMixComplete, hideHeader = false }: WordBuilderExerciseProps) {
  const [, setLocation] = useLocation();

  const {
    currentSentence,
    builtSentence,
    isCorrect,
    isComplete,
    progress,
    draggedWord,
    availableWords,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleWordClick,
    handleRemoveWord,
    checkSentence,
    nextSentence,
    tryAgain,
    resetGame
  } = useWordBuilder({
    vocabulary,
    maxSentences
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
      {!mixMode && !hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="spotify-heading-lg">Phrase Builder</h1>
          </div>
        </div>
      )}

      {/* Progress Bar - only show in regular mode and when not complete */}
      {!mixMode && !isComplete && (
        <div className="mb-6">
          <div className="w-full bg-[var(--spotify-light-gray)] rounded-full h-2">
            <div 
              className="bg-[var(--spotify-green)] h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Game Content */}
      {currentSentence && !isComplete && (
        <div>
          {/* Game mode and sentence to rebuild */}
          <div className="text-center mb-8">
            <div className="spotify-card p-4 bg-[var(--spotify-light-gray)]">
              {currentSentence.gameMode === 'build-target' ? (
                <>
                  <p className="spotify-text-muted text-sm mb-2">Build this in {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : 'target language'}:</p>
                  <p className="spotify-text-primary text-lg font-medium">
                    "{currentSentence.englishSentence}"
                  </p>
                </>
              ) : (
                <>
                  <p className="spotify-text-muted text-sm mb-2">Build this in English:</p>
                  <p className="spotify-text-primary text-lg font-medium">
                    "{currentSentence.targetSentence}"
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Drop zone for building sentence */}
          <div className="mb-8">
            <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
              Your sentence:
            </h3>
            <DropZone
              words={builtSentence}
              onDrop={handleDrop}
              onRemoveWord={handleRemoveWord}
              isCorrect={isCorrect}
            />
          </div>

          {/* Word tiles */}
          <div className="mb-8">
            <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
              Available words:
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {availableWords.map((word, index) => (
                <WordTile
                  key={`${word}-${index}`}
                  word={word}
                  isDragging={draggedWord === word}
                  onDragStart={() => handleDragStart(word)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleWordClick(word)}
                />
              ))}
            </div>
          </div>

          {/* Check button */}
          {builtSentence.length > 0 && isCorrect === null && (
            <div className="text-center mb-6">
              <button
                onClick={checkSentence}
                className="spotify-btn-primary"
              >
                Check Sentence
              </button>
            </div>
          )}

          {/* Result feedback */}
          {isCorrect !== null && (
            <div className="text-center mb-6">
              {isCorrect ? (
                <div className="text-green-400 mb-4">
                  <CheckCircle className="mx-auto mb-2" size={32} />
                  <p className="spotify-text-primary font-semibold">Perfect! Well done!</p>
                </div>
              ) : (
                <div className="text-red-400 mb-4">
                  <p className="spotify-text-primary font-semibold mb-2">
                    Not quite right. The correct answer is:
                  </p>
                  <p className="spotify-text-muted italic">
                    "{currentSentence.correctWords.join(' ')}"
                  </p>
                </div>
              )}
              
              {isCorrect ? (
                <button
                  onClick={nextSentence}
                  className="spotify-btn-primary"
                >
                  Next Sentence
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
            <h2 className="spotify-heading-md mb-4">Excellent Work! 🎉</h2>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                {progress.current}/{progress.total}
              </div>
              <div className="spotify-text-muted">
                sentences completed
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