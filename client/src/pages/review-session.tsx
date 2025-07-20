import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Volume2, BookOpen, Target, Zap, RotateCcw } from 'lucide-react'
import { useLocation } from 'wouter'

import { type Vocabulary } from '@shared/schema'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import AuthenticatedOnly from '@/components/authenticated-only'

interface ReviewStats {
  totalWords: number
  dueCount: number
  masteredCount: number
  averageScore: number
  streak: number
}

export default function ReviewSession() {
  const [, setLocation] = useLocation()
  const { databaseUser } = useAuth()
  const queryClient = useQueryClient()
  
  // Review session state
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    startTime: Date.now()
  })

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

  // Fetch vocabulary stats
  const { data: stats } = useQuery<ReviewStats>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary", "stats"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return { totalWords: 0, dueCount: 0, masteredCount: 0, averageScore: 0, streak: 0 }
      return api.users.getVocabularyStats(databaseUser.id)
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

  const currentWord = dueVocabulary[currentWordIndex]

  const handleQualityRating = async (quality: number) => {
    if (!currentWord) return

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      total: prev.total + 1
    }))

    // Submit review
    await submitReviewMutation.mutateAsync({
      vocabularyId: currentWord.id,
      quality
    })

    // Move to next word or finish session
    if (currentWordIndex < dueVocabulary.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setShowAnswer(false)
    } else {
      // Session complete
      setLocation('/library?tab=vocabulary')
    }
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleRestart = () => {
    setCurrentWordIndex(0)
    setShowAnswer(false)
    setSessionStats({
      correct: 0,
      total: 0,
      startTime: Date.now()
    })
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

  if (!dueVocabulary || dueVocabulary.length === 0) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="spotify-text-muted hover:spotify-text-primary mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="spotify-heading-lg">Vocabulary Review</h1>
            </div>

            <div className="text-center py-16">
              <Target className="mx-auto spotify-text-muted mb-4" size={64} />
              <h2 className="spotify-heading-md mb-2">All Caught Up!</h2>
              <p className="spotify-text-muted mb-6">
                No words are due for review right now. Come back later or learn new words from songs!
              </p>
              
              {/* Stats */}
              {stats && (
                <div className="bg-spotify-card rounded-lg p-6 mb-6 max-w-md mx-auto">
                  <h3 className="spotify-heading-sm mb-4">Your Progress</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold spotify-text-primary">{stats.totalWords}</div>
                      <div className="text-sm spotify-text-muted">Total Words</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-spotify-green">{stats.masteredCount}</div>
                      <div className="text-sm spotify-text-muted">Mastered</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-spotify-accent">{stats.averageScore}%</div>
                      <div className="text-sm spotify-text-muted">Average Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-500">{stats.streak}</div>
                      <div className="text-sm spotify-text-muted">Day Streak</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setLocation('/home')}
                className="spotify-btn-primary"
              >
                Discover Songs
              </Button>
            </div>
          </div>
        </div>
      </AuthenticatedOnly>
    )
  }

  const progress = ((currentWordIndex + (showAnswer ? 0.5 : 0)) / dueVocabulary.length) * 100

  return (
    <AuthenticatedOnly>
      <div className="min-h-screen spotify-bg pb-20">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/library?tab=vocabulary')}
                className="spotify-text-muted hover:spotify-text-primary mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="spotify-heading-lg">Review Session</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
              className="spotify-text-muted hover:spotify-text-primary"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="spotify-text-muted text-sm">
                {currentWordIndex + 1} of {dueVocabulary.length}
              </span>
              <span className="spotify-text-muted text-sm">
                {sessionStats.correct}/{sessionStats.total} correct
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {currentWord && (
            <div className="max-w-2xl mx-auto">
              {/* Word Card */}
              <div className="bg-spotify-card rounded-lg p-8 mb-6 text-center">
                {/* Context */}
                {currentWord.context && (
                  <div className="mb-6">
                    <p className="spotify-text-muted text-sm mb-2">Context from "{currentWord.songName}":</p>
                    <p className="spotify-text-primary italic">"{currentWord.context}"</p>
                  </div>
                )}

                {/* Word */}
                <div className="mb-6">
                  <h2 className="text-4xl font-bold spotify-text-primary mb-2">
                    {currentWord.word}
                  </h2>
                  <div className="flex items-center justify-center gap-2 spotify-text-muted text-sm">
                    <span>{currentWord.language.toUpperCase()}</span>
                    <span>•</span>
                    <span className="capitalize">{currentWord.difficulty}</span>
                  </div>
                </div>

                {/* Answer */}
                {showAnswer && (
                  <div className="mb-6 p-4 bg-spotify-surface rounded-lg">
                    <p className="text-xl spotify-text-primary mb-2">{currentWord.translation}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {!showAnswer ? (
                  <Button
                    onClick={handleShowAnswer}
                    className="spotify-btn-primary w-full max-w-sm"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Show Answer
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="spotify-text-muted text-sm mb-4">How well did you remember this word?</p>
                    <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                      <Button
                        onClick={() => handleQualityRating(5)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={submitReviewMutation.isPending}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Perfect - Instantly recalled
                      </Button>
                      <Button
                        onClick={() => handleQualityRating(4)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={submitReviewMutation.isPending}
                      >
                        Good - Recalled correctly
                      </Button>
                      <Button
                        onClick={() => handleQualityRating(3)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        disabled={submitReviewMutation.isPending}
                      >
                        Okay - Recalled with effort
                      </Button>
                      <Button
                        onClick={() => handleQualityRating(2)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={submitReviewMutation.isPending}
                      >
                        Hard - Struggled to recall
                      </Button>
                      <Button
                        onClick={() => handleQualityRating(1)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={submitReviewMutation.isPending}
                      >
                        Again - Didn't remember
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Stats */}
              <div className="bg-spotify-surface rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold spotify-text-primary">
                      {currentWord.memorizationScore}%
                    </div>
                    <div className="text-xs spotify-text-muted">Score</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold spotify-text-primary">
                      {currentWord.totalReviews}
                    </div>
                    <div className="text-xs spotify-text-muted">Reviews</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold spotify-text-primary">
                      {currentWord.intervalDays}d
                    </div>
                    <div className="text-xs spotify-text-muted">Interval</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedOnly>
  )
}