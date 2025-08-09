import { useState, useEffect } from "react";
import { type Vocabulary } from "@shared/schema";
import { api } from "@/lib/api-client";

export type ExerciseType = 'review' | 'match' | 'word-builder' | 'fill-blanks';

// Pre-generated exercise data
export interface PreGeneratedExercise {
  id: string;
  type: ExerciseType;
  data: any; // Contains the pre-generated exercise data
  vocabulary: Vocabulary[];
  isCompleted: boolean;
}

interface UseMixSessionProps {
  vocabulary: Vocabulary[];
  totalExercises?: number;
}

export function useMixSession({ 
  vocabulary, 
  totalExercises = 10 
}: UseMixSessionProps) {
  const [exercises, setExercises] = useState<PreGeneratedExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-generate all exercises with their data upfront
  const initializeSession = async () => {
    console.log('🎮 MIX SESSION INIT START:', {
      vocabularyCount: vocabulary?.length || 0,
      totalExercises
    });

    if (!vocabulary || vocabulary.length < 5) {
      console.log('❌ MIX SESSION: Not enough vocabulary');
      return;
    }
    
    setIsLoading(true);

    try {
      // Create balanced mix of exercise types
      // Since review questions are individual, we need to account for that
      const exerciseTypes: ExerciseType[] = [];
      const typeCounts = {
        'review': Math.floor(totalExercises * 0.5),      // 50% review questions (5 questions)
        'match': Math.floor(totalExercises * 0.2),       // 20% match (2 exercises)  
        'word-builder': Math.floor(totalExercises * 0.15), // 15% word-builder (1-2 exercises)
        'fill-blanks': Math.floor(totalExercises * 0.15)   // 15% fill-blanks (1-2 exercises)
      };
      
      // Fill remaining slots with review exercises
      const remaining = totalExercises - Object.values(typeCounts).reduce((a, b) => a + b, 0);
      typeCounts.review += remaining;

      // Create array of exercise types
      Object.entries(typeCounts).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
          exerciseTypes.push(type as ExerciseType);
        }
      });

      // Shuffle the exercise types
      const shuffledTypes = exerciseTypes.sort(() => Math.random() - 0.5);

      console.log('🎲 MIX SESSION: Exercise types planned', {
        typeCounts,
        shuffledTypes
      });

      // Pre-generate all exercises
      const generatedExercises: PreGeneratedExercise[] = [];
      
      for (let i = 0; i < shuffledTypes.length; i++) {
        const exerciseType = shuffledTypes[i];
        const exercise = await generateExercise(exerciseType, i, vocabulary);
        
        if (exercise) {
          generatedExercises.push(exercise);
          console.log(`✅ MIX SESSION: Exercise ${i + 1}/${totalExercises} generated`, {
            type: exercise.type,
            id: exercise.id,
            hasData: !!exercise.data
          });
        } else {
          console.log(`❌ MIX SESSION: Exercise ${i + 1}/${totalExercises} failed to generate`, {
            type: exerciseType
          });
        }
      }

      console.log('🏗️ MIX SESSION: All exercises pre-generated', {
        totalRequested: totalExercises,
        totalGenerated: generatedExercises.length,
        exerciseBreakdown: generatedExercises.map(ex => ({
          type: ex.type,
          id: ex.id
        }))
      });

      setExercises(generatedExercises);
      setCurrentExerciseIndex(0);
      setCompletedExercises(new Set());
      setIsSessionComplete(false);
      
    } catch (error) {
      console.error('❌ MIX SESSION: Failed to initialize session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a single exercise with pre-computed data
  const generateExercise = async (type: ExerciseType, index: number, vocabulary: Vocabulary[]): Promise<PreGeneratedExercise | null> => {
    const id = `${type}-${index}`;
    
    try {
      switch (type) {
        case 'review':
          return await generateReviewExercise(id, vocabulary);
        case 'match':
          return await generateMatchExercise(id, vocabulary);
        case 'word-builder':
          return await generateWordBuilderExercise(id, vocabulary);
        case 'fill-blanks':
          return await generateFillBlanksExercise(id, vocabulary);
        default:
          console.log('❌ Unknown exercise type:', type);
          return null;
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${type} exercise:`, error);
      return null;
    }
  };

  // Generate review exercise data - single question per exercise
  const generateReviewExercise = async (id: string, vocabulary: Vocabulary[]): Promise<PreGeneratedExercise | null> => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const vocab = shuffled[0]; // Just one question per exercise
    
    if (!vocab) return null;
    
    // Create wrong answers from other vocabulary
    const wrongAnswers = vocabulary
      .filter(v => v.id !== vocab.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(v => v.translation);
    
    const allAnswers = [vocab.translation, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    const question = {
      id: `${id}-q0`,
      word: vocab.word,
      correctAnswer: vocab.translation,
      options: allAnswers,
      vocabulary: vocab
    };

    return {
      id,
      type: 'review',
      data: { question }, // Single question instead of questions array
      vocabulary: [vocab],
      isCompleted: false
    };
  };

  // Generate match exercise data
  const generateMatchExercise = async (id: string, vocabulary: Vocabulary[]): Promise<PreGeneratedExercise | null> => {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5); // 5 pairs
    
    const leftColumn = selected.map((vocab, idx) => ({
      id: `left-${idx}`,
      word: vocab.word,
      vocabId: vocab.id
    }));
    
    const rightColumn = selected.map((vocab, idx) => ({
      id: `right-${idx}`,
      translation: vocab.translation,
      vocabId: vocab.id
    })).sort(() => Math.random() - 0.5);

    return {
      id,
      type: 'match',
      data: { leftColumn, rightColumn },
      vocabulary: selected,
      isCompleted: false
    };
  };

  // Generate word-builder exercise data
  const generateWordBuilderExercise = async (id: string, vocabulary: Vocabulary[]): Promise<PreGeneratedExercise | null> => {
    // Filter vocabulary with context and songId
    const usableVocab = vocabulary.filter(v => 
      v.songId && v.context && v.context.length > 10
    );
    
    if (usableVocab.length === 0) {
      console.log('❌ No usable vocabulary for word-builder');
      return null;
    }
    
    const vocab = usableVocab[Math.floor(Math.random() * usableVocab.length)];
    
    // Fetch song data
    const song = await api.songs.getById(vocab.songId!);
    if (!song.lyrics || !Array.isArray(song.lyrics)) {
      console.log('❌ No lyrics found for word-builder');
      return null;
    }
    
    // Find matching lyric line
    const contextLine = song.lyrics.find((lyric: any) => 
      lyric.text && vocab.context && 
      lyric.text.toLowerCase().includes(vocab.context.toLowerCase().substring(0, 20))
    );
    
    if (!contextLine || !contextLine.translation) {
      console.log('❌ No matching context line for word-builder');
      return null;
    }
    
    // Create sentence data
    const gameMode = Math.random() < 0.5 ? 'build-target' : 'build-english';
    const targetSentence = contextLine.text;
    const englishSentence = contextLine.translation;
    
    let scrambledWords: string[];
    let correctWords: string[];
    
    if (gameMode === 'build-target') {
      const targetWords = targetSentence.split(/\s+/).filter(w => w.length > 0);
      scrambledWords = [...targetWords].sort(() => Math.random() - 0.5);
      correctWords = targetWords;
    } else {
      const englishWords = englishSentence.split(/\s+/).filter(w => w.length > 0);
      scrambledWords = [...englishWords].sort(() => Math.random() - 0.5);
      correctWords = englishWords;
    }
    
    return {
      id,
      type: 'word-builder',
      data: {
        englishSentence,
        targetSentence,
        scrambledWords,
        correctWords,
        gameMode
      },
      vocabulary: [vocab],
      isCompleted: false
    };
  };

  // Generate fill-blanks exercise data
  const generateFillBlanksExercise = async (id: string, vocabulary: Vocabulary[]): Promise<PreGeneratedExercise | null> => {
    // Filter vocabulary suitable for fill-blanks
    const usableVocab = vocabulary.filter(v => 
      v.songId && v.context && v.context.length > 15 && v.songName
    );
    
    if (usableVocab.length === 0) {
      console.log('❌ No usable vocabulary for fill-blanks');
      return null;
    }
    
    const vocab = usableVocab[Math.floor(Math.random() * usableVocab.length)];
    
    // Fetch song data
    const song = await api.songs.getById(vocab.songId!);
    if (!song.lyrics || !Array.isArray(song.lyrics)) {
      console.log('❌ No lyrics found for fill-blanks');
      return null;
    }
    
    // Find matching lyric line
    const contextLine = song.lyrics.find((lyric: any) => 
      lyric.text && vocab.context && 
      lyric.text.toLowerCase().includes(vocab.context.toLowerCase().substring(0, 15))
    );
    
    if (!contextLine || !contextLine.translation) {
      console.log('❌ No matching context line for fill-blanks');
      return null;
    }
    
    // Create blanks
    const targetSentence = contextLine.text;
    const englishTranslation = contextLine.translation;
    const targetWords = targetSentence.split(/\s+/);
    
    // Calculate number of blanks (20% of words, minimum 1)
    const numBlanks = Math.max(1, Math.floor(targetWords.length * 0.2));
    const wordsToBlank = new Set<number>();
    
    // Always include vocabulary word if present
    const vocabWordIndex = targetWords.findIndex(word => 
      word.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '') === 
      vocab.word.toLowerCase().replace(/[^\w\u00C0-\u017F]/g, '')
    );
    
    if (vocabWordIndex !== -1) {
      wordsToBlank.add(vocabWordIndex);
    }
    
    // Add random words
    while (wordsToBlank.size < numBlanks && wordsToBlank.size < targetWords.length) {
      const randomIndex = Math.floor(Math.random() * targetWords.length);
      if (targetWords[randomIndex].length > 2) {
        wordsToBlank.add(randomIndex);
      }
    }
    
    // Create text with blanks
    const blanks: string[] = [];
    const textWithBlanks: (string | { blankIndex: number; answer: string })[] = [];
    let blankIndex = 0;
    
    for (let i = 0; i < targetWords.length; i++) {
      if (wordsToBlank.has(i)) {
        const originalWord = targetWords[i];
        blanks.push(originalWord);
        textWithBlanks.push({ blankIndex, answer: originalWord });
        blankIndex++;
      } else {
        textWithBlanks.push(targetWords[i]);
      }
      
      if (i < targetWords.length - 1) {
        textWithBlanks.push(' ');
      }
    }
    
    // Create word bank with distractors
    const distractorWords = vocabulary
      .filter(v => v.id !== vocab.id)
      .map(v => v.word)
      .filter(word => !blanks.includes(word))
      .slice(0, Math.max(4 - blanks.length, 2));
    
    const hints = [...blanks, ...distractorWords].sort(() => Math.random() - 0.5);
    
    return {
      id,
      type: 'fill-blanks',
      data: {
        textWithBlanks,
        blanks,
        hints,
        songName: vocab.songName,
        englishTranslation
      },
      vocabulary: [vocab],
      isCompleted: false
    };
  };

  // Get vocabulary count needed for each exercise type
  const getVocabCountForType = (type: ExerciseType): number => {
    switch (type) {
      case 'review':
        return 10; // 10 questions
      case 'match':
        return 5;  // 5 pairs
      case 'word-builder':
        return 1;  // 1 sentence at a time
      case 'fill-blanks':
        return 1;  // 1 lyric line at a time
      default:
        return 5;
    }
  };

  // Mark current exercise as completed and move to next
  const completeCurrentExercise = () => {
    console.log('✅ MIX SESSION: Complete current exercise called', {
      currentExerciseIndex,
      totalExercises: exercises.length,
      currentExercise: exercises[currentExerciseIndex] ? {
        id: exercises[currentExerciseIndex].id,
        type: exercises[currentExerciseIndex].type,
        isCompleted: exercises[currentExerciseIndex].isCompleted
      } : null
    });

    if (currentExerciseIndex < exercises.length) {
      const currentExercise = exercises[currentExerciseIndex];
      
      setCompletedExercises(prev => {
        const newCompleted = new Set([...prev, currentExercise.id]);
        console.log('📊 MIX SESSION: Updated completed exercises', {
          previousCount: prev.size,
          newCount: newCompleted.size,
          completedIds: Array.from(newCompleted)
        });
        return newCompleted;
      });
      
      // Update exercise completion status
      setExercises(prev => prev.map(ex => 
        ex.id === currentExercise.id 
          ? { ...ex, isCompleted: true }
          : ex
      ));

      // Move to next exercise or complete session
      if (currentExerciseIndex + 1 < exercises.length) {
        const nextIndex = currentExerciseIndex + 1;
        console.log('➡️ MIX SESSION: Moving to next exercise', {
          fromIndex: currentExerciseIndex,
          toIndex: nextIndex,
          nextExercise: exercises[nextIndex] ? {
            id: exercises[nextIndex].id,
            type: exercises[nextIndex].type
          } : null
        });
        setCurrentExerciseIndex(prev => prev + 1);
      } else {
        console.log('🏁 MIX SESSION: Session complete!', {
          totalExercises: exercises.length,
          completedCount: completedExercises.size + 1 // +1 for the current one being completed
        });
        setIsSessionComplete(true);
      }
    } else {
      console.log('⚠️ MIX SESSION: Cannot complete exercise - invalid index', {
        currentExerciseIndex,
        totalExercises: exercises.length
      });
    }
  };

  // Reset the entire session
  const resetSession = () => {
    initializeSession();
  };

  // Initialize session when vocabulary changes
  useEffect(() => {
    initializeSession();
  }, [vocabulary]);

  // Calculate progress
  const progress = {
    current: completedExercises.size,
    total: exercises.length,
    percentage: exercises.length > 0 ? Math.round((completedExercises.size / exercises.length) * 100) : 0
  };

  const currentExercise = exercises[currentExerciseIndex] || null;

  return {
    exercises,
    currentExercise,
    currentExerciseIndex,
    progress,
    isSessionComplete,
    isLoading,
    completeCurrentExercise,
    resetSession
  };
}