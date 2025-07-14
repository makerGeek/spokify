import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      sourceSong: randomVocab.context || "Unknown Song"
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
        <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4"></div>
            <p className="text-spotify-muted">Loading vocabulary...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen bg-spotify-bg pb-20">
          <div className="p-6">
            <div className="text-center py-16">
              <Music className="mx-auto text-spotify-muted mb-4" size={64} />
              <h2 className="text-xl font-semibold text-spotify-text mb-2">No Vocabulary Yet</h2>
              <p className="text-spotify-muted mb-6">
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
      <div className="min-h-screen bg-spotify-bg pb-20">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-spotify-text">Vocabulary Review</h1>
              <p className="text-spotify-muted">Test your knowledge</p>
            </div>
            <div className="text-right">
              <div className="text-spotify-green font-semibold">
                {score.total > 0 ? `${Math.round((score.correct / score.total) * 100)}%` : "0%"}
              </div>
              <div className="text-xs text-spotify-muted">
                {score.correct}/{score.total} correct
              </div>
            </div>
          </div>

          {currentQuestion && (
            <Card className="bg-spotify-card border-spotify-muted mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Music size={20} className="text-spotify-green" />
                    <span className="text-spotify-muted text-sm">From: {currentQuestion.sourceSong}</span>
                  </div>
                  <Badge variant="outline" className="text-spotify-muted border-spotify-muted">
                    {currentQuestion.vocabulary.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-spotify-text text-center text-2xl mt-4">
                  What does "{currentQuestion.vocabulary.word}" mean?
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                            ? "bg-spotify-green/20 border border-spotify-green text-spotify-green"
                            : "bg-spotify-card border border-spotify-muted text-spotify-text hover:bg-spotify-card/80 hover:border-spotify-text/30"
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
                  <div className="mt-6 pt-4 border-t border-spotify-muted">
                    <div className="text-center">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="text-green-400 mb-4">
                          <CheckCircle className="mx-auto mb-2" size={32} />
                          <p className="font-semibold">Correct! Well done!</p>
                        </div>
                      ) : (
                        <div className="text-red-400 mb-4">
                          <XCircle className="mx-auto mb-2" size={32} />
                          <p className="font-semibold">
                            Incorrect. The correct answer is "{currentQuestion.correctAnswer}"
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={generateQuestion}
                        className="spotify-btn-primary inline-flex items-center"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Next Question
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedOnly>
  );
}