import { useState, useRef, useEffect } from "react";
import { CheckCircle, Music } from "lucide-react";
import { BlankInput } from "@/components/exercise/blank-input";

interface PreGeneratedFillBlanksProps {
  exerciseData: {
    textWithBlanks: (string | { blankIndex: number; answer: string })[];
    blanks: string[];
    hints: string[];
    songName: string;
    englishTranslation: string;
  };
  targetLanguage: string;
  onComplete: () => void;
}

export function PreGeneratedFillBlanks({ exerciseData, targetLanguage, onComplete }: PreGeneratedFillBlanksProps) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, boolean>>({});

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

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

  const handleAnswerChange = (blankIndex: number, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [blankIndex]: value
    }));
  };

  const handleSubmit = () => {
    const results: Record<number, boolean> = {};
    let correctCount = 0;

    exerciseData.textWithBlanks.forEach((part) => {
      if (typeof part !== 'string') {
        const userAnswer = userAnswers[part.blankIndex]?.toLowerCase().trim().replace(/[^\w\u00C0-\u017F]/g, '');
        const correctAnswer = part.answer.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '');
        const isAnswerCorrect = userAnswer === correctAnswer;
        
        results[part.blankIndex] = isAnswerCorrect;
        if (isAnswerCorrect) correctCount++;
      }
    });

    const allCorrect = correctCount === exerciseData.blanks.length;
    
    setCorrectAnswers(results);
    setShowResults(true);
    setIsCorrect(allCorrect);
    
    playSound(allCorrect);
    
    if (allCorrect) {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  const tryAgain = () => {
    setUserAnswers({});
    setShowResults(false);
    setCorrectAnswers({});
    setIsCorrect(false);
  };

  return (
    <div>
      {/* Song info */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 spotify-text-muted text-sm">
          <Music size={18} className="text-[var(--spotify-green)]" />
          <span>From: {exerciseData.songName}</span>
        </div>
      </div>

      {/* Exercise card */}
      <div className="spotify-card p-6 mb-8">
        <div className="text-center mb-6">
          <p className="spotify-text-muted text-sm mb-2">
            Complete the {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : 'target language'} lyrics:
          </p>
        </div>

        {/* Lyrics with blanks */}
        <div className="text-center text-lg leading-relaxed spotify-text-primary">
          {exerciseData.textWithBlanks.map((part, index) => (
            <span key={index}>
              {typeof part === 'string' ? (
                part
              ) : (
                <BlankInput
                  key={`blank-${index}`}
                  value={userAnswers[part.blankIndex] || ''}
                  placeholder="..."
                  isCorrect={showResults ? (correctAnswers[part.blankIndex] ? true : false) : null}
                  correctAnswer={showResults ? part.answer : undefined}
                  onChange={(value) => handleAnswerChange(part.blankIndex, value)}
                  disabled={showResults}
                />
              )}
            </span>
          ))}
        </div>

        {/* Word hints */}
        {exerciseData.hints.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[var(--spotify-border)]">
            <p className="text-center spotify-text-muted text-sm mb-3">Word bank:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exerciseData.hints.map((hint, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Find the first empty blank and fill it
                    const emptyBlankIndex = exerciseData.blanks.findIndex((_, blankIdx) => 
                      !userAnswers[blankIdx]
                    );
                    if (emptyBlankIndex !== -1) {
                      handleAnswerChange(emptyBlankIndex, hint);
                    }
                  }}
                  disabled={showResults}
                  className="px-3 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-secondary text-sm hover:bg-[var(--spotify-border)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      {!showResults && (
        <div className="text-center mb-6">
          <button
            onClick={handleSubmit}
            className="spotify-btn-primary"
            disabled={Object.keys(userAnswers).length === 0}
          >
            Check Answers
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="text-center mb-6">
          {isCorrect ? (
            <div className="text-green-400 mb-4">
              <CheckCircle className="mx-auto mb-2" size={32} />
              <p className="spotify-text-primary font-semibold">Excellent! All correct!</p>
            </div>
          ) : (
            <div className="text-orange-400 mb-4">
              <p className="spotify-text-primary font-semibold">
                {Object.values(correctAnswers).filter(Boolean).length} out of {exerciseData.blanks.length} correct
              </p>
            </div>
          )}
          
          {/* English translation */}
          <div className="mb-6 p-4 bg-[var(--spotify-light-gray)] rounded-lg">
            <p className="spotify-text-muted text-sm mb-2">English translation:</p>
            <p className="spotify-text-primary italic">"{exerciseData.englishTranslation}"</p>
          </div>
          
          {!isCorrect && (
            <button
              onClick={tryAgain}
              className="spotify-btn-secondary"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}