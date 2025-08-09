import { useState, useRef, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { WordTile } from "@/components/exercise/word-tile";
import { DropZone } from "@/components/exercise/drop-zone";

interface PreGeneratedWordBuilderProps {
  exerciseData: {
    englishSentence: string;
    targetSentence: string;
    scrambledWords: string[];
    correctWords: string[];
    gameMode: 'build-target' | 'build-english';
  };
  targetLanguage: string;
  onComplete: () => void;
}

export function PreGeneratedWordBuilder({ exerciseData, targetLanguage, onComplete }: PreGeneratedWordBuilderProps) {
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);

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

  // Get available words (not yet used in built sentence)
  const availableWords = exerciseData.scrambledWords.filter(word => !builtSentence.includes(word));

  const handleDragStart = (word: string) => {
    setDraggedWord(word);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
  };

  const handleDrop = (word: string) => {
    if (!exerciseData.scrambledWords.includes(word) || builtSentence.includes(word)) return;
    
    setBuiltSentence(prev => [...prev, word]);
    setIsCorrect(null);
  };

  const handleWordClick = (word: string) => {
    handleDrop(word);
  };

  const handleRemoveWord = (index: number) => {
    setBuiltSentence(prev => prev.filter((_, i) => i !== index));
    setIsCorrect(null);
  };

  const checkSentence = () => {
    if (builtSentence.length === 0) return;
    
    // Compare built sentence with correct words
    const correctWords = exerciseData.correctWords.map(w => w.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, ''));
    const builtWords = builtSentence.map(w => w.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, ''));
    
    const isCorrectSentence = correctWords.length === builtWords.length && 
      correctWords.every((word, index) => word === builtWords[index]);
    
    setIsCorrect(isCorrectSentence);
    playSound(isCorrectSentence);
    
    if (isCorrectSentence) {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  const tryAgain = () => {
    setBuiltSentence([]);
    setIsCorrect(null);
  };

  return (
    <div>
      {/* Game mode and sentence to rebuild */}
      <div className="text-center mb-8">
        <div className="spotify-card p-4 bg-[var(--spotify-light-gray)]">
          {exerciseData.gameMode === 'build-target' ? (
            <>
              <p className="spotify-text-muted text-sm mb-2">
                Build this in {targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : 'target language'}:
              </p>
              <p className="spotify-text-primary text-lg font-medium">
                "{exerciseData.englishSentence}"
              </p>
            </>
          ) : (
            <>
              <p className="spotify-text-muted text-sm mb-2">Build this in English:</p>
              <p className="spotify-text-primary text-lg font-medium">
                "{exerciseData.targetSentence}"
              </p>
            </>
          )}
        </div>
      </div>

      {/* Drop zone for building sentence */}
      <div className="mb-8">
        <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
          Your sentence:
        </h3>
        <DropZone
          words={builtSentence}
          onDrop={handleDrop}
          onRemoveWord={handleRemoveWord}
          isCorrect={isCorrect}
        />
      </div>

      {/* Word tiles */}
      <div className="mb-8">
        <h3 className="text-center spotify-text-muted text-sm font-medium mb-4">
          Available words:
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {availableWords.map((word, index) => (
            <WordTile
              key={`${word}-${index}`}
              word={word}
              isDragging={draggedWord === word}
              onDragStart={() => handleDragStart(word)}
              onDragEnd={handleDragEnd}
              onClick={() => handleWordClick(word)}
            />
          ))}
        </div>
      </div>

      {/* Check button */}
      {builtSentence.length > 0 && isCorrect === null && (
        <div className="text-center mb-6">
          <button
            onClick={checkSentence}
            className="spotify-btn-primary"
          >
            Check Sentence
          </button>
        </div>
      )}

      {/* Result feedback */}
      {isCorrect !== null && (
        <div className="text-center mb-6">
          {isCorrect ? (
            <div className="text-green-400 mb-4">
              <CheckCircle className="mx-auto mb-2" size={32} />
              <p className="spotify-text-primary font-semibold">Perfect! Well done!</p>
            </div>
          ) : (
            <div className="text-red-400 mb-4">
              <p className="spotify-text-primary font-semibold mb-2">
                Not quite right. The correct answer is:
              </p>
              <p className="spotify-text-muted italic">
                "{exerciseData.correctWords.join(' ')}"
              </p>
            </div>
          )}
          
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