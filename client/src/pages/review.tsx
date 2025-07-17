import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, XCircle, Music } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AuthenticatedOnly from "@/components/authenticated-only";
import { useAuth } from "@/contexts/auth-context";
import { authenticatedApiRequest } from "@/lib/authenticated-fetch";
import { type Vocabulary } from "@shared/schema";

interface ReviewQuestion {
  vocabulary: Vocabulary;
  correctAnswer: string;
  options: string[];
  sourceSong: string;
}

export default function Review() {
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isAnswered, setIsAnswered] = useState(false);
  const [autoNext, setAutoNext] = useState(() => {
    const saved = localStorage.getItem('reviewAutoNext');
    return saved ? JSON.parse(saved) : false;
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user, databaseUser } = useAuth();

  const { data: vocabulary, isLoading, refetch } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return authenticatedApiRequest<Vocabulary[]>(`/api/users/${databaseUser.id}/vocabulary`);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user
  });

  // Generate random incorrect answers for multiple choice
  const generateIncorrectAnswers = (correctAnswer: string, allVocab: Vocabulary[]): string[] => {
    const otherTranslations = allVocab
      .filter(v => v.translation !== correctAnswer && v.translation)
      .map(v => v.translation);
    
    // If we don't have enough vocabulary, use some generic wrong answers
    const genericWrongAnswers = [
      "to sing", "to dance", "to walk", "to eat", "to drink", "to sleep",
      "happy", "sad", "beautiful", "fast", "slow", "big", "small",
      "house", "car", "book", "music", "love", "friend", "family"
    ].filter(answer => answer !== correctAnswer);

    const availableWrong = [...otherTranslations, ...genericWrongAnswers];
    
    // Shuffle and take 3 random wrong answers
    const shuffled = availableWrong.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  // Generate a new question
  const generateQuestion = () => {
    if (!vocabulary || vocabulary.length === 0) return;

    const randomVocab = vocabulary[Math.floor(Math.random() * vocabulary.length)];
    const incorrectAnswers = generateIncorrectAnswers(randomVocab.translation, vocabulary);
    
    // Create options array with correct answer and 3 wrong answers
    const options = [randomVocab.translation, ...incorrectAnswers];
    // Shuffle the options
    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    setCurrentQuestion({
      vocabulary: randomVocab,
      correctAnswer: randomVocab.translation,
      options: shuffledOptions,
      sourceSong: randomVocab.songName || "Unknown Song"
    });
    
    setSelectedAnswer(null);
    setShowResult(false);
    setIsAnswered(false);
  };

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setShowResult(true);
    
    // Update score
    const isCorrect = answer === currentQuestion?.correctAnswer;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    // Auto next functionality
    if (autoNext) {
      timeoutRef.current = setTimeout(() => {
        generateQuestion();
      }, 2000);
    }
  };

  // Cleanup timeout on unmount or when generating new question
  const cleanupTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Update generate question to cleanup timeout
  const handleGenerateQuestion = () => {
    cleanupTimeout();
    generateQuestion();
  };

  // Start with first question when vocabulary loads
  useEffect(() => {
    if (vocabulary && vocabulary.length > 0 && !currentQuestion) {
      generateQuestion();
    }
  }, [vocabulary, currentQuestion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      cleanupTimeout();
    };
  }, []);

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
                onClick={() => window.location.href = "/home"}
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



          {currentQuestion && (
            <div className="spotify-card p-6 mb-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Music size={20} className="text-[var(--spotify-green)]" />
                    <span className="spotify-text-muted text-sm">From: {currentQuestion.sourceSong}</span>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-xs font-medium">
                    {currentQuestion.vocabulary.difficulty}
                  </div>
                </div>
                <h2 className="spotify-text-primary text-center text-2xl font-bold mt-4">
                  What does "{currentQuestion.vocabulary.word}" mean?
                </h2>
                {currentQuestion.vocabulary.context && (
                  <div className="text-center mt-3">
                    <p className="spotify-text-muted text-sm italic">
                      Context: "{currentQuestion.vocabulary.context}"
                    </p>
                  </div>
                )}
              </div>
              <div>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correctAnswer;
                    const showCorrectAnswer = showResult && isCorrect;
                    const showWrongAnswer = showResult && isSelected && !isCorrect;

                    return (
                      <button
                        key={index}
                        className={`w-full text-left p-4 h-auto rounded-lg transition-all font-medium ${
                          showCorrectAnswer
                            ? "bg-green-600/20 border border-green-500 text-green-400"
                            : showWrongAnswer
                            ? "bg-red-600/20 border border-red-500 text-red-400"
                            : isSelected
                            ? "bg-[var(--spotify-green)]/20 border border-[var(--spotify-green)] text-[var(--spotify-green)]"
                            : isAnswered
                            ? "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary opacity-60 cursor-default"
                            : "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary"
                        }`}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isAnswered}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-base">{option}</span>
                          {showResult && (
                            <>
                              {isCorrect && <CheckCircle size={20} className="text-green-400" />}
                              {showWrongAnswer && <XCircle size={20} className="text-red-400" />}
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showResult && (
                  <div className="mt-6 pt-4 border-t border-[var(--spotify-border)]">
                    <div className="text-center">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="text-green-400 mb-4">
                          <CheckCircle className="mx-auto mb-2" size={32} />
                          <p className="font-semibold spotify-text-primary">Correct! Well done!</p>
                        </div>
                      ) : (
                        <div className="text-red-400 mb-4">
                          <XCircle className="mx-auto mb-2" size={32} />
                          <p className="font-semibold spotify-text-primary">
                            Incorrect. The correct answer is "{currentQuestion.correctAnswer}"
                          </p>
                        </div>
                      )}
                      
                      {!autoNext && (
                        <button
                          onClick={handleGenerateQuestion}
                          className="spotify-btn-primary inline-flex items-center"
                        >
                          <RefreshCw size={16} className="mr-2" />
                          Next Question
                        </button>
                      )}
                      
                      {autoNext && (
                        <div className="flex flex-col items-center">
                          <div className="spotify-text-muted text-sm mb-2">
                            Next question in 2s...
                          </div>
                          <div className="w-24 h-1 bg-[var(--spotify-light-gray)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--spotify-green)] animate-[progress_2s_linear_forwards]"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedOnly>
  );
}