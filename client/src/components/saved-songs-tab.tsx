import { Heart } from 'lucide-react'

import { type Song } from '@shared/schema'
import { useAudio } from '@/hooks/use-audio'
import SongCard from '@/components/song-card'

interface SavedSongsTabProps {
  savedSongs: Song[]
  isLoading: boolean
}

export default function SavedSongsTab({ savedSongs, isLoading }: SavedSongsTabProps) {
  const { setCurrentSong } = useAudio()

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="spotify-card p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded"></div>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="spotify-heading-lg">Liked Songs</h2>
        <p className="spotify-text-muted text-sm">{savedSongs.length} songs</p>
      </div>
      
      {savedSongs.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 spotify-text-muted mx-auto mb-4" />
          <h3 className="spotify-heading-md mb-2">No saved songs yet</h3>
          <p className="spotify-text-muted">Songs you bookmark will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPlay={() => handlePlaySong(song)}
            />
          ))}
        </div>
      )}
    </div>
  )
}