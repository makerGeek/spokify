import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, RotateCcw, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import AuthenticatedOnly from "@/components/authenticated-only";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { useMixSession } from "@/hooks/use-mix-session";
import { MixExerciseComponent } from "@/components/exercises/mix-exercise";
import { type Vocabulary } from "@shared/schema";

export default function ExerciseMix() {
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
    exercises,
    currentExercise,
    currentExerciseIndex,
    progress,
    isSessionComplete,
    isLoading: sessionLoading,
    completeCurrentExercise,
    resetSession
  } = useMixSession({
    vocabulary: vocabulary || [],
    totalExercises: 10 // Mix of 10 different exercises
  });

  const handleNewSession = () => {
    resetSession();
  };

  if (isLoading || sessionLoading) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Creating your mixed exercise session...</p>
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
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
            </div>

            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="spotify-heading-md mb-2">Need More Vocabulary</h2>
              <p className="spotify-text-muted mb-6">
                You need at least 5 vocabulary words to start a mixed exercise session. Learn more songs to unlock this feature!
              </p>
              <button
                onClick={() => window.history.back()}
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

  if (!exercises || exercises.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </button>
            </div>

            <div className="text-center py-16">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="spotify-heading-md mb-2">Cannot Create Session</h2>
              <p className="spotify-text-muted mb-6">
                Your vocabulary doesn't meet the requirements for mixed exercises. Try learning more songs with different types of content!
              </p>
              <button
                onClick={() => window.history.back()}
                className="spotify-btn-primary"
              >
                Back to Home
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
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="spotify-heading-lg">Mixed Exercises</h1>
            </div>
            <div className="w-8"></div> {/* Spacer for centering */}
          </div>

          {/* Top progress (page-level) */}
          {!isSessionComplete && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm spotify-text-muted"></span>
                <span className="text-sm spotify-text-muted"></span>
              </div>
              <div className="w-full bg-[var(--spotify-light-gray)] rounded-full h-2">
                <div
                  className="bg-[var(--spotify-green)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Current Exercise */}
          {currentExercise && !isSessionComplete && (
            <MixExerciseComponent
              exercise={currentExercise}
              targetLanguage={targetLanguage}
              onComplete={completeCurrentExercise}
              progress={progress}
              hideInternalProgress
            />
          )}

          {/* Session Complete */}
          {isSessionComplete && (
            <div className="text-center py-8">
              <div className="spotify-card p-8 max-w-md mx-auto">
                <Trophy className="mx-auto spotify-text-accent mb-4" size={64} />
                <h2 className="spotify-heading-md mb-4">Session Complete! 🎉</h2>
                
                <div className="mb-6">
                  <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                    Complete
                  </div>
                  <div className="spotify-text-muted mb-4">
                    exercises completed
                  </div>
                  
                  {/* Exercise type breakdown */}
                  <div className="text-sm spotify-text-muted mb-4">
                    <p>You practiced:</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {Object.entries(
                        exercises.reduce((acc, ex) => {
                          acc[ex.type] = (acc[ex.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <span key={type} className="px-2 py-1 bg-[var(--spotify-light-gray)] rounded-full text-xs">
                          {count}x {type.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="spotify-text-muted text-sm">
                    Great job mixing different exercise types! 🌟
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleNewSession}
                    className="flex items-center justify-center space-x-2 spotify-btn-primary"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>New Mix Session</span>
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