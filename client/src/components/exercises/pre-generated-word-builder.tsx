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
  
  // Create word counts from scrambled words
  const [wordCounts, setWordCounts] = useState<Record<string, number>>(() => {
    console.log('Initializing wordCounts from scrambledWords:', exerciseData.scrambledWords);
    const counts: Record<string, number> = {};
    exerciseData.scrambledWords.forEach(word => {
      counts[word] = (counts[word] || 0) + 1;
    });
    console.log('Initial wordCounts:', counts);
    return counts;
  });

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

  const handleWordClick = (word: string) => {
    console.log('Clicked word:', word);
    console.log('Current wordCounts:', wordCounts);
    console.log('Available count for this word:', wordCounts[word]);
    
    // Check if we have this word available
    if (wordCounts[word] <= 0) {
      console.log('Word not available, count is:', wordCounts[word]);
      return;
    }
    
    // Add word to built sentence and decrease its count
    setBuiltSentence(prev => {
      console.log('Adding to built sentence. Previous:', prev);
      const newSentence = [...prev, word];
      console.log('New built sentence:', newSentence);
      return newSentence;
    });
    
    setWordCounts(prev => {
      console.log('Updating word counts. Previous:', prev);
      const newCounts = {
        ...prev,
        [word]: prev[word] - 1
      };
      console.log('New word counts:', newCounts);
      return newCounts;
    });
    
    setIsCorrect(null);
  };

  const handleRemoveWord = (index: number) => {
    // Get the word being removed and increase its count
    const removedWord = builtSentence[index];
    setBuiltSentence(prev => prev.filter((_, i) => i !== index));
    setWordCounts(prev => ({
      ...prev,
      [removedWord]: prev[removedWord] + 1
    }));
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
    // Reset word counts to original state
    const counts: Record<string, number> = {};
    exerciseData.scrambledWords.forEach(word => {
      counts[word] = (counts[word] || 0) + 1;
    });
    setWordCounts(counts);
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
          {Object.entries(wordCounts).map(([word, count]) => {
            // Render each instance of the word
            const usedCount = builtSentence.filter(w => w === word).length;
            const totalToRender = count + usedCount;
            console.log(`Rendering word "${word}": available=${count}, used=${usedCount}, total=${totalToRender}`);
            
            return Array.from({ length: totalToRender }, (_, index) => {
              const isAvailable = index < count;
              return (
                <div key={`${word}-${index}`} className="inline-block">
                  {isAvailable ? (
                    <WordTile
                      word={word}
                      onClick={() => handleWordClick(word)}
                    />
                  ) : (
                    <div className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-600 text-transparent select-none cursor-default">
                      {word}
                    </div>
                  )}
                </div>
              );
            });
          })}
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