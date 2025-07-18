import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Languages, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TranslationOverlay from "@/components/translation-overlay";

import { useAudio } from "@/hooks/use-audio";
import { type Song } from "@shared/schema";

interface LyricsOverlayProps {
  songId: number;
  onClose: () => void;
  isVisible: boolean;
}

export default function LyricsOverlay({ songId, onClose, isVisible }: LyricsOverlayProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showTranslationMode, setShowTranslationMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const { currentSong, setCurrentSong, currentTime, duration, seekTo } = useAudio();

  const { data: song, isLoading } = useQuery<Song>({
    queryKey: ["/api/songs", songId],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${songId}`);
      if (!response.ok) throw new Error("Failed to fetch song");
      return response.json();
    },
    enabled: isVisible && songId > 0
  });

  // Initialize YouTube player for this song when it loads
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      console.log("Lyrics overlay: Setting current song to", song.title);
      setCurrentSong(song, false); // Don't auto-play from lyrics overlay
    }
  }, [song, currentSong, setCurrentSong]);

  const handleLineClick = (line: any) => {
    // Seek to the timestamp of the clicked line
    if (line.timestamp !== undefined) {
      seekTo(line.timestamp);
    }
    setSelectedLine(line);
    setShowTranslation(true);
  };

  // Function to determine if a lyric line is currently active
  const isLineActive = (line: any, nextLine: any) => {
    if (!line.timestamp) return false;
    
    const lineTime = line.timestamp;
    const nextLineTime = nextLine?.timestamp || (duration || 0);
    
    return currentTime >= lineTime && currentTime < nextLineTime;
  };

  // Handle animation state changes
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure the component is rendered in hidden state first
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      // Start closing animation
      setIsAnimating(false);
    }
  }, [isVisible]);

  // Auto-scroll to keep active lyric line centered
  useEffect(() => {
    if (!autoScroll || !song?.lyrics || !Array.isArray(song.lyrics)) return;
    
    const activeLyricIndex = song.lyrics.findIndex((line: any, index: number) => {
      const nextLine = song.lyrics[index + 1];
      return isLineActive(line, nextLine);
    });

    if (activeLyricIndex !== -1) {
      const activeElement = document.getElementById(`lyric-line-${activeLyricIndex}`);
      const container = document.getElementById('lyrics-container');
      
      if (activeElement && container) {
        // Always center the active line, regardless of position
        const containerHeight = container.clientHeight;
        const elementHeight = activeElement.offsetHeight;
        const scrollTop = activeElement.offsetTop - (containerHeight / 2) + (elementHeight / 2);
        
        // Smooth scroll to center the active line
        container.scrollTo({
          top: Math.max(0, scrollTop), // Ensure we don't scroll to negative values
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, song?.lyrics, autoScroll]);

  const handleClose = () => {
    setIsAnimating(false);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible && !isAnimating) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-50 bg-spotify-bg flex items-center justify-center transition-transform duration-300 ease-out ${
        isVisible && isAnimating ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4"></div>
          <p className="text-spotify-muted">Loading song...</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className={`fixed inset-0 z-50 bg-spotify-bg flex items-center justify-center transition-transform duration-300 ease-out ${
        isVisible && isAnimating ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="text-center">
          <p className="text-spotify-muted">Song not found</p>
          <Button onClick={handleClose} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 bg-spotify-bg pb-32 overflow-x-hidden transition-transform duration-300 ease-out ${
      isVisible && isAnimating ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Main Content - Full Height Lyrics */}
      <div className="p-4 w-full max-w-full">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-spotify-card rounded-full p-0"
            onClick={handleClose}
          >
            <ArrowDown className="text-spotify-muted" size={20} />
          </Button>
          <div className="flex items-center space-x-2">
            <TooltipProvider delayDuration={700}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-spotify-card rounded-full px-3 py-1 cursor-pointer">
                    <RotateCcw size={14} className={autoScroll ? "text-spotify-green" : "text-spotify-muted"} />
                    <Switch
                      checked={autoScroll}
                      onCheckedChange={setAutoScroll}
                      className="data-[state=checked]:bg-spotify-green"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  className="bg-black text-white border-gray-700 text-sm px-3 py-2 max-w-xs"
                  sideOffset={8}
                >
                  <p>Auto-scroll</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              className={`${showTranslationMode ? "bg-spotify-green" : "bg-spotify-card border-spotify-muted"} text-white`}
              onClick={() => setShowTranslationMode(!showTranslationMode)}
            >
              <Languages size={16} className="mr-1" />
              Translate
            </Button>
            <div className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
              {song.difficulty}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 bg-spotify-card rounded-full p-0"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Bookmark className={isBookmarked ? "text-spotify-green" : "text-spotify-muted"} size={20} />
            </Button>
          </div>
        </div>
        
        <div className="space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain" 
             id="lyrics-container"
             style={{ 
               height: 'calc(100vh - 240px)', // Screen minus header, controls, and bottom sections
               WebkitOverflowScrolling: 'touch',
               scrollBehavior: 'smooth',
               touchAction: 'pan-y',
               overflowAnchor: 'none',
               width: '100%'
             }}>
          {Array.isArray(song.lyrics) ? song.lyrics.map((line: any, index: number) => {
            const nextLine = song.lyrics[index + 1];
            const isActive = isLineActive(line, nextLine);
            
            return (
              <div
                key={index}
                id={`lyric-line-${index}`}
                className={`cursor-pointer hover:bg-spotify-card/30 active:bg-spotify-card/50 rounded-lg px-3 py-2 transition-all duration-300 touch-manipulation w-full ${
                  isActive 
                    ? "lyrics-highlight transform scale-105 shadow-lg bg-spotify-card/20" 
                    : "text-spotify-muted hover:text-spotify-text"
                }`}
                onClick={() => handleLineClick(line)}
              >
                <span className="text-lg leading-snug block text-center break-words w-full">{line.text}</span>
                {showTranslationMode && line.translation && (
                  <div className="text-sm text-spotify-muted mt-1 italic text-center break-words w-full">
                    {line.translation}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-spotify-muted text-center py-8">
              No lyrics available
            </div>
          )}
        </div>
      </div>

      {/* Translation Overlay */}
      {showTranslation && selectedLine && (
        <TranslationOverlay
          line={selectedLine}
          onClose={() => setShowTranslation(false)}
          songId={songId}
          songName={song.title}
          songLanguage={song.language}
        />
      )}
    </div>
  );
}