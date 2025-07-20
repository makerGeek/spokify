import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Brain, Target, Zap, Trash2 } from 'lucide-react'
import { useLocation } from 'wouter'

import { type Vocabulary } from '@shared/schema'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api-client'

interface VocabularyTabProps {
  vocabulary: Vocabulary[]
  isLoading: boolean
}

export default function VocabularyTab({ vocabulary, isLoading }: VocabularyTabProps) {
  const [location, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { databaseUser } = useAuth()

  // Delete vocabulary mutation
  const deleteVocabularyMutation = useMutation({
    mutationFn: (vocabularyId: number) => api.vocabulary.delete(vocabularyId),
    onMutate: async (vocabularyId) => {
      // Cancel outgoing refetches to prevent interference
      await queryClient.cancelQueries({ queryKey: ["/api/users", databaseUser?.id, "vocabulary"] });
      
      // Snapshot the previous value
      const previousVocabulary = queryClient.getQueryData(["/api/users", databaseUser?.id, "vocabulary"]);
      
      // Optimistically update to remove the deleted item
      queryClient.setQueryData(["/api/users", databaseUser?.id, "vocabulary"], (old: any) => {
        return old ? old.filter((item: any) => item.id !== vocabularyId) : old;
      });
      
      return { previousVocabulary };
    },
    onError: (err, vocabularyId, context) => {
      // Revert on error
      if (context?.previousVocabulary) {
        queryClient.setQueryData(["/api/users", databaseUser?.id, "vocabulary"], context.previousVocabulary);
      }
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      if (databaseUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary", "stats"] });
      }
    }
  })

  // Fetch vocabulary stats
  const { data: vocabularyStats } = useQuery({
    queryKey: ["/api/users", databaseUser?.id, "vocabulary", "stats"],
    enabled: !!databaseUser?.id
  })

  // VocabularyItem component
  function VocabularyItem({ word, index }: { word: Vocabulary; index: number }) {
    const [translateX, setTranslateX] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCollapsing, setIsCollapsing] = useState(false)
    const [startX, setStartX] = useState(0)
    
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-500'
      if (score >= 70) return 'text-blue-500'
      if (score >= 50) return 'text-yellow-500'
      return 'text-red-500'
    }

    const getDifficultyColor = (difficulty: string) => {
      switch (difficulty) {
        case 'easy': return 'text-green-500'
        case 'medium': return 'text-yellow-500'
        case 'hard': return 'text-red-500'
        default: return 'spotify-text-muted'
      }
    }

    const isOverdue = word.nextReviewDate && new Date(word.nextReviewDate) <= new Date()

    // Handle touch events for swipe-to-delete
    const handleTouchStart = (e: React.TouchEvent) => {
      setStartX(e.touches[0].clientX)
      setIsDragging(true)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return
      
      const currentX = e.touches[0].clientX
      const diffX = currentX - startX
      
      // Only allow swiping left (negative direction)
      if (diffX < 0) {
        setTranslateX(Math.max(diffX, -120)) // Limit to -120px
      }
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      
      // If swiped more than 60px, trigger delete animation
      if (translateX < -60) {
        handleDelete()
      } else {
        // Snap back to original position
        setTranslateX(0)
      }
    }

    const handleDelete = async () => {
      // Start collapse animation immediately
      setIsCollapsing(true)
      setTranslateX(-window.innerWidth)
      
      // Wait for full animation to complete before API call
      setTimeout(async () => {
        try {
          await deleteVocabularyMutation.mutateAsync(word.id)
          setIsDeleting(true) // This will cause the component to return null
        } catch (error) {
          console.error('Failed to delete vocabulary:', error)
          // Reset states on error
          setIsDeleting(false)
          setIsCollapsing(false)
          setTranslateX(0)
        }
      }, 600) // Wait for both slide (300ms) + collapse (300ms)
    }

    // Don't render anything if we're deleting (item removed from list)
    if (isDeleting) {
      return null
    }

    return (
      <div 
        className={`relative overflow-hidden transition-all duration-300 ease-out ${
          isCollapsing ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
        }`}
        style={{
          marginBottom: isCollapsing ? '0px' : '12px',
          transition: isCollapsing 
            ? 'max-height 0.3s ease-out, opacity 0.3s ease-out, margin-bottom 0.3s ease-out' 
            : 'margin-bottom 0.2s ease-out'
        }}
      >
        {/* Delete background */}
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-lg">
          <Trash2 className="h-6 w-6 text-white" />
        </div>
        
        {/* Main content */}
        <div 
          className="spotify-card p-4 hover:bg-[var(--spotify-light-gray)] transition-all duration-200 relative"
          style={{ 
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isOverdue ? 'bg-orange-500 text-white' : 'bg-[var(--spotify-green)] text-black'
                }`}>
                  {word.memorizationScore || 50}%
                </div>
                {isOverdue && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="spotify-text-primary font-semibold text-lg">{word.word}</p>
                  {isOverdue && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      Due
                    </span>
                  )}
                </div>
                <p className="spotify-text-secondary">{word.translation}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${getDifficultyColor(word.difficulty)}`}>
                {word.difficulty}
              </div>
              {word.songName && (
                <p className="spotify-text-muted text-sm font-medium mb-1">
                  From: {word.songName}
                </p>
              )}
              {word.context && (
                <div className="max-w-xs">
                  <p className="spotify-text-muted text-sm italic break-words">
                    "{word.context}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="spotify-card p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Review Button */}
      {vocabularyStats && vocabularyStats.dueCount > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setLocation('/review-session')}
            className="w-full spotify-card p-4 hover:bg-[var(--spotify-light-gray)] transition-colors duration-200 border-2 border-[var(--spotify-green)] text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="spotify-text-primary font-semibold text-lg mb-1">
                  {vocabularyStats.dueCount} words ready for review
                </h3>
                <p className="spotify-text-muted text-sm">
                  Practice spaced repetition to improve memory
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-[var(--spotify-green)]" />
                <span className="text-[var(--spotify-green)] font-medium">Review</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Statistics */}
      {vocabularyStats && vocabulary.length > 0 && (
        <div className="bg-spotify-card rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold spotify-text-primary">{vocabularyStats.masteredCount}</div>
              <div className="text-sm spotify-text-muted flex items-center justify-center gap-1">
                <Target className="h-3 w-3" />
                Mastered
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{vocabularyStats.dueCount}</div>
              <div className="text-sm spotify-text-muted flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Due for Review
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-spotify-accent">{vocabularyStats.averageScore}%</div>
              <div className="text-sm spotify-text-muted">Average Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{vocabularyStats.streak}</div>
              <div className="text-sm spotify-text-muted flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Day Streak
              </div>
            </div>
          </div>
        </div>
      )}
      
      {vocabulary.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 spotify-text-muted mx-auto mb-4" />
          <h3 className="spotify-heading-md mb-2">No vocabulary yet</h3>
          <p className="spotify-text-muted">Words you learn will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vocabulary.map((word, index) => (
            <VocabularyItem key={word.id} word={word} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}