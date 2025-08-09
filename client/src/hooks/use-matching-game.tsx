import { useState, useEffect, useRef } from "react";
import { type Vocabulary } from "@shared/schema";

interface MatchingItem {
  id: number;
  word: string;
  translation: string;
  vocabularyId: number;
}

interface Match {
  leftId: number;
  rightId: number;
}

interface UseMatchingGameProps {
  vocabulary: Vocabulary[];
  gameSize?: number;
}

export function useMatchingGame({ 
  vocabulary, 
  gameSize = 5 
}: UseMatchingGameProps) {
  const [leftColumn, setLeftColumn] = useState<MatchingItem[]>([]);
  const [rightColumn, setRightColumn] = useState<MatchingItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [score, setScore] = useState({ matches: 0, attempts: 0 });
  const [wrongMatchIds, setWrongMatchIds] = useState<{leftId: number, rightId: number} | null>(null);
  
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Initialize game with random vocabulary
  const initializeGame = () => {
    if (!vocabulary || vocabulary.length < gameSize) return;
    
    // Get random vocabulary words
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const selectedVocab = shuffled.slice(0, gameSize);
    
    // Create matching items with unique IDs
    const items: MatchingItem[] = selectedVocab.map((vocab, index) => ({
      id: index + 1,
      word: vocab.word,
      translation: vocab.translation,
      vocabularyId: vocab.id
    }));
    
    // Shuffle the right column (translations) independently
    const shuffledTranslations = [...items].sort(() => Math.random() - 0.5);
    
    setLeftColumn(items);
    setRightColumn(shuffledTranslations);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatches([]);
    setScore({ matches: 0, attempts: 0 });
    setWrongMatchIds(null);
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

  // Initialize game when vocabulary changes
  useEffect(() => {
    initializeGame();
  }, [vocabulary, gameSize]);

  // Handle card selection
  const handleCardSelect = (id: number, side: 'left' | 'right') => {
    // Don't allow selecting already matched cards
    const isAlreadyMatched = matches.some(match => 
      match.leftId === id || match.rightId === id
    );
    if (isAlreadyMatched) return;

    if (side === 'left') {
      if (selectedLeft === id) {
        // Deselect if clicking the same card
        setSelectedLeft(null);
      } else {
        setSelectedLeft(id);
        
        // If right card is selected, try to match
        if (selectedRight !== null) {
          checkMatch(id, selectedRight);
        }
      }
    } else {
      if (selectedRight === id) {
        // Deselect if clicking the same card
        setSelectedRight(null);
      } else {
        setSelectedRight(id);
        
        // If left card is selected, try to match
        if (selectedLeft !== null) {
          checkMatch(selectedLeft, id);
        }
      }
    }
  };

  // Check if two selected cards match
  const checkMatch = (leftId: number, rightId: number) => {
    const leftItem = leftColumn.find(item => item.id === leftId);
    const rightItem = rightColumn.find(item => item.id === rightId);
    
    if (!leftItem || !rightItem) return;

    // Increment attempts
    setScore(prev => ({ ...prev, attempts: prev.attempts + 1 }));

    // Check if the vocabulary IDs match (same word)
    const isMatch = leftItem.vocabularyId === rightItem.vocabularyId;
    
    if (isMatch) {
      // Add to matches
      setMatches(prev => [...prev, { leftId, rightId }]);
      setScore(prev => ({ matches: prev.matches + 1, attempts: prev.attempts }));
      playSound(true);
      
      // Clear selections
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Wrong match - play sound and show red animation
      playSound(false);
      setWrongMatchIds({ leftId, rightId });
      
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setWrongMatchIds(null);
      }, 800);
    }
  };

  // Reset game
  const resetGame = () => {
    initializeGame();
  };

  // Check if game is complete
  const isGameComplete = matches.length === gameSize;

  return {
    leftColumn,
    rightColumn,
    selectedLeft,
    selectedRight,
    matches,
    score,
    isGameComplete,
    wrongMatchIds,
    handleCardSelect,
    resetGame
  };
}