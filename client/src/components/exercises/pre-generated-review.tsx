import { useState, useRef, useEffect } from "react";
import { Music, CheckCircle, XCircle } from "lucide-react";

interface PreGeneratedReviewProps {
  exerciseData: {
    question: {
      id: string;
      word: string;
      correctAnswer: string;
      options: string[];
      vocabulary: any;
    };
  };
  onComplete: () => void;
}

export function PreGeneratedReview({ exerciseData, onComplete }: PreGeneratedReviewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const { question } = exerciseData;

  // Initialize audio
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        correctSoundRef.current = new Audio('/sounds/correct.wav');
        wrongSoundRef.current = new Audio('/sounds/wrong.wav');
        
        if (correctSoundRef.current && wrongSoundRef.current) {
          correctSoundRef.current.preload = 'auto';
          wrongSoundRef.current.preload = 'auto';
          correctSoundRef.current.volume = 0.5;
          wrongSoundRef.current.volume = 0.5;
          
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          const enableAudio = () => setIsAudioEnabled(true);
          
          if (isMobile) {
            const handleUserInteraction = () => {
              enableAudio();
              document.removeEventListener('touchstart', handleUserInteraction);
              document.removeEventListener('click', handleUserInteraction);
            };
            document.addEventListener('touchstart', handleUserInteraction, { once: true });
            document.addEventListener('click', handleUserInteraction, { once: true });
          } else {
            enableAudio();
          }
        }
      } catch (error) {
        console.log('Audio initialization failed:', error);
        setIsAudioEnabled(true);
      }
    };

    initializeAudio();

    return () => {
      if (correctSoundRef.current) {
        correctSoundRef.current.pause();
        correctSoundRef.current = null;
      }
      if (wrongSoundRef.current) {
        wrongSoundRef.current.pause();
        wrongSoundRef.current = null;
      }
    };
  }, []);

  // Play sound effects
  const playSound = (isCorrect: boolean) => {
    if (!isAudioEnabled) return;

    try {
      const audio = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
      if (audio) {
        audio.currentTime = 0;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log(`${isCorrect ? 'Correct' : 'Wrong'} sound played successfully`);
            })
            .catch(error => {
              console.log('Audio play failed:', error);
            });
        }
      }
    } catch (error) {
      console.log('Sound effect error:', error);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setIsAnswered(true);

    const isCorrect = answer === question.correctAnswer;
    playSound(isCorrect);

    // Auto-advance after showing result
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  return (
    <div className="review spotify-card p-4 max-h-[870px]:p-3 sm:p-6 mb-4 max-h-[870px]:mb-3 sm:mb-6">
      <div className="mb-4 max-h-[870px]:mb-3 sm:mb-6">
        <div className="flex items-center justify-between mb-3 max-h-[870px]:mb-2 sm:mb-4">
          <div className="flex items-center space-x-2">
            <Music size={18} className="text-[var(--spotify-green)] max-h-[870px]:w-4 max-h-[870px]:h-4" />
            <span className="spotify-text-muted text-sm">From: {question.vocabulary?.songName || 'Mixed Exercise'}</span>
          </div>
          {question.vocabulary?.difficulty && (
            <div className="inline-flex items-center px-2 max-h-[870px]:px-1.5 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-xs max-h-[870px]:text-[10px] font-medium">
              {question.vocabulary.difficulty}
            </div>
          )}
        </div>
        <h2 className="spotify-text-primary text-center text-2xl font-bold mt-3 max-h-[870px]:mt-2 sm:mt-4">
          What does "{question.word}" mean?
        </h2>
        {question.vocabulary?.context && (
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
                onClick={() => handleAnswerSelect(option)}
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
              
              <div className="flex flex-col items-center">
                <div className="spotify-text-muted text-sm max-h-[870px]:text-xs mb-2 max-h-[870px]:mb-1">
                  Next exercise in 1.5s...
                </div>
                <div className="w-24 max-h-[870px]:w-20 h-1 bg-[var(--spotify-light-gray)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--spotify-green)] animate-[progress_1.5s_linear_forwards]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}