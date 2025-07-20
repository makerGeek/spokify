import { ComponentErrorBoundary } from '@/components/error-boundary';
import { SongCard } from '@/components/song-card';
import { trackLearningActivity } from '@/lib/tracking';
import { Song } from '@/lib/types';

interface EnhancedSongCardProps {
  song: Song;
  onPlay?: (song: Song) => void;
  className?: string;
}

export function EnhancedSongCard({ song, onPlay, className }: EnhancedSongCardProps) {
  const handlePlay = (song: Song) => {
    trackLearningActivity('song_play', {
      song_id: song.id,
      song_title: song.title,
      language: song.language,
      difficulty: song.difficulty
    });
    
    onPlay?.(song);
  };

  return (
    <ComponentErrorBoundary componentName="Song Card">
      <SongCard 
        song={song} 
        onPlay={handlePlay}
        className={className}
      />
    </ComponentErrorBoundary>
  );
}