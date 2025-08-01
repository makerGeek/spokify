import { useQuery } from "@tanstack/react-query";
import { Music, Home, RotateCcw, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import AuthenticatedOnly from "@/components/authenticated-only";
import { ReviewProgress } from "@/components/review/review-progress";
import { ReviewQuestionCard } from "@/components/review/review-question-card";
import { useReviewSession } from "@/hooks/use-review-session";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { type Vocabulary } from "@shared/schema";

export default function Review() {
  const [, setLocation] = useLocation();
  const { user, databaseUser } = useAuth();

  const { data: vocabulary, isLoading } = useQuery<Vocabulary[]>({
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

  // Use review session hook with 10 question limit for practice mode
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
    maxQuestions: 10, // Limited to 10 words per session
  });

  // Handle starting a new session
  const handleNewSession = () => {
    resetSession();
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

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            <div className="text-center py-16">
              <Music className="mx-auto spotify-text-muted mb-4" size={64} />
              <h2 className="spotify-heading-md mb-2">No Vocabulary Yet</h2>
              <p className="spotify-text-muted mb-6">
                Start learning by tapping on words in song lyrics to build your vocabulary!
              </p>
              <button
                onClick={() => setLocation("/home")}
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
            <div>
              <h1 className="spotify-heading-lg">Vocabulary Review</h1>
              <p className="spotify-text-muted">Test your knowledge</p>
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
              onNextQuestion={handleNextQuestion}
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