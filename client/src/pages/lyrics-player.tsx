import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import TranslationOverlay from "@/components/translation-overlay";
import BottomNavigation from "@/components/bottom-navigation";
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

  const { isPlaying, togglePlay, currentSong, setCurrentSong, currentTime, duration, seekTo } = useAudio();

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

  // Auto-scroll to active lyric line
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
        // Mobile-friendly scrolling approach
        const containerRect = container.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();
        
        // Check if element is outside the visible area
        const isAbove = elementRect.top < containerRect.top;
        const isBelow = elementRect.bottom > containerRect.bottom;
        
        if (isAbove || isBelow) {
          // Calculate scroll position to center the element
          const containerHeight = container.clientHeight;
          const elementHeight = activeElement.offsetHeight;
          const scrollTop = activeElement.offsetTop - (containerHeight / 2) + (elementHeight / 2);
          
          // Smooth scroll with explicit mobile compatibility
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
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
    <div className="fixed inset-0 bg-spotify-bg z-50 flex flex-col">
      {/* Player Header */}
      <div className="flex items-center justify-between p-4 border-b border-spotify-card">
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 bg-spotify-card rounded-full p-0"
          onClick={handleCloseLyrics}
        >
          <ArrowDown className="text-spotify-muted" size={20} />
        </Button>
        <div className="flex items-center space-x-3">
          {/* Small Album Cover */}
          <div className="w-12 h-12 rounded-lg overflow-hidden">
            <img
              src={song.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"}
              alt="Album cover"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-spotify-text">{song.title}</h3>
            <p className="text-spotify-muted text-sm">{song.artist}</p>
          </div>
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

      {/* Lyrics Section - Maximized */}
      <div className="flex-1 bg-spotify-card border-t border-spotify-card pb-32">
        <div className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-spotify-text">Interactive Lyrics</h4>
            <div className="flex items-center space-x-2">
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
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto overscroll-contain" 
               id="lyrics-container"
               style={{ 
                 height: 'calc(100vh - 280px)', // Screen minus header (64px), controls (128px), bottom nav (64px), padding (24px)
                 WebkitOverflowScrolling: 'touch',
                 scrollBehavior: 'smooth',
                 touchAction: 'pan-y',
                 overflowAnchor: 'none'
               }}>
            {Array.isArray(song.lyrics) ? song.lyrics.map((line: any, index: number) => {
              const nextLine = song.lyrics[index + 1];
              const isActive = isLineActive(line, nextLine);
              
              return (
                <div
                  key={index}
                  id={`lyric-line-${index}`}
                  className={`cursor-pointer hover:bg-spotify-bg active:bg-spotify-bg rounded p-3 transition-all duration-300 touch-manipulation ${
                    isActive 
                      ? "lyrics-highlight transform scale-105 shadow-lg" 
                      : "text-spotify-muted hover:text-spotify-text"
                  }`}
                  onClick={() => handleLineClick(line)}
                >
                  <span className="text-lg leading-relaxed">{line.text}</span>
                  {showTranslationMode && line.translation && (
                    <div className="text-sm text-spotify-muted mt-2 italic">
                      {line.translation}
                    </div>
                  )}
                  {line.timestamp && (
                    <div className="text-xs text-spotify-muted mt-1 opacity-50">
                      {formatTime(line.timestamp)}
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
      </div>

      {/* Audio Controls */}
      <div className="fixed bottom-16 left-0 right-0">
        <Card className="bg-spotify-card border-spotify-card mx-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xs text-spotify-muted">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                onValueChange={(value) => seekTo(value[0])}
                max={duration || 100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-spotify-muted">{formatTime(duration)}</span>
            </div>
            
            <div className="flex items-center justify-center space-x-6">
              <Button variant="ghost" size="sm" className="text-spotify-muted hover:text-white">
                <SkipBack size={20} />
              </Button>
              <Button variant="ghost" size="sm" className="text-spotify-muted hover:text-white">
                <RotateCcw size={18} />
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </Button>
              <Button variant="ghost" size="sm" className="text-spotify-muted hover:text-white">
                <RotateCw size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="text-spotify-muted hover:text-white">
                <SkipForward size={20} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="lyrics" />

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
