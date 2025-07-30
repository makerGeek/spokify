import { Play, Pause, ChevronUp, ChevronDown, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { useAudio } from "@/hooks/use-audio";
import { useState, useEffect, useRef } from "react";

export default function MiniPlayer() {
  const [location, setLocation] = useLocation();
  const { currentSong, isPlaying, isLoading, togglePlay, currentTime, duration, seekTo, hasError } = useAudio();
  const [isLyricsShown, setIsLyricsShown] = useState(false);
  const [youtubeContainerId, setYoutubeContainerId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Check if we're currently on a lyrics page
  useEffect(() => {
    setIsLyricsShown(location.startsWith('/lyrics/'));
  }, [location]);

  // Find and relocate YouTube player to mini-player
  useEffect(() => {
    if (currentSong && (currentSong as any).youtubeId) {
      // Look for YouTube player container
      const interval = setInterval(() => {
        const containers = document.querySelectorAll('[id^="youtube-player-"]');
        if (containers.length > 0) {
          const container = containers[containers.length - 1] as HTMLElement;
          setYoutubeContainerId(container.id);
          
          // Move the YouTube player to mini-player video container
          const videoContainer = document.getElementById(`mini-player-video-container-${currentSong.id}`);
          if (videoContainer && container.parentNode !== videoContainer) {
            videoContainer.appendChild(container);
            // Style for mini-player
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.borderRadius = '8px';
            container.style.display = 'block';
            container.style.zIndex = 'auto';
            container.style.top = 'auto';
            container.style.left = 'auto';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
            container.style.backgroundColor = '#000';
          }
          
          clearInterval(interval);
        }
      }, 500);

      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);

      return () => clearInterval(interval);
    } else {
      setYoutubeContainerId(null);
    }
  }, [currentSong, isMaximized]);

  if (!currentSong) return null;

  const handleToggleLyrics = () => {
    if (isLyricsShown) {
      // Hide lyrics - trigger slide down animation first
      // Set flag for lyrics overlay to handle closing animation
      sessionStorage.setItem('lyricsCloseSource', 'mini-player');
      
      // Create a custom event to tell lyrics overlay to close with animation
      const closeEvent = new CustomEvent('closeLyricsWithAnimation');
      window.dispatchEvent(closeEvent);
    } else {
      // Show lyrics - mark as mini-player navigation and go to lyrics page
      sessionStorage.setItem('lyricsNavigationSource', 'mini-player');
      setLocation(`/lyrics/${currentSong.id}`);
    }
  };

  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  return (
    <div 
      className="fixed left-0 right-0 z-60 transition-all duration-300" 
      style={{ 
        bottom: '60px',
        height: isMaximized ? '33.333vh' : 'auto'
      }}
    >
      {/* Compact Progress Bar - Spotify style */}
      <div className="bg-spotify-card/95 backdrop-blur-md relative overflow-visible">
        <div className="relative group py-1 px-0 overflow-visible">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={1}
            className="h-1 cursor-pointer spotify-progress-slider relative overflow-visible"
          />
          {/* Time indicators on hover */}
          <div className="absolute inset-x-0 -top-8 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[80]">
            <span className="text-xs text-spotify-text bg-spotify-bg px-2 py-1 rounded shadow-lg">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-spotify-text bg-spotify-bg px-2 py-1 rounded shadow-lg">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Player Content */}
      <Card className={`bg-spotify-card/95 backdrop-blur-md border-spotify-card rounded-none shadow-xl border-t-0 relative transition-all duration-300 ${isMaximized ? 'flex-1 overflow-hidden' : ''}`}>
        <CardContent className={`transition-all duration-300 ${isMaximized ? 'p-4 h-full flex flex-col' : 'p-3'}`}>
          {isMaximized && (currentSong as any)?.youtubeId ? (
            /* Maximized Layout - YouTube Video Prominent */
            <div className="flex flex-col h-full gap-4">
              {/* Video Container */}
              <div className="flex-1 rounded-lg overflow-hidden bg-black">
                <div 
                  id={`mini-player-video-container-${currentSong.id}`}
                  className="w-full h-full"
                />
              </div>
              
              {/* Controls and Info */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-spotify-text text-sm truncate">{currentSong.title}</h3>
                    {currentSong.isFree && (
                      <span className="free-badge text-[8px] px-1 py-0.5 rounded-full font-bold text-white flex-shrink-0">
                        FREE
                      </span>
                    )}
                  </div>
                  <p className="text-spotify-muted text-xs truncate">{currentSong.artist}</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className={`w-10 h-10 rounded-full transition-colors flex-shrink-0 ${
                      hasError 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-spotify-green hover:bg-spotify-accent"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    disabled={hasError || isLoading}
                    title={hasError ? "Video unavailable for playback" : isLoading ? "Loading..." : undefined}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 rounded-full text-spotify-muted hover:text-spotify-text hover:bg-spotify-bg/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLyrics();
                    }}
                  >
                    {isLyricsShown ? (
                      <ChevronDown size={16} className="transition-transform duration-200" />
                    ) : (
                      <ChevronUp size={16} className="transition-transform duration-200" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 rounded-full text-spotify-muted hover:text-spotify-text hover:bg-spotify-bg/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMaximize();
                    }}
                  >
                    <Minimize2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Layout */
            <div className="flex items-center space-x-3 cursor-pointer" onClick={handleToggleLyrics}>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                {/* YouTube Video Container - shows for YouTube songs */}
                {(currentSong as any)?.youtubeId ? (
                  <div 
                    id={`mini-player-video-container-${currentSong.id}`}
                    className="absolute inset-0 z-10"
                  />
                ) : (
                  /* Album Cover - shows for non-YouTube songs */
                  <img
                    src={currentSong.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"}
                    alt="Album cover"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-spotify-text text-sm truncate">{currentSong.title}</h3>
                  {currentSong.isFree && (
                    <span className="free-badge text-[8px] px-1 py-0.5 rounded-full font-bold text-white flex-shrink-0">
                      FREE
                    </span>
                  )}
                </div>
                <p className="text-spotify-muted text-xs truncate">{currentSong.artist}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  size="sm"
                  className={`w-10 h-10 rounded-full transition-colors flex-shrink-0 ${
                    hasError 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-spotify-green hover:bg-spotify-accent"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  disabled={hasError || isLoading}
                  title={hasError ? "Video unavailable for playback" : isLoading ? "Loading..." : undefined}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full text-spotify-muted hover:text-spotify-text hover:bg-spotify-bg/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLyrics();
                  }}
                >
                  {isLyricsShown ? (
                    <ChevronDown size={16} className="transition-transform duration-200" />
                  ) : (
                    <ChevronUp size={16} className="transition-transform duration-200" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full text-spotify-muted hover:text-spotify-text hover:bg-spotify-bg/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMaximize();
                  }}
                >
                  <Maximize2 size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
