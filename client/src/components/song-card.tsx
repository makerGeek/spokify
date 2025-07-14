import { Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudio } from "@/hooks/use-audio";
import { useQuery } from "@tanstack/react-query";
import { type Song } from "@shared/schema";

interface SongCardProps {
  song: Song;
  onClick: () => void;
}

export default function SongCard({ song, onClick }: SongCardProps) {
  const { play, setCurrentSong, currentSong } = useAudio();

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If it's a different song, set it and start playing
    if (!currentSong || currentSong.id !== song.id) {
      setCurrentSong(song);
      // Use setTimeout to ensure the song is set before playing
      setTimeout(() => {
        play();
      }, 100);
    } else {
      // If it's the same song, just start playing
      play();
    }
  };

  // Get user progress for this song - use a consistent value based on song ID
  // For now, create a deterministic "progress" based on song properties until we have real user tracking
  const progress = Math.floor((song.id * song.rating * 1.3) % 100);

  return (
    <Card className="song-card bg-spotify-card border-spotify-card cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 flex items-center space-x-4">
        <img
          src={song.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"}
          alt="Album cover"
          className="w-16 h-16 rounded-lg object-cover"
        />
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-spotify-text">{song.title}</h3>
          <p className="text-spotify-muted text-sm">{song.artist}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
              {song.difficulty}
            </span>
            <span className="text-xs text-spotify-muted">{song.genre}</span>
            <div className="flex items-center space-x-1">
              <Star className="text-yellow-400" size={12} />
              <span className="text-xs text-spotify-muted">{(song.rating / 10).toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            progress > 0 
              ? "bg-gradient-to-br from-spotify-green to-spotify-accent" 
              : "bg-spotify-bg border border-spotify-muted"
          }`}>
            <span className={`text-xs font-bold ${
              progress > 0 ? "text-white" : "text-spotify-muted"
            }`}>
              {progress}%
            </span>
          </div>
          <Button
            size="sm"
            className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
            onClick={handlePlayClick}
          >
            <Play size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
