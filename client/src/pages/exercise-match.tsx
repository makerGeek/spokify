import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, RotateCcw, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import AuthenticatedOnly from "@/components/authenticated-only";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { useMatchingGame } from "@/hooks/use-matching-game";
import { MatchingCard } from "@/components/exercise/matching-card";
import { type Vocabulary } from "@shared/schema";

export default function ExerciseMatch() {
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

  // Filter vocabulary by selected language
  const vocabulary = useMemo(() => {
    if (!allVocabulary) return [];
    return allVocabulary.filter(word => word.language === targetLanguage);
  }, [allVocabulary, targetLanguage]);

  const {
    leftColumn,
    rightColumn,
    selectedLeft,
    selectedRight,
    matches,
    score,
    isGameComplete,
    wrongMatchIds,
    handleCardSelect,
    resetGame
  } = useMatchingGame({
    vocabulary: vocabulary || [],
    gameSize: 5
  });

  const handleNewGame = () => {
    resetGame();
  };

  if (isLoading) {
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

  if (!vocabulary || vocabulary.length < 5) {
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
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="spotify-heading-md mb-2">Need More Words</h2>
              <p className="spotify-text-muted mb-6">
                You need at least 5 vocabulary words to play the matching game. Keep learning to unlock this exercise!
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
                <h1 className="spotify-heading-lg">Matching Game</h1>
                <p className="spotify-text-muted">Match words with their translations</p>
              </div>
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

          {/* Game Content */}
          {!isGameComplete && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 gap-8">
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

          {/* Game Complete */}
          {isGameComplete && (
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
      </div>
    </AuthenticatedOnly>
  );
}