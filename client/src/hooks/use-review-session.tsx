import { useState, useEffect, useRef } from "react";
import { type Vocabulary } from "@shared/schema";

interface ReviewQuestion {
  vocabulary: Vocabulary;
  correctAnswer: string;
  options: string[];
  sourceSong: string;
}

interface UseReviewSessionProps {
  vocabulary: Vocabulary[];
  maxQuestions?: number;
  onAnswerSubmit?: (vocabularyId: number, answer: string) => Promise<void>;
}

export function useReviewSession({ 
  vocabulary, 
  maxQuestions = 10,
  onAnswerSubmit 
}: UseReviewSessionProps) {
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<Vocabulary[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [autoNext, setAutoNext] = useState(() => {
    const saved = localStorage.getItem('reviewAutoNext');
    return saved ? JSON.parse(saved) : false;
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize session questions (limit to maxQuestions)
  useEffect(() => {
    if (vocabulary && vocabulary.length > 0) {
      const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
      const limited = shuffled.slice(0, Math.min(maxQuestions, vocabulary.length));
      setSessionQuestions(limited);
      setCurrentQuestionIndex(0);
      setScore({ correct: 0, total: 0 });
    }
  }, [vocabulary, maxQuestions]);

  // Initialize audio elements
  useEffect(() => {
    correctSoundRef.current = new Audio('/sounds/correct.wav');
    wrongSoundRef.current = new Audio('/sounds/wrong.wav');
    
    if (correctSoundRef.current && wrongSoundRef.current) {
      correctSoundRef.current.preload = 'auto';
      wrongSoundRef.current.preload = 'auto';
      correctSoundRef.current.volume = 0.5;
      wrongSoundRef.current.volume = 0.5;
    }

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
    try {
      const audio = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(error => console.log('Audio play failed:', error));
      }
    } catch (error) {
      console.log('Sound effect error:', error);
    }
  };

  // Generate random incorrect answers
  const generateIncorrectAnswers = (correctAnswer: string, allVocab: Vocabulary[]): string[] => {
    const otherTranslations = allVocab
      .filter(v => v.translation !== correctAnswer && v.translation)
      .map(v => v.translation);
    
    const genericWrongAnswers = [
      "to sing", "to dance", "to walk", "to eat", "to drink", "to sleep",
      "happy", "sad", "beautiful", "fast", "slow", "big", "small",
      "house", "car", "book", "music", "love", "friend", "family"
    ].filter(answer => answer !== correctAnswer);

    const availableWrong = [...otherTranslations, ...genericWrongAnswers];
    const shuffled = availableWrong.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  // Generate a question from current session
  const generateQuestion = () => {
    if (!sessionQuestions || sessionQuestions.length === 0 || currentQuestionIndex >= sessionQuestions.length) {
      return null;
    }

    const currentVocab = sessionQuestions[currentQuestionIndex];
    const incorrectAnswers = generateIncorrectAnswers(currentVocab.translation, vocabulary);
    
    const options = [currentVocab.translation, ...incorrectAnswers];
    const shuffledOptions = options.sort(() => Math.random() - 0.5);

    const question: ReviewQuestion = {
      vocabulary: currentVocab,
      correctAnswer: currentVocab.translation,
      options: shuffledOptions,
      sourceSong: currentVocab.songName || "Unknown Song"
    };
    
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsAnswered(false);
    
    return question;
  };

  // Handle answer selection
  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered || !currentQuestion) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setShowResult(true);
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    playSound(isCorrect);

    // Submit to backend if callback provided
    if (onAnswerSubmit) {
      await onAnswerSubmit(currentQuestion.vocabulary.id, answer);
    }

    // Auto next functionality
    if (autoNext) {
      timeoutRef.current = setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (currentQuestionIndex + 1 >= sessionQuestions.length) {
      // Session complete
      setCurrentQuestionIndex(prev => prev + 1); // This will trigger isSessionComplete
      return { sessionComplete: true, finalScore: score };
    }
    
    setCurrentQuestionIndex(prev => prev + 1);
    return { sessionComplete: false };
  };

  // Generate question when index changes
  useEffect(() => {
    if (sessionQuestions.length > 0 && currentQuestionIndex < sessionQuestions.length) {
      generateQuestion();
    }
  }, [sessionQuestions, currentQuestionIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate progress
  const progress = {
    current: Math.min(currentQuestionIndex + (currentQuestion ? 1 : 0), sessionQuestions.length),
    total: sessionQuestions.length,
    percentage: sessionQuestions.length > 0 ? (Math.min(currentQuestionIndex + (currentQuestion ? 1 : 0), sessionQuestions.length) / sessionQuestions.length) * 100 : 0
  };

  const isSessionComplete = currentQuestionIndex >= sessionQuestions.length && sessionQuestions.length > 0;
  
  // Debug logging
  console.log('Review Session Debug:', {
    currentQuestionIndex,
    sessionQuestionsLength: sessionQuestions.length,
    isSessionComplete,
    currentQuestion: currentQuestion?.vocabulary?.word
  });

  // Reset session function
  const resetSession = () => {
    if (vocabulary && vocabulary.length > 0) {
      const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
      const limited = shuffled.slice(0, Math.min(maxQuestions, vocabulary.length));
      setSessionQuestions(limited);
      setCurrentQuestionIndex(0);
      setScore({ correct: 0, total: 0 });
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsAnswered(false);
    }
  };

  return {
    currentQuestion,
    selectedAnswer,
    showResult,
    score,
    isAnswered,
    autoNext,
    progress,
    isSessionComplete,
    handleAnswerSelect,
    handleNextQuestion,
    resetSession,
    setAutoNext: (value: boolean) => {
      setAutoNext(value);
      localStorage.setItem('reviewAutoNext', JSON.stringify(value));
    }
  };
}