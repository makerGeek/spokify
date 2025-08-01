import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ArrowLeft, Home, RotateCcw, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import AuthenticatedOnly from "@/components/authenticated-only";
import { ReviewProgress } from "@/components/review/review-progress";
import { ReviewQuestionCard } from "@/components/review/review-question-card";
import { useReviewSession } from "@/hooks/use-review-session";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { type Vocabulary } from "@shared/schema";

export default function ReviewSession() {
  const [, setLocation] = useLocation();
  const { user, databaseUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch due vocabulary for spaced repetition
  const { data: vocabulary, isLoading } = useQuery<Vocabulary[]>({
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
      <div className="min-h-screen spotify-bg pb-20">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="spotify-heading-lg">Spaced Repetition</h1>
                <p className="spotify-text-muted">Review due vocabulary</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[var(--spotify-green)] font-semibold text-lg">
                {score.total > 0 ? `${Math.round((score.correct / score.total) * 100)}%` : "0%"}
              </div>
              <div className="text-xs spotify-text-muted">
                {score.correct}/{score.total} correct
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <ReviewProgress 
            current={progress.current} 
            total={progress.total} 
            className="mb-6" 
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
            <div className="text-center py-8">
              <div className="spotify-card p-8 max-w-md mx-auto">
                <Trophy className="mx-auto spotify-text-accent mb-4" size={64} />
                <h2 className="spotify-heading-md mb-4">Session Complete!</h2>
                
                {/* Stats */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-[var(--spotify-green)] mb-2">
                    {score.total > 0 ? `${Math.round((score.correct / score.total) * 100)}%` : "0%"}
                  </div>
                  <div className="spotify-text-muted mb-4">
                    {score.correct} out of {score.total} correct
                  </div>
                  
                  {/* Performance message */}
                  <div className="spotify-text-muted text-sm">
                    {score.total > 0 && (
                      <>
                        {Math.round((score.correct / score.total) * 100) >= 80 && "Excellent work! 🎉"}
                        {Math.round((score.correct / score.total) * 100) >= 60 && Math.round((score.correct / score.total) * 100) < 80 && "Good job! Keep it up! 👍"}
                        {Math.round((score.correct / score.total) * 100) < 60 && "Keep practicing, you're getting there! 💪"}
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleNewSession}
                    className="flex items-center justify-center space-x-2 spotify-btn-primary"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Start Another Session</span>
                  </button>
                  <button
                    onClick={() => setLocation('/home')}
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