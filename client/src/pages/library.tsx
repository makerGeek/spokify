import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, BookOpen, Brain, Target, Zap, Trash2 } from 'lucide-react'
import { useLocation } from 'wouter'

import { type Song, type Vocabulary } from '@shared/schema'
import { useAudio } from '@/hooks/use-audio'
import { useAuth } from '@/contexts/auth-context'
import { useBookmarks } from '@/hooks/use-bookmarks'
import { api } from '@/lib/api-client'
import SongCard from '@/components/song-card'
import AppHeader from '@/components/app-header'

export default function Library() {
  const [location, setLocation] = useLocation()
  const queryClient = useQueryClient()
  
  // Get active tab from URL params or default to 'saved'
  const searchParams = new URLSearchParams(window.location.search)
  const tabFromUrl = searchParams.get('tab') as 'saved' | 'vocabulary' | null
  const [activeTab, setActiveTab] = useState<'saved' | 'vocabulary'>(tabFromUrl || 'saved')
  
  // Update URL when tab changes
  const handleTabChange = (tab: 'saved' | 'vocabulary') => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }
  const { setCurrentSong } = useAudio()
  const { user, databaseUser } = useAuth()
  const { bookmarkedSongs, isLoading: isLoadingBookmarks } = useBookmarks()

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

  // Fetch data for each tab
  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    queryFn: () => api.songs.getAll(),
    retry: false
  })

  const { data: vocabulary = [] } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getVocabulary(databaseUser.id);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  })

  // Fetch vocabulary stats for spaced repetition
  const { data: vocabularyStats } = useQuery({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary", "stats"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return { totalWords: 0, dueCount: 0, masteredCount: 0, averageScore: 0, streak: 0 };
      return api.users.getVocabularyStats(databaseUser.id);
    },
    enabled: !!databaseUser?.id && !!user,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  })

  // Use real bookmarked songs from the database
  const savedSongs = bookmarkedSongs

  const handleSongClick = (songId: number) => {
    setLocation(`/lyrics/${songId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }


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
          className="spotify-card-nohover p-4 relative"
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

  return (
    <div className="min-h-screen spotify-bg spotify-text-primary">
      <AppHeader />

      {/* Scrollable Container */}
      <div className="overflow-y-auto px-6 pt-8 pb-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="spotify-heading-xl mb-8">Your Library</h1>
          
          {/* Tabs */}
          <div className="flex space-x-0 mb-6">
            <button
              onClick={() => handleTabChange('saved')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === 'saved'
                  ? 'bg-[var(--spotify-green)] text-black'
                  : 'bg-[var(--spotify-light-gray)] spotify-text-secondary hover:bg-[var(--spotify-border)]'
              }`}
            >
              <Heart className="inline w-4 h-4 mr-2" />
              Saved
            </button>
            <button
              onClick={() => handleTabChange('vocabulary')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ml-2 ${
                activeTab === 'vocabulary'
                  ? 'bg-[var(--spotify-green)] text-black'
                  : 'bg-[var(--spotify-light-gray)] spotify-text-secondary hover:bg-[var(--spotify-border)]'
              }`}
            >
              <BookOpen className="inline w-4 h-4 mr-2" />
              Vocabulary
            </button>
          </div>
        </div>

        {/* Content */}
        {/* Saved Songs Tab */}
        {activeTab === 'saved' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="spotify-heading-lg">Liked Songs</h2>
              <p className="spotify-text-muted text-sm">{savedSongs.length} songs</p>
            </div>
            
            {isLoadingBookmarks ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
                <p className="spotify-text-muted">Loading your saved songs...</p>
              </div>
            ) : savedSongs.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 spotify-text-muted mx-auto mb-4" />
                <h3 className="spotify-heading-md mb-2">No saved songs yet</h3>
                <p className="spotify-text-muted">Songs you like will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onClick={() => handleSongClick(song.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}


        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="spotify-heading-lg">Your Vocabulary</h2>
                <p className="spotify-text-muted text-sm">{vocabulary.length} words</p>
              </div>
              {vocabularyStats && vocabularyStats.dueCount > 0 && (
                <button
                  onClick={() => setLocation('/review-session')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium transition-colors"
                >
                  <Brain className="h-4 w-4" />
                  Review {vocabularyStats.dueCount} {vocabularyStats.dueCount === 1 ? 'due word' : 'due words'}
                </button>
              )}
            </div>

            {/* Stats Section */}
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
              <div className="space-y-3 vocabulary">
                {vocabulary.map((word, index) => (
                  <VocabularyItem key={word.id} word={word} index={index} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}