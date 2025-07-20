import { Play, Pause, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudio } from "@/hooks/use-audio";
import { useMarquee } from "@/hooks/use-marquee";
import { useAuth } from "@/contexts/auth-context";
import { useSongAccess } from "@/hooks/use-song-access";
import { usePremium } from "@/hooks/use-premium";
import { trackEvent } from "@/lib/analytics";

import { type Song } from "@shared/schema";

interface SongCardProps {
  song: Song & { canAccess?: boolean; requiresPremium?: boolean };
  onClick: () => void;
  onPremiumRequested?: (song: Song) => void;
  onActivationRequired?: (song: Song) => void;
}

export default function SongCard({ song, onClick, onPremiumRequested, onActivationRequired }: SongCardProps) {
  const { setCurrentSong, currentSong, isPlaying, togglePlay } = useAudio();
  const { user } = useAuth();
  const { checkSongAccess } = useSongAccess();
  const { canAccessPremiumContent, isPremium } = usePremium();
  const { textRef: titleRef, containerRef } = useMarquee({ text: song.title });

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is authenticated
    if (!user) {
      if (onPremiumRequested) {
        onPremiumRequested(song);
      }
      return;
    }
    
    // Check if this is a premium song (not free) and user doesn't have active subscription
    if (!song.isFree && !canAccessPremiumContent) {
      if (onPremiumRequested) {
        onPremiumRequested(song);
      }
      return;
    }
    
    // If this is already the current song, just toggle play/pause
    if (currentSong?.id === song.id) {
      // Toggle play state for current song
      trackEvent('song_toggled', 'music', song.title, song.id);
      togglePlay();
      return;
    }
    
    // User has access - play the song
    trackEvent('song_played', 'music', song.title, song.id);
    setCurrentSong(song, true); // Second parameter indicates auto-play
  };

  const handleCardClick = () => {
    // Check if user is authenticated
    if (!user) {
      if (onPremiumRequested) {
        onPremiumRequested(song);
      }
      return;
    }
    
    // Check if this is a premium song (not free) and user doesn't have active subscription
    if (!song.isFree && !canAccessPremiumContent) {
      if (onPremiumRequested) {
        onPremiumRequested(song);
      }
      return;
    }
    
    // Track lyrics opening
    trackEvent('lyrics_opened', 'music', song.title, song.id);
    
    // If this is not the current song, set it and auto-play
    if (currentSong?.id !== song.id) {
      setCurrentSong(song, true); // Auto-play the song
    }
    
    // Always open lyrics overlay
    onClick(); // Open lyrics overlay
  };



  return (
    <Card className="song-card bg-spotify-card border-spotify-card cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-4 flex items-center space-x-4">
        <img
          src={song.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"}
          alt="Album cover"
          className="w-16 h-16 rounded-lg object-cover"
        />
        
        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="overflow-hidden whitespace-nowrap relative flex items-center gap-2">
            <h3 ref={titleRef} className="font-semibold text-lg text-spotify-text inline-block marquee-text">
              {song.title}
            </h3>
            {song.isFree && (
              <span className="free-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white">
                FREE
              </span>
            )}
          </div>
          <p className="text-spotify-muted text-sm truncate">{song.artist}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
              {song.difficulty}
            </span>
            <span className="text-xs text-spotify-muted">{song.genre}</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <Button
            size="sm"
            className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
            onClick={handlePlayClick}
          >
            {currentSong?.id === song.id && isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
