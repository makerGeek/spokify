import { useState, useEffect, useRef } from "react";
import { type Vocabulary } from "@shared/schema";
import { api } from "@/lib/api-client";

interface BlankInfo {
  blankIndex: number;
  answer: string;
}

interface ExerciseData {
  textWithBlanks: (string | BlankInfo)[];
  blanks: string[];
  hints: string[];
  songName: string;
  englishTranslation: string;
  vocabularyItems: Vocabulary[];
}

interface UseFillBlanksProps {
  vocabulary: Vocabulary[];
  maxExercises?: number;
}

export function useFillBlanks({ 
  vocabulary, 
  maxExercises = 5 
}: UseFillBlanksProps) {
  const [currentExercise, setCurrentExercise] = useState<ExerciseData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, boolean>>({});
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [sessionExercises, setSessionExercises] = useState<ExerciseData[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Initialize session with vocabulary that has good context
  const initializeGame = async () => {
    if (!vocabulary || vocabulary.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Filter vocabulary that has context suitable for fill-in-the-blanks
      const usableVocab = vocabulary.filter(vocab => 
        vocab.songId && 
        vocab.context && 
        vocab.context.length > 15 && 
        vocab.songName
      );
      
      if (usableVocab.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const shuffled = [...usableVocab].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(maxExercises, usableVocab.length));
      
      // Create exercises from vocabulary
      const exercisePromises = selected.map(vocab => createExercise(vocab));
      const exercises = (await Promise.all(exercisePromises)).filter(Boolean) as ExerciseData[];
      
      setSessionExercises(exercises);
      setCurrentExerciseIndex(0);
      setCompletedExercises(new Set());
      setUserAnswers({});
      setShowResults(false);
      setCorrectAnswers({});
    } catch (error) {
      console.error('Failed to initialize fill-blanks game:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              audioContextRef.current = new AudioContextClass();
            }
          } catch (audioContextError) {
            console.log('AudioContext not supported:', audioContextError);
          }
          
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
          
          const enableAudio = async () => {
            try {
              if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
              }
              setIsAudioEnabled(true);
            } catch (error) {
              console.log('Failed to enable audio context:', error);
              setIsAudioEnabled(true);
            }
          };

          if (isMobile) {
            const handleUserInteraction = () => {
              enableAudio();
              document.removeEventListener('touchstart', handleUserInteraction);
              document.removeEventListener('click', handleUserInteraction);
              document.removeEventListener('keydown', handleUserInteraction);
            };

            document.addEventListener('touchstart', handleUserInteraction, { once: true });
            document.addEventListener('click', handleUserInteraction, { once: true });
            document.addEventListener('keydown', handleUserInteraction, { once: true });
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
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
              if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume().catch(e => console.log('Resume failed:', e));
              }
            });
        }
      }
    } catch (error) {
      console.log('Sound effect error:', error);
    }
  };

  // Create exercise data from vocabulary by fetching song lyrics
  const createExercise = async (vocab: Vocabulary): Promise<ExerciseData | null> => {
    if (!vocab.songId) return null;
    
    try {
      // Fetch the song with lyrics and translations
      const song = await api.songs.getById(vocab.songId);
      if (!song.lyrics || !Array.isArray(song.lyrics)) return null;
      
      // Find the lyric line that contains our vocabulary context
      const contextLine = song.lyrics.find((lyric: any) => 
        lyric.text && vocab.context && 
        lyric.text.toLowerCase().includes(vocab.context.toLowerCase().substring(0, 15))
      );
      
      if (!contextLine || !contextLine.translation) return null;
      
      // Use target language lyrics as the base text
      const targetSentence = contextLine.text;
      const englishTranslation = contextLine.translation;
      
      // Split target sentence into words
      const targetWords = targetSentence.split(/\s+/);
      const totalWords = targetWords.length;
      
      // Calculate how many words to blank (approximately 20%)
      const numBlanks = Math.max(1, Math.floor(totalWords * 0.2));
      
      // Prioritize vocabulary word and then random words
      const wordsToBlank = new Set<number>();
      
      // Always include the vocabulary word if it exists in the sentence
      const vocabWordIndex = targetWords.findIndex(word => 
        word.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '') === 
        vocab.word.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '')
      );
      
      if (vocabWordIndex !== -1) {
        wordsToBlank.add(vocabWordIndex);
      }
      
      // Add random words until we reach numBlanks
      while (wordsToBlank.size < numBlanks && wordsToBlank.size < totalWords) {
        const randomIndex = Math.floor(Math.random() * totalWords);
        // Skip very short words (articles, prepositions)
        if (targetWords[randomIndex].length > 2) {
          wordsToBlank.add(randomIndex);
        }
      }
      
      // Create the text with blanks
      const blanks: string[] = [];
      const textWithBlanks: (string | BlankInfo)[] = [];
      let blankIndex = 0;
      
      for (let i = 0; i < targetWords.length; i++) {
        if (wordsToBlank.has(i)) {
          const originalWord = targetWords[i];
          blanks.push(originalWord);
          textWithBlanks.push({
            blankIndex,
            answer: originalWord
          });
          blankIndex++;
        } else {
          textWithBlanks.push(targetWords[i]);
        }
        
        // Add space after each word (except last)
        if (i < targetWords.length - 1) {
          textWithBlanks.push(' ');
        }
      }
      
      // Create hints: include correct answers + distractors
      const distractorWords = vocabulary
        .filter(v => v.id !== vocab.id && v.language === vocab.language)
        .map(v => v.word)
        .filter(word => !blanks.includes(word))
        .slice(0, Math.max(3, blanks.length * 2));
      
      const hints = [...blanks, ...distractorWords].sort(() => Math.random() - 0.5);
      
      return {
        textWithBlanks,
        blanks,
        hints,
        songName: vocab.songName || song.title || "Unknown Song",
        englishTranslation,
        vocabularyItems: [vocab]
      };
      
    } catch (error) {
      console.error('Failed to create fill-blanks exercise:', error);
      return null;
    }
  };

  // Initialize current exercise
  useEffect(() => {
    if (sessionExercises.length > 0 && currentExerciseIndex < sessionExercises.length) {
      const exerciseData = sessionExercises[currentExerciseIndex];
      setCurrentExercise(exerciseData);
      setUserAnswers({});
      setShowResults(false);
      setCorrectAnswers({});
    }
  }, [sessionExercises, currentExerciseIndex]);

  // Initialize game when vocabulary changes
  useEffect(() => {
    initializeGame();
  }, [vocabulary, maxExercises]);

  // Handle answer change
  const handleAnswerChange = (blankIndex: number, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [blankIndex]: value
    }));
  };

  // Submit answers and check results
  const handleSubmit = () => {
    if (!currentExercise) return;
    
    const results: Record<number, boolean> = {};
    let correctCount = 0;
    
    currentExercise.textWithBlanks.forEach((part, index) => {
      if (typeof part !== 'string') {
        const userAnswer = userAnswers[part.blankIndex]?.toLowerCase().trim().replace(/[^\w\u00C0-\u017F]/g, '');
        const correctAnswer = part.answer.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '');
        const isAnswerCorrect = userAnswer === correctAnswer;
        
        results[part.blankIndex] = isAnswerCorrect;
        if (isAnswerCorrect) correctCount++;
      }
    });
    
    const allCorrect = correctCount === currentExercise.blanks.length;
    
    setCorrectAnswers(results);
    setShowResults(true);
    setIsCorrect(allCorrect);
    
    // Mark exercise as completed when correct
    if (allCorrect) {
      setCompletedExercises(prev => new Set([...prev, currentExerciseIndex]));
    }
    
    playSound(allCorrect);
  };

  // Move to next exercise
  const nextExercise = () => {
    if (currentExerciseIndex + 1 < sessionExercises.length) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  // Try again (reset current attempt)
  const tryAgain = () => {
    setUserAnswers({});
    setShowResults(false);
    setCorrectAnswers({});
    setIsCorrect(false);
  };

  // Reset game
  const resetGame = () => {
    initializeGame();
  };

  // Check if game is complete - either all exercises completed correctly OR we've gone through all exercises
  const isComplete = (completedExercises.size === sessionExercises.length && sessionExercises.length > 0) || 
                     (currentExerciseIndex >= sessionExercises.length && sessionExercises.length > 0);
  
  // Calculate progress
  const progress = {
    current: completedExercises.size,
    total: sessionExercises.length
  };

  return {
    currentExercise,
    userAnswers,
    showResults,
    isCorrect,
    progress,
    isComplete,
    correctAnswers,
    isLoading,
    handleAnswerChange,
    handleSubmit,
    nextExercise,
    tryAgain,
    resetGame
  };
}