import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ArrowLeft, Home, RotateCcw, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import AuthenticatedOnly from "@/components/authenticated-only";
import { ReviewProgress } from "@/components/review/review-progress";
import { ReviewQuestionCard } from "@/components/review/review-question-card";
import { useReviewSession } from "@/hooks/use-review-session";
import { useAuth } from "@/contexts/auth-context";
import { useActivityTracking } from "@/hooks/use-activity-tracking";
import { api } from "@/lib/api-client";
import { type Vocabulary } from "@shared/schema";

export default function ReviewSession() {
  const [, setLocation] = useLocation();
  const { user, databaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { trackVocabularyReview } = useActivityTracking();

  // Get user's target language from preferences (same as in library and header)
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}"
  );
  const { targetLanguage = "es" } = userPreferences;

  // Fetch due vocabulary for spaced repetition
  const { data: allDueVocabulary, isLoading } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary", "due"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getDueVocabulary(databaseUser.id);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter due vocabulary by selected language
  const vocabulary = useMemo(() => {
    if (!allDueVocabulary) return [];
    return allDueVocabulary.filter(word => word.language === targetLanguage);
  }, [allDueVocabulary, targetLanguage]);

  // Submit review mutation for spaced repetition
  const submitReviewMutation = useMutation({
    mutationFn: async ({ vocabularyId, answer }: { vocabularyId: number; answer: string }) => {
      return api.vocabulary.submitReview(vocabularyId, answer);
    },
    // Don't invalidate queries during session - wait until session is complete
    // This prevents the vocabulary data from reloading and resetting the session
  });

  // Handle answer submission for spaced repetition
  const handleAnswerSubmit = async (vocabularyId: number, answer: string) => {
    await submitReviewMutation.mutateAsync({ vocabularyId, answer });
    // Track vocabulary review activity for streak
    await trackVocabularyReview(1);
  };

  // Use review session hook with 10 word limit
  const {
    currentQuestion,
    selectedAnswer,
    showResult,
    score,
    isAnswered,
    autoNext,
    progress,
    isSessionComplete,
    handleAnswerSelect,
    handleNextQuestion,
    resetSession,
    setAutoNext
  } = useReviewSession({
    vocabulary: vocabulary || [],
    maxQuestions: 10,
    onAnswerSubmit: handleAnswerSubmit
  });

  // Handle next question with session completion check
  const handleNext = () => {
    const result = handleNextQuestion();
    // Note: We'll now show completion stats instead of auto-redirecting
  };

  // Handle starting a new session
  const handleNewSession = () => {
    // Reset the invalidation flag
    setHasInvalidatedQueries(false);
    // Invalidate the due query to get fresh vocabulary
    if (databaseUser?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary", "due"] });
    }
    resetSession();
  };

  // Track if we've already invalidated queries to prevent multiple invalidations
  const [hasInvalidatedQueries, setHasInvalidatedQueries] = React.useState(false);

  // Invalidate queries when session completes to update vocabulary stats
  React.useEffect(() => {
    if (isSessionComplete && databaseUser?.id && !hasInvalidatedQueries) {
      setHasInvalidatedQueries(true);
      // Delay the invalidation to allow the completion screen to show
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary"] });
        // Invalidate streak data to update streak counter
        queryClient.invalidateQueries({ queryKey: ["/api/activity/streak"] });
        // Don't invalidate the "due" query to prevent resetting the session
      }, 100);
    }
  }, [isSessionComplete, databaseUser?.id, hasInvalidatedQueries, queryClient]);

  if (isLoading) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Loading due vocabulary...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Library</span>
              </button>
            </div>

            <div className="text-center py-16">
              <CheckCircle className="mx-auto spotify-text-accent mb-4" size={64} />
              <h2 className="spotify-heading-md mb-2">All Caught Up!</h2>
              <p className="spotify-text-muted mb-6">
                No vocabulary words are due for review right now. Come back later to continue your learning journey!
              </p>
              <button
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="spotify-btn-primary"
              >
                Back to Vocabulary
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  return (
    <AuthenticatedOnly>
      <div className="min-h-screen spotify-bg pb-20 max-h-[870px]:pb-16">
        <div className="p-6 max-h-[870px]:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 max-h-[870px]:mb-4">
            <div className="flex items-center space-x-4 max-h-[870px]:space-x-3">
              <div>
                <h1 className="spotify-heading-lg max-h-[870px]:text-lg max-h-[870px]:font-bold">Spaced Repetition</h1>
                <p className="spotify-text-muted text-sm max-h-[870px]:text-xs">Review due vocabulary</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <ReviewProgress 
            current={progress.current} 
            total={progress.total} 
            className="mb-6 max-h-[870px]:mb-4" 
          />

          {/* Question Card */}
          {currentQuestion && !isSessionComplete && (
            <ReviewQuestionCard
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              showResult={showResult}
              isAnswered={isAnswered}
              autoNext={autoNext}
              onAnswerSelect={handleAnswerSelect}
              onNextQuestion={handleNext}
            />
          )}

          {/* Session Complete Stats */}
          {isSessionComplete && (
            <div className="text-center py-8 max-h-[870px]:py-6">
              <div className="spotify-card p-8 max-h-[870px]:p-6 max-w-md mx-auto">
                <Trophy className="mx-auto spotify-text-accent mb-4 max-h-[870px]:mb-3" size={64} />
                <h2 className="spotify-heading-md max-h-[870px]:text-lg max-h-[870px]:font-bold mb-4 max-h-[870px]:mb-3">Session Complete!</h2>
                

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 max-h-[870px]:gap-2 justify-center">
                  <button
                    onClick={handleNewSession}
                    className="flex items-center justify-center space-x-2 spotify-btn-primary text-sm max-h-[870px]:text-xs px-4 max-h-[870px]:px-3 py-2 max-h-[870px]:py-1.5"
                  >
                    <RotateCcw className="h-4 w-4 max-h-[870px]:h-3 max-h-[870px]:w-3" />
                    <span>Start Another Session</span>
                  </button>
                  <button
                    onClick={() => setLocation('/home')}
                    className="flex items-center justify-center space-x-2 spotify-btn-secondary text-sm max-h-[870px]:text-xs px-4 max-h-[870px]:px-3 py-2 max-h-[870px]:py-1.5"
                  >
                    <Home className="h-4 w-4 max-h-[870px]:h-3 max-h-[870px]:w-3" />
                    
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