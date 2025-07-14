import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Heart, BookOpen, Play, MoreVertical } from 'lucide-react'
import { useLocation } from 'wouter'
import BottomNavigation from '@/components/bottom-navigation'
import { type Song, type Vocabulary, type UserProgress } from '@shared/schema'
import { useAudio } from '@/hooks/use-audio'

export default function Library() {
  const [_, setLocation] = useLocation()
  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'vocabulary'>('saved')
  const { setCurrentSong } = useAudio()

  // Fetch data for each tab
  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    retry: false
  })

  const { data: vocabulary = [] } = useQuery<Vocabulary[]>({
    queryKey: ["/api/users/1/vocabulary"],
    retry: false
  })

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/users/1/progress"],
    retry: false
  })

  // Mock saved songs (in real app, would come from user's saved songs)
  const savedSongs = songs.slice(0, 5)
  
  // Mock history based on user progress
  const recentSongs = songs.filter(song => 
    userProgress.some(p => p.songId === song.id)
  ).slice(0, 10)

  const handleSongPlay = (song: Song) => {
    setCurrentSong(song, true)
    setLocation(`/lyrics/${song.id}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen spotify-bg spotify-text-primary">
      {/* Header */}
      <div className="px-6 pt-16 pb-4">
        <h1 className="spotify-heading-xl mb-8">Your Library</h1>
        
        {/* Tabs */}
        <div className="flex space-x-0 mb-6">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === 'saved'
                ? 'bg-[var(--spotify-green)] text-black'
                : 'bg-[var(--spotify-light-gray)] spotify-text-secondary hover:bg-[var(--spotify-border)]'
            }`}
          >
            <Heart className="inline w-4 h-4 mr-2" />
            Saved Songs
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ml-2 ${
              activeTab === 'history'
                ? 'bg-[var(--spotify-green)] text-black'
                : 'bg-[var(--spotify-light-gray)] spotify-text-secondary hover:bg-[var(--spotify-border)]'
            }`}
          >
            <Clock className="inline w-4 h-4 mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
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
      <div className="px-6 pb-24">
        {/* Saved Songs Tab */}
        {activeTab === 'saved' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="spotify-heading-lg">Liked Songs</h2>
              <p className="spotify-text-muted text-sm">{savedSongs.length} songs</p>
            </div>
            
            {savedSongs.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 spotify-text-muted mx-auto mb-4" />
                <h3 className="spotify-heading-md mb-2">No saved songs yet</h3>
                <p className="spotify-text-muted">Songs you like will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="group flex items-center p-3 rounded-lg hover:bg-[var(--spotify-light-gray)] transition-colors duration-200 cursor-pointer"
                    onClick={() => handleSongPlay(song)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 mr-4">
                      <span className="spotify-text-muted text-sm group-hover:hidden">
                        {index + 1}
                      </span>
                      <Play className="h-5 w-5 spotify-text-primary hidden group-hover:block" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="spotify-text-primary font-medium truncate">{song.title}</p>
                      <p className="spotify-text-muted text-sm truncate">{song.artist}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="spotify-text-muted text-sm">{song.genre}</span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-5 w-5 spotify-text-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="spotify-heading-lg">Recently Played</h2>
              <p className="spotify-text-muted text-sm">{recentSongs.length} songs</p>
            </div>
            
            {recentSongs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 spotify-text-muted mx-auto mb-4" />
                <h3 className="spotify-heading-md mb-2">No recent activity</h3>
                <p className="spotify-text-muted">Songs you've played will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSongs.map((song, index) => {
                  const progress = userProgress.find(p => p.songId === song.id)
                  return (
                    <div
                      key={song.id}
                      className="group flex items-center p-3 rounded-lg hover:bg-[var(--spotify-light-gray)] transition-colors duration-200 cursor-pointer"
                      onClick={() => handleSongPlay(song)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 mr-4">
                        <span className="spotify-text-muted text-sm group-hover:hidden">
                          {index + 1}
                        </span>
                        <Play className="h-5 w-5 spotify-text-primary hidden group-hover:block" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="spotify-text-primary font-medium truncate">{song.title}</p>
                        <p className="spotify-text-muted text-sm truncate">{song.artist}</p>
                        {progress && (
                          <div className="flex items-center mt-1">
                            <div className="w-16 h-1 bg-[var(--spotify-light-gray)] rounded-full overflow-hidden mr-2">
                              <div 
                                className="h-full bg-[var(--spotify-green)] rounded-full"
                                style={{ width: `${progress.progressPercentage}%` }}
                              />
                            </div>
                            <span className="spotify-text-muted text-xs">
                              {progress.progressPercentage}% complete
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="spotify-text-muted text-sm">{song.genre}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-5 w-5 spotify-text-muted" />
                        </button>
                      </div>
                    </div>
                  )
                })}
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
                  <div
                    key={word.id}
                    className="spotify-card p-4 hover:bg-[var(--spotify-light-gray)] transition-colors duration-200"
                  >
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
                        {word.context && (
                          <p className="spotify-text-muted text-sm italic max-w-xs truncate">
                            "{word.context}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="library" />
    </div>
  )
}