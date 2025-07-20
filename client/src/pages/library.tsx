import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, BookOpen } from 'lucide-react'
import { useLocation } from 'wouter'

import { type Song, type Vocabulary } from '@shared/schema'
import { useAudio } from '@/hooks/use-audio'
import { useMarquee } from '@/hooks/use-marquee'
import { useAuth } from '@/contexts/auth-context'
import { useBookmarks } from '@/hooks/use-bookmarks'
import { api } from '@/lib/api-client'
import SongCard from '@/components/song-card'

export default function Library() {
  const [location, setLocation] = useLocation()
  
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

  // VocabularyItem component with marquee animation for context
  function VocabularyItem({ word, index }: { word: Vocabulary; index: number }) {
    const { textRef: contextRef, containerRef: contextContainerRef } = useMarquee({ 
      text: word.context || '', 
      enabled: !!word.context 
    });

    return (
      <div className="spotify-card p-4 hover:bg-[var(--spotify-light-gray)] transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-[var(--spotify-green)] rounded-full flex items-center justify-center text-black text-sm font-bold">
              {index + 1}
            </div>
            <div>
              <p className="spotify-text-primary font-semibold text-lg">{word.word}</p>
              <p className="spotify-text-secondary">{word.translation}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--spotify-light-gray)] spotify-text-muted text-xs font-medium mb-1">
              {word.difficulty}
            </div>
            {word.songName && (
              <p className="spotify-text-muted text-sm font-medium mb-1">
                From: {word.songName}
              </p>
            )}
            {word.context && (
              <div ref={contextContainerRef} className="max-w-xs overflow-hidden whitespace-nowrap relative">
                <p ref={contextRef} className="spotify-text-muted text-sm italic inline-block marquee-text">
                  "{word.context}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen spotify-bg spotify-text-primary">
      {/* Scrollable Container */}
      <div className="overflow-y-auto px-6 pt-16 pb-24">
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="spotify-heading-lg">Your Vocabulary</h2>
              <p className="spotify-text-muted text-sm">{vocabulary.length} words</p>
            </div>
            
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
        )}
      </div>
    </div>
  )
}