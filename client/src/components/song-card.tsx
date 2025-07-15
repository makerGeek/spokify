import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudio } from "@/hooks/use-audio";
import { useMarquee } from "@/hooks/use-marquee";

import { type Song } from "@shared/schema";

interface SongCardProps {
  song: Song;
  onClick: () => void;
}

export default function SongCard({ song, onClick }: SongCardProps) {
  const { setCurrentSong, currentSong } = useAudio();
  const { textRef: titleRef, containerRef } = useMarquee({ text: song.title });

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Always set the song with auto-play flag
    setCurrentSong(song, true); // Second parameter indicates auto-play
  };



  return (
    <Card className="song-card bg-spotify-card border-spotify-card cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 flex items-center space-x-4">
        <img
          src={song.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"}
          alt="Album cover"
          className="w-16 h-16 rounded-lg object-cover"
        />
        
        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="overflow-hidden whitespace-nowrap relative">
            <h3 ref={titleRef} className="font-semibold text-lg text-spotify-text inline-block marquee-text">
              {song.title}
            </h3>
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
            <Play size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
