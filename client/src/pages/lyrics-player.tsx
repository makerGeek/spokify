import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranslationOverlay from "@/components/translation-overlay";

import MiniPlayer from "@/components/mini-player";
import { useAudio } from "@/hooks/use-audio";
import { type Song } from "@shared/schema";

export default function LyricsPlayer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const songId = parseInt(params.id || "0");
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showTranslationMode, setShowTranslationMode] = useState(false);

  const { currentSong, setCurrentSong, currentTime, duration, seekTo } = useAudio();

  const { data: song, isLoading } = useQuery<Song>({
    queryKey: ["/api/songs", songId],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${songId}`);
      if (!response.ok) throw new Error("Failed to fetch song");
      return response.json();
    }
  });

  // Initialize YouTube player for this song when it loads
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      console.log("Lyrics page: Setting current song to", song.title);
      setCurrentSong(song, false); // Don't auto-play from lyrics page
    }
  }, [song, currentSong, setCurrentSong]);

  const handleCloseLyrics = () => {
    setLocation("/home");
  };

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

  // Auto-scroll to keep active lyric line centered
  useEffect(() => {
    if (!song?.lyrics || !Array.isArray(song.lyrics)) return;
    
    const activeLyricIndex = song.lyrics.findIndex((line: any, index: number) => {
      const nextLine = song.lyrics[index + 1];
      return isLineActive(line, nextLine);
    });

    if (activeLyricIndex !== -1) {
      const activeElement = document.getElementById(`lyric-line-${activeLyricIndex}`);
      const container = document.getElementById('lyrics-container');
      
      if (activeElement && container) {
        // Calculate position to keep active line centered
        const containerHeight = container.clientHeight;
        const elementOffsetTop = activeElement.offsetTop;
        const elementHeight = activeElement.offsetHeight;
        
        // Center the active line in the viewport
        const scrollTop = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, song?.lyrics]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4"></div>
          <p className="text-spotify-muted">Loading song...</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-spotify-muted">Song not found</p>
          <Button onClick={handleCloseLyrics} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-500 via-red-600 to-red-700"></div>
      
      {/* Header with Song Info */}
      <div className="relative z-10 p-4 pt-12">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-0"
            onClick={handleCloseLyrics}
          >
            <ArrowDown size={20} />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className={`${showTranslationMode ? "bg-white/20" : "bg-white/10"} text-white hover:bg-white/20 border-0`}
              onClick={() => setShowTranslationMode(!showTranslationMode)}
            >
              <Languages size={16} className="mr-1" />
              Translate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-0"
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <Bookmark className={isBookmarked ? "text-white" : "text-white/80"} size={20} />
            </Button>
          </div>
        </div>

        {/* Song Title and Artist */}
        <div className="text-center text-white mb-2">
          <h1 className="text-lg font-bold">{song.title}</h1>
          <p className="text-sm opacity-80">{song.artist}</p>
        </div>

        {/* Music Note Icon */}
        <div className="flex justify-start mb-8">
          <div className="w-6 h-6 text-white/60">♪</div>
        </div>
      </div>

      {/* Lyrics Container - Full Screen with Centered Current Line */}
      <div 
        className="relative z-10 px-6 pb-32"
        id="lyrics-container"
        style={{ 
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div className="flex flex-col" style={{ minHeight: '100%' }}>
          {/* Spacer to center content */}
          <div className="flex-1"></div>
          
          {Array.isArray(song.lyrics) ? song.lyrics.map((line: any, index: number) => {
            const nextLine = song.lyrics[index + 1];
            const isActive = isLineActive(line, nextLine);
            
            return (
              <div
                key={index}
                id={`lyric-line-${index}`}
                className={`cursor-pointer transition-all duration-300 py-2 px-2 rounded-lg ${
                  isActive 
                    ? "text-white font-semibold text-2xl leading-relaxed" 
                    : "text-white/40 text-lg leading-relaxed"
                }`}
                onClick={() => handleLineClick(line)}
                style={{
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center'
                }}
              >
                <div className="text-left font-medium">
                  {line.text}
                </div>
                {showTranslationMode && line.translation && isActive && (
                  <div className="text-white/60 text-base mt-2 italic">
                    {line.translation}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-white/60 text-center py-8 text-lg">
              No lyrics available
            </div>
          )}
          
          {/* Spacer to center content */}
          <div className="flex-1"></div>
        </div>
      </div>

      {/* Mini Player Component */}
      <MiniPlayer />

      {/* Translation Overlay */}
      {showTranslation && selectedLine && (
        <TranslationOverlay
          line={selectedLine}
          onClose={() => setShowTranslation(false)}
          songId={songId}
        />
      )}
    </div>
  );
}
