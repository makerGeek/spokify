import { Play, Pause, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { useAudio } from "@/hooks/use-audio";
import { useState, useEffect } from "react";

export default function MiniPlayer() {
  const [location, setLocation] = useLocation();
  const { currentSong, isPlaying, isLoading, togglePlay, currentTime, duration, seekTo, hasError } = useAudio();
  const [isLyricsShown, setIsLyricsShown] = useState(false);

  // Check if we're currently on a lyrics page
  useEffect(() => {
    setIsLyricsShown(location.startsWith('/lyrics/'));
  }, [location]);

  if (!currentSong) return null;

  const handleToggleLyrics = () => {
    if (isLyricsShown) {
      // Hide lyrics - trigger slide down animation in lyrics player
      // The lyrics player will handle the animation and navigation
      setLocation('/home');
    } else {
      // Show lyrics - mark as mini-player navigation and go to lyrics page
      sessionStorage.setItem('lyricsNavigationSource', 'mini-player');
      setLocation(`/lyrics/${currentSong.id}`);
    }
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
    <div className="fixed left-0 right-0 z-[9999]" style={{ bottom: '64px' }}>
      {/* Compact Progress Bar - Spotify style */}
      <div className="bg-spotify-card/95 backdrop-blur-md relative overflow-visible">
        <div className="relative group py-1 px-0 overflow-visible">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={1}
            className="h-[4px] cursor-pointer spotify-progress-slider relative overflow-visible"
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
      <Card className="bg-spotify-card/95 backdrop-blur-md border-spotify-card rounded-none shadow-xl border-t-0 relative">
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={currentSong.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"}
                alt="Album cover"
                className="w-full h-full object-cover"
              />
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
                onClick={togglePlay}
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
                onClick={handleToggleLyrics}
              >
                {isLyricsShown ? (
                  <ChevronDown size={16} className="transition-transform duration-200" />
                ) : (
                  <ChevronUp size={16} className="transition-transform duration-200" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
