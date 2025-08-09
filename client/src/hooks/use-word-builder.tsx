import { useState, useEffect, useRef } from "react";
import { type Vocabulary } from "@shared/schema";
import { api } from "@/lib/api-client";

interface SentenceData {
  englishSentence: string; // English version of the sentence
  targetSentence: string; // Target language version of the sentence
  scrambledWords: string[]; // Words to arrange (in the language user should build)
  correctWords: string[]; // Correct order of words
  gameMode: 'build-target' | 'build-english'; // Which direction
  vocabularyItem: Vocabulary;
}

interface UseWordBuilderProps {
  vocabulary: Vocabulary[];
  maxSentences?: number;
}

export function useWordBuilder({ 
  vocabulary, 
  maxSentences = 5 
}: UseWordBuilderProps) {
  const [currentSentence, setCurrentSentence] = useState<SentenceData | null>(null);
  const [builtSentence, setBuiltSentence] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedSentences, setCompletedSentences] = useState<Set<number>>(new Set());
  const [sessionSentences, setSessionSentences] = useState<SentenceData[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Initialize session by fetching song data and creating sentence pairs
  const initializeGame = async () => {
    console.log('🎮 WORD-BUILDER INIT START:', {
      vocabularyCount: vocabulary?.length || 0,
      maxSentences
    });

    if (!vocabulary || vocabulary.length === 0) {
      console.log('❌ WORD-BUILDER: No vocabulary provided');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Filter vocabulary that has songId and context
      const usableVocab = vocabulary.filter(vocab => 
        vocab.songId && vocab.context && vocab.context.length > 10
      );
      
      console.log('🔍 WORD-BUILDER: Vocabulary filtering', {
        totalVocab: vocabulary.length,
        usableVocab: usableVocab.length,
        usableItems: usableVocab.map(v => ({ 
          word: v.word, 
          songId: v.songId, 
          contextLength: v.context?.length || 0 
        }))
      });
      
      if (usableVocab.length === 0) {
        console.log('❌ WORD-BUILDER: No usable vocabulary found');
        setIsLoading(false);
        return;
      }
      
      const shuffled = [...usableVocab].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(maxSentences, usableVocab.length));
      
      console.log('📝 WORD-BUILDER: Selected vocabulary for sentences', {
        selectedCount: selected.length,
        maxSentences,
        selected: selected.map(v => ({ word: v.word, songId: v.songId }))
      });
      
      // Create sentence data from vocabulary with song translations
      const sentencePromises = selected.map(vocab => createSentenceFromVocab(vocab));
      const sentences = (await Promise.all(sentencePromises)).filter(Boolean) as SentenceData[];
      
      console.log('🏗️ WORD-BUILDER: Sentences created', {
        requestedCount: selected.length,
        createdCount: sentences.length,
        sentences: sentences.map(s => ({
          gameMode: s.gameMode,
          englishLength: s.englishSentence?.length || 0,
          targetLength: s.targetSentence?.length || 0,
          scrambledWordsCount: s.scrambledWords?.length || 0
        }))
      });
      
      setSessionSentences(sentences);
      setCurrentSentenceIndex(0);
      setCompletedSentences(new Set());
      setBuiltSentence([]);
      setIsCorrect(null);
    } catch (error) {
      console.error('❌ WORD-BUILDER: Failed to initialize game:', error);
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

  // Create sentence data from vocabulary by fetching song lyrics with translations
  const createSentenceFromVocab = async (vocab: Vocabulary): Promise<SentenceData | null> => {
    if (!vocab.songId) return null;
    
    try {
      // Fetch the song with lyrics and translations
      const song = await api.songs.getById(vocab.songId);
      if (!song.lyrics || !Array.isArray(song.lyrics)) return null;
      
      // Find the lyric line that contains our vocabulary context
      const contextLine = song.lyrics.find((lyric: any) => 
        lyric.text && vocab.context && 
        lyric.text.toLowerCase().includes(vocab.context.toLowerCase().substring(0, 20))
      );
      
      if (!contextLine || !contextLine.translation) return null;
      
      // Randomly choose game mode
      const gameMode = Math.random() < 0.5 ? 'build-target' : 'build-english';
      
      const targetSentence = contextLine.text;
      const englishSentence = contextLine.translation;
      
      let scrambledWords: string[];
      let correctWords: string[];
      
      if (gameMode === 'build-target') {
        // Show English, build target language
        const targetWords = targetSentence.split(/\s+/).filter(w => w.length > 0);
        scrambledWords = [...targetWords].sort(() => Math.random() - 0.5);
        correctWords = targetWords;
      } else {
        // Show target language, build English
        const englishWords = englishSentence.split(/\s+/).filter(w => w.length > 0);
        scrambledWords = [...englishWords].sort(() => Math.random() - 0.5);
        correctWords = englishWords;
      }
      
      // Add some distractor words from other vocabulary
      const distractorWords = vocabulary
        .filter(v => v.id !== vocab.id && v.language === vocab.language)
        .map(v => gameMode === 'build-target' ? v.word : v.translation)
        .filter(word => word && !correctWords.some(cw => 
          cw.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '') === 
          word.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '')
        ))
        .slice(0, 2);
      
      scrambledWords = [...scrambledWords, ...distractorWords].sort(() => Math.random() - 0.5);
      
      return {
        englishSentence,
        targetSentence,
        scrambledWords,
        correctWords,
        gameMode,
        vocabularyItem: vocab
      };
      
    } catch (error) {
      console.error('Failed to create sentence from vocabulary:', error);
      return null;
    }
  };

  // Initialize current sentence
  useEffect(() => {
    if (sessionSentences.length > 0 && currentSentenceIndex < sessionSentences.length) {
      const sentenceData = sessionSentences[currentSentenceIndex];
      setCurrentSentence(sentenceData);
      setBuiltSentence([]);
      setIsCorrect(null);
    }
  }, [sessionSentences, currentSentenceIndex]);

  // Initialize game when vocabulary changes
  useEffect(() => {
    initializeGame();
  }, [vocabulary, maxSentences]);

  // Drag and drop handlers
  const handleDragStart = (word: string) => {
    setDraggedWord(word);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
  };

  const handleDrop = (word: string) => {
    if (!currentSentence?.scrambledWords.includes(word)) return;
    
    // Count how many times this word appears in scrambledWords vs builtSentence
    const availableCount = currentSentence.scrambledWords.filter(w => w === word).length;
    const usedCount = builtSentence.filter(w => w === word).length;
    
    console.log('Drop word:', word, 'available:', availableCount, 'used:', usedCount);
    
    // Only allow if we haven't used all instances of this word
    if (usedCount >= availableCount) return;
    
    setBuiltSentence(prev => [...prev, word]);
    setIsCorrect(null);
  };

  // Handle word click (alternative to drag-drop for mobile)
  const handleWordClick = (word: string) => {
    handleDrop(word);
  };

  // Remove word from built sentence
  const handleRemoveWord = (index: number) => {
    const word = builtSentence[index];
    setBuiltSentence(prev => prev.filter((_, i) => i !== index));
    setIsCorrect(null);
  };

  // Get available words (considering word counts)
  const getAvailableWords = () => {
    if (!currentSentence) return [];
    
    // Create a list showing each available instance
    const available: string[] = [];
    const wordCounts: Record<string, { total: number; used: number }> = {};
    
    // Count total instances of each word
    currentSentence.scrambledWords.forEach(word => {
      if (!wordCounts[word]) {
        wordCounts[word] = { total: 0, used: 0 };
      }
      wordCounts[word].total++;
    });
    
    // Count used instances
    builtSentence.forEach(word => {
      if (wordCounts[word]) {
        wordCounts[word].used++;
      }
    });
    
    // Add available instances to the list
    Object.entries(wordCounts).forEach(([word, counts]) => {
      const availableInstances = counts.total - counts.used;
      for (let i = 0; i < availableInstances; i++) {
        available.push(word);
      }
    });
    
    console.log('Available words calculation:', { wordCounts, available });
    
    return available;
  };

  // Check if built sentence is correct
  const checkSentence = () => {
    if (!currentSentence || builtSentence.length === 0) return;
    
    // Compare built sentence with correct words
    const correctWords = currentSentence.correctWords.map(w => w.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, ''));
    const builtWords = builtSentence.map(w => w.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, ''));
    
    // Check if the built sentence matches exactly
    const isCorrectSentence = correctWords.length === builtWords.length && 
      correctWords.every((word, index) => word === builtWords[index]);
    
    setIsCorrect(isCorrectSentence);
    playSound(isCorrectSentence);
    
    // Mark sentence as completed when correct
    if (isCorrectSentence) {
      setCompletedSentences(prev => new Set([...prev, currentSentenceIndex]));
    }
  };

  // Move to next sentence
  const nextSentence = () => {
    setCurrentSentenceIndex(prev => prev + 1);
  };

  // Try again (reset current attempt)
  const tryAgain = () => {
    setBuiltSentence([]);
    setIsCorrect(null);
  };

  // Reset game
  const resetGame = () => {
    initializeGame();
  };

  // Check if game is complete - only when we have sentences and they're all completed
  const isComplete = sessionSentences.length > 0 && 
                     completedSentences.size === sessionSentences.length;
  
  // Log completion state changes
  useEffect(() => {
    console.log('📊 WORD-BUILDER: Completion state update', {
      sessionSentencesLength: sessionSentences.length,
      completedSentencesSize: completedSentences.size,
      currentSentenceIndex,
      isComplete,
      completedIds: Array.from(completedSentences)
    });
  }, [isComplete, sessionSentences.length, completedSentences.size, currentSentenceIndex]);
  
  // Calculate progress
  const progress = {
    current: completedSentences.size,
    total: sessionSentences.length,
    currentSentence: currentSentenceIndex + 1
  };

  return {
    currentSentence,
    builtSentence,
    isCorrect,
    isComplete,
    progress,
    draggedWord,
    isLoading,
    availableWords: getAvailableWords(),
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleWordClick,
    handleRemoveWord,
    checkSentence,
    nextSentence,
    tryAgain,
    resetGame
  };
}