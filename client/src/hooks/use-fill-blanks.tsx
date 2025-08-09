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
    console.log('🎮 INITIALIZE GAME:', { 
      vocabularyCount: vocabulary?.length || 0, 
      maxExercises 
    });
    
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
      
      console.log('🔍 VOCABULARY FILTERING:', {
        totalVocab: vocabulary.length,
        usableVocab: usableVocab.length,
        usableItems: usableVocab.map(v => ({ word: v.word, song: v.songName }))
      });
      
      if (usableVocab.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const shuffled = [...usableVocab].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(maxExercises, usableVocab.length));
      
      console.log('📝 SELECTED VOCABULARY:', selected.map(v => ({ 
        word: v.word, 
        song: v.songName, 
        context: v.context?.substring(0, 50) + '...' 
      })));
      
      // Create exercises from vocabulary
      const exercisePromises = selected.map(vocab => createExercise(vocab));
      const exercises = (await Promise.all(exercisePromises)).filter(Boolean) as ExerciseData[];
      
      console.log('🏗️ EXERCISES CREATED:', {
        requestedCount: selected.length,
        createdCount: exercises.length,
        exercises: exercises.map(ex => ({
          song: ex.songName,
          blanksCount: ex.blanks.length,
          hintsCount: ex.hints.length
        }))
      });
      
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
    console.log('🔨 CREATE EXERCISE START:', { 
      word: vocab.word, 
      songId: vocab.songId, 
      songName: vocab.songName,
      contextPreview: vocab.context?.substring(0, 50) + '...'
    });
    
    if (!vocab.songId) {
      console.log('❌ NO SONG ID:', { word: vocab.word });
      return null;
    }
    
    try {
      // Fetch the song with lyrics and translations
      const song = await api.songs.getById(vocab.songId);
      console.log('🎵 SONG FETCHED:', { 
        songId: vocab.songId, 
        hasLyrics: !!song.lyrics, 
        lyricsType: typeof song.lyrics, 
        lyricsLength: Array.isArray(song.lyrics) ? song.lyrics.length : 'not array'
      });
      
      if (!song.lyrics || !Array.isArray(song.lyrics)) {
        console.log('❌ INVALID LYRICS:', { songId: vocab.songId, lyrics: song.lyrics });
        return null;
      }
      
      // Find the lyric line that contains our vocabulary context
      const contextLine = song.lyrics.find((lyric: any) => 
        lyric.text && vocab.context && 
        lyric.text.toLowerCase().includes(vocab.context.toLowerCase().substring(0, 15))
      );
      
      console.log('🔍 CONTEXT SEARCH:', {
        searchFor: vocab.context?.substring(0, 15),
        totalLyrics: song.lyrics.length,
        foundLine: !!contextLine,
        foundText: contextLine?.text,
        foundTranslation: contextLine?.translation
      });
      
      if (!contextLine || !contextLine.translation) {
        console.log('❌ NO MATCHING CONTEXT LINE:', { word: vocab.word, context: vocab.context });
        return null;
      }
      
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
      
      // Create hints: ensure at least 4 total choices in word bank
      const minTotalChoices = 4;
      const targetDistractorCount = Math.max(minTotalChoices - blanks.length, 3);
      
      // Get distractor words from vocabulary
      const distractorWords = vocabulary
        .filter(v => v.id !== vocab.id && v.language === vocab.language)
        .map(v => v.word)
        .filter(word => !blanks.includes(word))
        .slice(0, targetDistractorCount);
      
      // If we don't have enough distractors from vocabulary, add words from the same sentence
      let additionalDistractors: string[] = [];
      if (distractorWords.length < targetDistractorCount) {
        const remainingNeeded = targetDistractorCount - distractorWords.length;
        additionalDistractors = targetWords
          .filter((word, index) => !wordsToBlank.has(index) && word.length > 2)
          .filter(word => !blanks.includes(word) && !distractorWords.includes(word))
          .slice(0, remainingNeeded);
      }
      
      const allDistractors = [...distractorWords, ...additionalDistractors];
      const hints = [...blanks, ...allDistractors].sort(() => Math.random() - 0.5);
      
      console.log('✅ EXERCISE CREATED SUCCESS:', {
        word: vocab.word,
        blanksCount: blanks.length,
        hintsCount: hints.length,
        blanks,
        hints,
        songName: vocab.songName || song.title || "Unknown Song"
      });
      
      return {
        textWithBlanks,
        blanks,
        hints,
        songName: vocab.songName || song.title || "Unknown Song",
        englishTranslation,
        vocabularyItems: [vocab]
      };
      
    } catch (error) {
      console.error('❌ EXERCISE CREATION ERROR:', error);
      console.log('🔍 ERROR CONTEXT:', { 
        word: vocab.word, 
        songId: vocab.songId, 
        context: vocab.context 
      });
      return null;
    }
  };

  // Initialize current exercise
  useEffect(() => {
    if (sessionExercises.length > 0 && currentExerciseIndex < sessionExercises.length) {
      const exerciseData = sessionExercises[currentExerciseIndex];
      
      console.log('🎯 EXERCISE LOADED:', {
        exerciseIndex: currentExerciseIndex,
        songName: exerciseData.songName,
        blanksCount: exerciseData.blanks.length,
        hintsCount: exerciseData.hints.length,
        blanks: exerciseData.blanks,
        hints: exerciseData.hints
      });
      
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
    console.log('🔤 ANSWER CHANGE:', {
      blankIndex,
      value,
      currentExerciseIndex,
      exerciseName: currentExercise?.songName
    });
    
    setUserAnswers(prev => {
      const newAnswers = {
        ...prev,
        [blankIndex]: value
      };
      console.log('📝 USER ANSWERS UPDATED:', newAnswers);
      return newAnswers;
    });
  };

  // Submit answers and check results
  const handleSubmit = () => {
    if (!currentExercise) return;
    
    console.log('🚀 SUBMIT TRIGGERED:', {
      currentExerciseIndex,
      userAnswers,
      totalBlanks: currentExercise.blanks.length,
      exerciseName: currentExercise.songName
    });
    
    const results: Record<number, boolean> = {};
    let correctCount = 0;
    
    currentExercise.textWithBlanks.forEach((part, index) => {
      if (typeof part !== 'string') {
        const userAnswer = userAnswers[part.blankIndex]?.toLowerCase().trim().replace(/[^\w\u00C0-\u017F]/g, '');
        const correctAnswer = part.answer.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '');
        const isAnswerCorrect = userAnswer === correctAnswer;
        
        console.log('🔍 ANSWER CHECK:', {
          blankIndex: part.blankIndex,
          userAnswer: userAnswers[part.blankIndex],
          userAnswerProcessed: userAnswer,
          correctAnswer: part.answer,
          correctAnswerProcessed: correctAnswer,
          isCorrect: isAnswerCorrect
        });
        
        results[part.blankIndex] = isAnswerCorrect;
        if (isAnswerCorrect) correctCount++;
      }
    });
    
    const allCorrect = correctCount === currentExercise.blanks.length;
    
    console.log('📊 SUBMIT RESULTS:', {
      results,
      correctCount,
      totalBlanks: currentExercise.blanks.length,
      allCorrect,
      currentProgress: completedExercises.size
    });
    
    setCorrectAnswers(results);
    setShowResults(true);
    setIsCorrect(allCorrect);
    
    // Mark exercise as completed when correct
    if (allCorrect) {
      setCompletedExercises(prev => {
        const newCompleted = new Set([...prev, currentExerciseIndex]);
        console.log('✅ EXERCISE COMPLETED:', {
          currentExerciseIndex,
          completedBefore: prev.size,
          completedAfter: newCompleted.size
        });
        return newCompleted;
      });
    }
    
    playSound(allCorrect);
  };

  // Move to next exercise
  const nextExercise = () => {
    console.log('➡️ NEXT EXERCISE:', {
      currentIndex: currentExerciseIndex,
      totalExercises: sessionExercises.length,
      canMoveNext: currentExerciseIndex + 1 < sessionExercises.length
    });
    
    if (currentExerciseIndex + 1 < sessionExercises.length) {
      setCurrentExerciseIndex(prev => {
        const newIndex = prev + 1;
        console.log('🔄 EXERCISE INDEX CHANGED:', {
          from: prev,
          to: newIndex,
          nextExerciseSong: sessionExercises[newIndex]?.songName
        });
        return newIndex;
      });
    }
  };

  // Try again (reset current attempt)
  const tryAgain = () => {
    console.log('🔄 TRY AGAIN:', {
      currentExerciseIndex,
      previousAnswers: userAnswers
    });
    
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
  
  console.log('📈 PROGRESS UPDATE:', {
    currentExerciseIndex,
    completedCount: completedExercises.size,
    totalExercises: sessionExercises.length,
    isComplete,
    completedExercises: Array.from(completedExercises)
  });

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