import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Music } from 'lucide-react'
import { useLocation } from 'wouter'

import { type Vocabulary } from '@shared/schema'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api-client'
import AuthenticatedOnly from '@/components/authenticated-only'

interface ReviewStats {
  totalWords: number
  dueCount: number
  masteredCount: number
  averageScore: number
  streak: number
}

interface ReviewQuestion {
  vocabulary: Vocabulary
  correctAnswer: string
  options: string[]
  qualityMapping: { [key: string]: number } // Maps answer text to quality rating
}

export default function ReviewSession() {
  const [, setLocation] = useLocation()
  const { databaseUser } = useAuth()
  const queryClient = useQueryClient()
  
  // Review session state
  const [currentQuestion, setCurrentQuestion] = useState<ReviewQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    startTime: Date.now()
  })
  const [isAnswered, setIsAnswered] = useState(false)
  const [autoNext, setAutoNext] = useState(() => {
    const saved = localStorage.getItem('reviewAutoNext')
    return saved ? JSON.parse(saved) : false
  })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Audio refs for sound effects
  const correctSoundRef = useRef<HTMLAudioElement | null>(null)
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    correctSoundRef.current = new Audio('/sounds/correct.wav')
    wrongSoundRef.current = new Audio('/sounds/wrong.wav')
    
    // Preload the audio files
    correctSoundRef.current.preload = 'auto'
    wrongSoundRef.current.preload = 'auto'
    
    // Set volume to a reasonable level
    correctSoundRef.current.volume = 0.5
    wrongSoundRef.current.volume = 0.5

    return () => {
      // Cleanup audio elements and timeouts
      if (correctSoundRef.current) {
        correctSoundRef.current.pause()
        correctSoundRef.current = null
      }
      if (wrongSoundRef.current) {
        wrongSoundRef.current.pause()
        wrongSoundRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Function to play sound effects
  const playSound = (isCorrect: boolean) => {
    try {
      const audio = isCorrect ? correctSoundRef.current : wrongSoundRef.current
      if (audio) {
        audio.currentTime = 0 // Reset to beginning
        audio.play().catch(error => {
          console.log('Audio play failed:', error)
        })
      }
    } catch (error) {
      console.log('Sound effect error:', error)
    }
  }

  // Fetch due vocabulary
  const { data: dueVocabulary = [], isLoading } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary", "due"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return []
      return api.users.getDueVocabulary(databaseUser.id)
    },
    enabled: !!databaseUser?.id,
    refetchOnWindowFocus: false,
  })

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ vocabularyId, quality }: { vocabularyId: number; quality: number }) => {
      return api.vocabulary.submitReview(vocabularyId, quality)
    },
    onSuccess: () => {
      // Refetch due vocabulary and stats
      if (databaseUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary", "due"] })
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary", "stats"] })
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary"] })
      }
    }
  })

  // Generate answer options for spaced repetition
  const generateAnswerOptions = (correctAnswer: string, allVocab: Vocabulary[]): { options: string[], qualityMapping: { [key: string]: number } } => {
    // Get other translations for wrong answers
    const otherTranslations = allVocab
      .filter(v => v.translation !== correctAnswer && v.translation)
      .map(v => v.translation)
    
    // Generic wrong answers if not enough vocabulary
    const genericWrongAnswers = [
      "to sing", "to dance", "to walk", "to eat", "to drink", "to sleep",
      "happy", "sad", "beautiful", "fast", "slow", "big", "small",
      "house", "car", "book", "music", "love", "friend", "family"
    ].filter(answer => answer !== correctAnswer)

    const availableWrong = [...otherTranslations, ...genericWrongAnswers]
    const shuffled = availableWrong.sort(() => Math.random() - 0.5)
    const wrongAnswers = shuffled.slice(0, 3)

    // Create quality mapping based on spaced repetition logic
    const qualityMapping: { [key: string]: number } = {}
    
    // Correct answer gets quality 4 (Good)
    qualityMapping[correctAnswer] = 4
    
    // Wrong answers get different quality levels
    wrongAnswers.forEach((answer, index) => {
      qualityMapping[answer] = index === 0 ? 1 : 0 // First wrong = Hard (1), others = Again (0)
    })

    // Shuffle all options
    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)
    
    return { options, qualityMapping }
  }

  // Generate a new question
  const generateQuestion = () => {
    if (!dueVocabulary || dueVocabulary.length === 0) return

    const randomVocab = dueVocabulary[Math.floor(Math.random() * dueVocabulary.length)]
    const { options, qualityMapping } = generateAnswerOptions(randomVocab.translation, dueVocabulary)

    setCurrentQuestion({
      vocabulary: randomVocab,
      correctAnswer: randomVocab.translation,
      options,
      qualityMapping
    })
    setSelectedAnswer(null)
    setShowResult(false)
    setIsAnswered(false)
  }

  // Generate first question when due vocabulary loads
  useEffect(() => {
    if (dueVocabulary.length > 0 && !currentQuestion) {
      generateQuestion()
    }
  }, [dueVocabulary, currentQuestion])

  // Handle answer selection
  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered) return

    setSelectedAnswer(answer)
    setIsAnswered(true)
    setShowResult(true)

    const isCorrect = answer === currentQuestion?.correctAnswer
    const quality = currentQuestion?.qualityMapping[answer] || 0

    // Play sound effect
    playSound(isCorrect)

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))

    // Submit review to spaced repetition system
    if (currentQuestion) {
      await submitReviewMutation.mutateAsync({
        vocabularyId: currentQuestion.vocabulary.id,
        quality
      })
    }

    // Auto-advance to next question if enabled
    if (autoNext) {
      timeoutRef.current = setTimeout(() => {
        generateNextQuestion()
      }, 2000)
    }
  }

  const generateNextQuestion = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Check if there are more due words after this review
    if (dueVocabulary.length <= 1) {
      // Session complete - redirect to library
      setLocation('/library?tab=vocabulary')
      return
    }
    
    generateQuestion()
  }

  const handleNextQuestion = () => {
    generateNextQuestion()
  }

  const handleRestart = () => {
    setCurrentQuestion(null)
    setSelectedAnswer(null)
    setShowResult(false)
    setIsAnswered(false)
    setSessionStats({
      correct: 0,
      total: 0,
      startTime: Date.now()
    })
    generateQuestion()
  }

  if (isLoading) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Loading vocabulary review...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    )
  }

  if (dueVocabulary.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg spotify-text-primary">
          <div className="overflow-y-auto px-6 pt-16 pb-24">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Library</span>
              </button>
            </div>

            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-spotify-accent mx-auto mb-4" />
              <h3 className="spotify-heading-md mb-2">All caught up!</h3>
              <p className="spotify-text-muted mb-6">No vocabulary words are due for review right now.</p>
              <button
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="spotify-btn-primary"
              >
                Back to Vocabulary
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedOnly>
    )
  }

  if (!currentQuestion) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Preparing review session...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    )
  }

  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0

  return (
    <AuthenticatedOnly>
      <div className="min-h-screen spotify-bg spotify-text-primary">
        <div className="overflow-y-auto px-6 pt-16 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setLocation('/library?tab=vocabulary')}
              className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Library</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRestart}
                className="flex items-center space-x-2 px-3 py-2 rounded-full bg-spotify-card hover:bg-spotify-border transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Restart</span>
              </button>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="flex justify-center space-x-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold spotify-text-primary">{sessionStats.correct}</div>
              <div className="text-sm spotify-text-muted">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold spotify-text-primary">{sessionStats.total}</div>
              <div className="text-sm spotify-text-muted">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-spotify-accent">{accuracy}%</div>
              <div className="text-sm spotify-text-muted">Accuracy</div>
            </div>
          </div>

          {/* Question Card */}
          <div className="spotify-card p-8 mb-8 text-center">
            <div className="mb-6">
              <h2 className="spotify-heading-xl mb-2">{currentQuestion.vocabulary.word}</h2>
              <div className="flex items-center justify-center space-x-2 spotify-text-muted text-sm">
                <Music className="h-4 w-4" />
                <span>From: {currentQuestion.vocabulary.songName || "Unknown Song"}</span>
              </div>
              {currentQuestion.vocabulary.context && (
                <div className="mt-4 p-3 bg-spotify-border rounded-lg">
                  <p className="spotify-text-muted italic">"{currentQuestion.vocabulary.context}"</p>
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option
                const isCorrect = option === currentQuestion.correctAnswer
                const isWrong = isSelected && !isCorrect

                let buttonClass = "spotify-card-secondary p-4 text-left hover:bg-spotify-border transition-all duration-200 cursor-pointer"
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass = "bg-green-600 text-white p-4 text-left"
                  } else if (isWrong) {
                    buttonClass = "bg-red-600 text-white p-4 text-left"
                  } else {
                    buttonClass = "spotify-card-secondary p-4 text-left opacity-50"
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {showResult && isCorrect && <CheckCircle className="h-5 w-5" />}
                      {showResult && isWrong && <XCircle className="h-5 w-5" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Next Question Button */}
            {showResult && !autoNext && (
              <div className="mt-6">
                <button
                  onClick={handleNextQuestion}
                  className="spotify-btn-primary"
                >
                  Next Question
                </button>
              </div>
            )}

            {/* Auto Next Indicator */}
            {showResult && autoNext && (
              <div className="mt-6">
                <p className="spotify-text-muted text-sm">Next question in 2 seconds...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedOnly>
  )
}