import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, XCircle, Music } from "lucide-react";
import AuthenticatedOnly from "@/components/authenticated-only";
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
  const [animatingAnswer, setAnimatingAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Audio refs for sound effects
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);

  const { data: vocabulary, isLoading, refetch } = useQuery<Vocabulary[]>({
    queryKey: ["/api/users/1/vocabulary"], // TODO: Use actual user ID from auth
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
    
    // Reset all animation states
    setSelectedAnswer(null);
    setShowResult(false);
    setIsAnswered(false);
    setAnimatingAnswer(null);
    setShowFeedback(false);
  };

  // Create audio elements for sound effects
  useEffect(() => {
    // Create correct answer sound (high-pitched bell-like sound)
    const correctAudio = new Audio();
    correctAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMecj2a4faydAT2h8Xw1oMMAi+A0fPejjwIHm+/8+CSSA==';
    correctSoundRef.current = correctAudio;
    
    // Create incorrect answer sound (lower-pitched buzz)
    const incorrectAudio = new Audio();
    incorrectAudio.src = 'data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQDAAC1hYuFbV1heJitrI9hOTZfodHcq2IcBz2Z2vPBdSUELYDO89eINwgZab3s5Z9NEAxRp+Txs2MeBTiP2PLNeSsFJXfH8N2QQAoUXrTo7KhUFAlGnuDyvGMecz2Y4vWydAX2h8Tw2IMMAi+A0fPfjAoMNWq58OKXSwkRVKzm8K1gHA==';
    incorrectSoundRef.current = incorrectAudio;
  }, []);

  // Handle answer selection with Duolingo-style animations
  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setAnimatingAnswer(answer);
    
    // Quick animation delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setIsAnswered(true);
    const isCorrect = answer === currentQuestion?.correctAnswer;
    
    // Play sound effect
    try {
      if (isCorrect && correctSoundRef.current) {
        correctSoundRef.current.currentTime = 0;
        correctSoundRef.current.play().catch(() => {}); // Ignore autoplay restrictions
      } else if (!isCorrect && incorrectSoundRef.current) {
        incorrectSoundRef.current.currentTime = 0;
        incorrectSoundRef.current.play().catch(() => {}); // Ignore autoplay restrictions
      }
    } catch (error) {
      // Sound might be blocked by browser, continue without sound
    }
    
    // Show result with animation delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setShowResult(true);
    setShowFeedback(true);
    
    // Update score
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
    
    // Reset animation state
    setTimeout(() => {
      setAnimatingAnswer(null);
    }, 600);
  };

  // Start with first question when vocabulary loads
  useEffect(() => {
    if (vocabulary && vocabulary.length > 0 && !currentQuestion) {
      generateQuestion();
    }
  }, [vocabulary, currentQuestion]);

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
                        className={`w-full text-left p-4 h-auto rounded-lg font-medium transition-all duration-300 transform ${
                          animatingAnswer === option
                            ? "scale-95 transition-transform duration-100"
                            : showCorrectAnswer
                            ? "bg-green-500/90 border-2 border-green-400 text-white scale-105 shadow-lg animate-pulse"
                            : showWrongAnswer
                            ? "bg-red-500/90 border-2 border-red-400 text-white scale-95 animate-shake"
                            : isSelected
                            ? "bg-[var(--spotify-green)]/20 border border-[var(--spotify-green)] text-[var(--spotify-green)] scale-105"
                            : "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary hover:bg-[var(--spotify-light-gray)] hover:border-[var(--spotify-border-hover)] hover:scale-102"
                        }`}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isAnswered}
                        style={{
                          transition: showResult 
                            ? 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)' 
                            : 'all 0.2s ease'
                        }}
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
                  <div className="mt-6 pt-4 border-t border-[var(--spotify-border)] animate-slide-up">
                    <div className="text-center">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="text-green-400 mb-4 animate-bounce-in">
                          <div className="relative">
                            <CheckCircle className="mx-auto mb-2 text-green-400" size={48} />
                            <div className="absolute inset-0 bg-green-400/20 rounded-full mx-auto mb-2 w-12 h-12 animate-ping"></div>
                          </div>
                          <p className="font-bold text-lg spotify-text-primary bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                            Excellent! 🎉
                          </p>
                          <p className="text-sm spotify-text-muted mt-1">You got it right!</p>
                        </div>
                      ) : (
                        <div className="text-red-400 mb-4 animate-bounce-in">
                          <div className="relative">
                            <XCircle className="mx-auto mb-2 text-red-400" size={48} />
                            <div className="absolute inset-0 bg-red-400/20 rounded-full mx-auto mb-2 w-12 h-12 animate-ping"></div>
                          </div>
                          <p className="font-bold text-lg spotify-text-primary bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
                            Not quite right
                          </p>
                          <p className="text-sm spotify-text-muted mt-1">
                            The correct answer is: <span className="text-[var(--spotify-green)] font-semibold">"{currentQuestion.correctAnswer}"</span>
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={generateQuestion}
                        className="spotify-btn-primary inline-flex items-center mt-4 hover:scale-105 transition-transform duration-200"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        {selectedAnswer === currentQuestion.correctAnswer ? "Continue" : "Try Another"}
                      </button>
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