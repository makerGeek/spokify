import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, RotateCcw, Home, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import AuthenticatedOnly from "@/components/authenticated-only";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { useWordBuilder } from "@/hooks/use-word-builder";
import { WordTile } from "@/components/exercise/word-tile";
import { DropZone } from "@/components/exercise/drop-zone";
import { type Vocabulary } from "@shared/schema";

export default function ExerciseWordBuilder() {
  const [, setLocation] = useLocation();
  const { user, databaseUser } = useAuth();

  // Get user's target language from preferences
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}"
  );
  const { targetLanguage = "es" } = userPreferences;

  const { data: allVocabulary, isLoading } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getVocabulary(databaseUser.id);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter vocabulary by selected language and ensure we have context for sentence building
  const vocabulary = useMemo(() => {
    if (!allVocabulary) return [];
    return allVocabulary.filter(word => 
      word.language === targetLanguage && 
      word.context && 
      word.context.length > 10 // Ensure we have meaningful context
    );
  }, [allVocabulary, targetLanguage]);

  const {
    currentSentence,
    builtSentence,
    isCorrect,
    isComplete,
    progress,
    draggedWord,
    isLoading: gameLoading,
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
    vocabulary: vocabulary || [],
    maxSentences: 5
  });

  const handleNewGame = () => {
    resetGame();
  };

  if (isLoading || gameLoading) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Loading vocabulary...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  if (!vocabulary || vocabulary.length < 3) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setLocation('/home')}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
            </div>

            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔨</div>
              <h2 className="spotify-heading-md mb-2">Need More Context</h2>
              <p className="spotify-text-muted mb-6">
                You need vocabulary words with context (from song lyrics) to play the sentence builder game. Learn more songs to unlock this exercise!
              </p>
              <button
                onClick={() => setLocation('/home')}
                className="spotify-btn-primary"
              >
                Discover Songs
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  return (
    <AuthenticatedOnly>
      <div className="min-h-screen spotify-bg pb-20">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLocation('/home')}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="spotify-heading-lg">Word Builder</h1>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[var(--spotify-green)] font-semibold text-lg">
                {progress.current}/{progress.total}
              </div>
              <div className="text-xs spotify-text-muted">
                completed
              </div>
            </div>
          </div>

          {/* Game Content */}
          {currentSentence && !isComplete && (
            <div className="max-w-4xl mx-auto">
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

          {/* Game Complete */}
          {isComplete && (
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
      </div>
    </AuthenticatedOnly>
  );
}