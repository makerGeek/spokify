import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudio } from "@/hooks/use-audio";
import { useEffect, useRef } from "react";

import { type Song } from "@shared/schema";

interface SongCardProps {
  song: Song;
  onClick: () => void;
}

export default function SongCard({ song, onClick }: SongCardProps) {
  const { setCurrentSong, currentSong } = useAudio();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Always set the song with auto-play flag
    setCurrentSong(song, true); // Second parameter indicates auto-play
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (titleRef.current && containerRef.current) {
        const isOverflowing = titleRef.current.scrollWidth > containerRef.current.clientWidth;
        if (isOverflowing) {
          // Calculate animation duration based on text length
          // Base speed: ~50 pixels per second for consistent movement
          const textWidth = titleRef.current.scrollWidth;
          const containerWidth = containerRef.current.clientWidth;
          const overflowDistance = textWidth - containerWidth;
          const scrollDuration = Math.max(3, overflowDistance / 50); // Minimum 3 seconds
          const totalDuration = scrollDuration + 4; // Add 4 seconds for pauses (2s start + 2s end)
          
          titleRef.current.style.animationDuration = `${totalDuration}s`;
          titleRef.current.classList.add('animate-marquee');
        } else {
          titleRef.current.classList.remove('animate-marquee');
          titleRef.current.style.animationDuration = '';
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [song.title]);



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
