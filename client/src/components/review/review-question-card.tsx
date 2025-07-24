import { Music, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { type Vocabulary } from "@shared/schema";

interface ReviewQuestion {
  vocabulary: Vocabulary;
  correctAnswer: string;
  options: string[];
  sourceSong: string;
}

interface ReviewQuestionCardProps {
  question: ReviewQuestion;
  selectedAnswer: string | null;
  showResult: boolean;
  isAnswered: boolean;
  autoNext: boolean;
  onAnswerSelect: (answer: string) => void;
  onNextQuestion: () => void;
}

export function ReviewQuestionCard({
  question,
  selectedAnswer,
  showResult,
  isAnswered,
  autoNext,
  onAnswerSelect,
  onNextQuestion
}: ReviewQuestionCardProps) {
  return (
    <div className="spotify-card p-6 mb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Music size={20} className="text-[var(--spotify-green)]" />
            <span className="spotify-text-muted text-sm">From: {question.sourceSong}</span>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-xs font-medium">
            {question.vocabulary.difficulty}
          </div>
        </div>
        <h2 className="spotify-text-primary text-center text-2xl font-bold mt-4">
          What does "{question.vocabulary.word}" mean?
        </h2>
        {question.vocabulary.context && (
          <div className="text-center mt-3">
            <p className="spotify-text-muted text-sm italic">
              Context: "{question.vocabulary.context}"
            </p>
          </div>
        )}
      </div>
      
      <div>
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.correctAnswer;
            const showCorrectAnswer = showResult && isCorrect;
            const showWrongAnswer = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                className={`w-full text-center p-6 h-auto rounded-lg transition-all font-medium ${
                  showCorrectAnswer
                    ? "bg-green-600/20 border border-green-500 text-green-400"
                    : showWrongAnswer
                    ? "bg-red-600/20 border border-red-500 text-red-400"
                    : isSelected
                    ? "bg-[var(--spotify-green)]/20 border border-[var(--spotify-green)] text-[var(--spotify-green)]"
                    : isAnswered
                    ? "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary opacity-60 cursor-default"
                    : "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary hover:bg-[var(--spotify-border)] transition-colors"
                }`}
                onClick={() => onAnswerSelect(option)}
                disabled={isAnswered}
              >
                <span className="text-lg leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-6 pt-4 border-t border-[var(--spotify-border)]">
            <div className="text-center">
              {selectedAnswer === question.correctAnswer ? (
                <div className="text-green-400 mb-4">
                  <CheckCircle className="mx-auto mb-2" size={32} />
                  <p className="font-semibold spotify-text-primary">Correct! Well done!</p>
                </div>
              ) : (
                <div className="text-red-400 mb-4">
                  <XCircle className="mx-auto mb-2" size={32} />
                  <p className="font-semibold spotify-text-primary">
                    Incorrect. The correct answer is "{question.correctAnswer}"
                  </p>
                </div>
              )}
              
              {!autoNext && (
                <button
                  onClick={onNextQuestion}
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
  );
}