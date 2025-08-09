import { Trophy, RotateCcw, Home, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ReviewProgress } from "@/components/review/review-progress";
import { ReviewQuestionCard } from "@/components/review/review-question-card";
import { useReviewSession } from "@/hooks/use-review-session";
import { type Vocabulary } from "@shared/schema";

interface ReviewExerciseProps {
  vocabulary: Vocabulary[];
  maxQuestions?: number;
  mixMode?: boolean;
  onMixComplete?: () => void;
}

export function ReviewExercise({ vocabulary, maxQuestions = 10, mixMode = false, onMixComplete }: ReviewExerciseProps) {
  const [, setLocation] = useLocation();

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
    vocabulary,
    maxQuestions,
  });

  const handleNewSession = () => {
    resetSession();
  };

  // Auto-advance in mix mode when session completes
  useEffect(() => {
    if (mixMode && isSessionComplete && onMixComplete) {
      // Immediately advance to next exercise in mix mode
      onMixComplete();
    }
  }, [isSessionComplete, mixMode, onMixComplete]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - only show in regular mode */}
      {!mixMode && (
        <>
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
        </>
      )}

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

      {/* Session Complete Stats - only show in regular mode */}
      {isSessionComplete && !mixMode && (
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
  );
}