import { Music, CheckCircle, XCircle, ArrowRight } from "lucide-react";
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
    <div className="review spotify-card p-4 max-h-[870px]:p-3 sm:p-6 mb-4 max-h-[870px]:mb-3 sm:mb-6">
      <div className="mb-4 max-h-[870px]:mb-3 sm:mb-6">
        <div className="flex items-center justify-between mb-3 max-h-[870px]:mb-2 sm:mb-4">
          <div className="flex items-center space-x-2">
            <Music size={18} className="text-[var(--spotify-green)] max-h-[870px]:w-4 max-h-[870px]:h-4" />
            <span className="spotify-text-muted text-sm">From: {question.sourceSong}</span>
          </div>
          <div className="inline-flex items-center px-2 max-h-[870px]:px-1.5 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-xs max-h-[870px]:text-[10px] font-medium">
            {question.vocabulary.difficulty}
          </div>
        </div>
        <h2 className="spotify-text-primary text-center text-2xl font-bold mt-3 max-h-[870px]:mt-2 sm:mt-4">
          What does "{question.vocabulary.word}" mean?
        </h2>
        {question.vocabulary.context && (
          <div className="text-center mt-2 max-h-[870px]:mt-1 sm:mt-3">
            <p className="spotify-text-muted text-sm italic max-w-md mx-auto">
              Context: "{question.vocabulary.context}"
            </p>
          </div>
        )}
      </div>
      
      <div>
        <div className="grid grid-cols-2 gap-3 max-h-[870px]:gap-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.correctAnswer;
            const showCorrectAnswer = showResult && isCorrect;
            const showWrongAnswer = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                className={`review-choice-button w-full text-center p-6 max-h-[870px]:p-4 h-auto rounded-lg transition-all font-medium ${
                  showCorrectAnswer
                    ? "bg-green-600/20 border border-green-500 text-green-400"
                    : showWrongAnswer
                    ? "bg-red-600/20 border border-red-500 text-red-400"
                    : isSelected
                    ? "bg-[var(--spotify-green)]/20 border border-[var(--spotify-green)] text-[var(--spotify-green)]"
                    : isAnswered
                    ? "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary opacity-60 cursor-default"
                    : "bg-[var(--spotify-gray)] border border-[var(--spotify-border)] spotify-text-primary md:hover:bg-[var(--spotify-border)] transition-colors"
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
          <div className="mt-6 max-h-[870px]:mt-4 pt-4 max-h-[870px]:pt-3 border-t border-[var(--spotify-border)]">
            <div className="text-center">
              {selectedAnswer === question.correctAnswer ? (
                <div className="text-green-400 mb-4 max-h-[870px]:mb-3">
                  <CheckCircle className="mx-auto mb-2 max-h-[870px]:mb-1 hidden sm:block" size={32} />
                  <p className="font-semibold spotify-text-primary text-base max-h-[870px]:text-sm hidden sm:block">Correct! Well done!</p>
                </div>
              ) : (
                <div className="text-red-400 mb-4 max-h-[870px]:mb-3">
                  <XCircle className="mx-auto mb-2 max-h-[870px]:mb-1 hidden sm:block" size={32} />
                  <p className="font-semibold spotify-text-primary text-base max-h-[870px]:text-sm hidden sm:block">
                    Incorrect. The correct answer is "{question.correctAnswer}"
                  </p>
                </div>
              )}
              
              {!autoNext && (
                <button
                  onClick={onNextQuestion}
                  className="spotify-btn-primary inline-flex items-center text-base max-h-[870px]:text-sm px-4 max-h-[870px]:px-3 py-2 max-h-[870px]:py-1.5"
                >
                  Next Question
                  <ArrowRight size={16} className="ml-2 max-h-[870px]:w-4 max-h-[870px]:h-4" />
                </button>
              )}
              
              {autoNext && (
                <div className="flex flex-col items-center">
                  <div className="w-24 max-h-[870px]:w-20 h-1 bg-[var(--spotify-light-gray)] rounded-full overflow-hidden">
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