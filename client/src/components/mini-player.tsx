import { Play, Pause, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { useAudio } from "@/hooks/use-audio";

export default function MiniPlayer() {
  const [, setLocation] = useLocation();
  const { currentSong, isPlaying, togglePlay, currentTime, duration, seekTo, hasError } = useAudio();

  if (!currentSong) return null;

  const handleOpenFullPlayer = () => {
    setLocation(`/lyrics/${currentSong.id}`);
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
    <div className="fixed bottom-16 left-0 right-0 bg-spotify-card border-t border-spotify-muted z-40">
      {/* Progress bar at the very top */}
      <div className="absolute top-0 left-0 right-0">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="w-full h-1"
        />
      </div>
      
      {/* Time indicators */}
      <div className="absolute top-0 left-2 right-2 flex justify-between text-[10px] text-spotify-muted pt-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Main player content */}
      <div className="flex items-center px-3 py-2 pt-6">
        <img
          src={currentSong.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"}
          alt="Now playing"
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0 mx-3">
          <p className="font-medium text-sm truncate text-spotify-text leading-tight">{currentSong.title}</p>
          <p className="text-spotify-muted text-xs truncate leading-tight">{currentSong.artist}</p>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            size="sm"
            className={`w-8 h-8 rounded-full transition-colors p-0 ${
              hasError 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-spotify-green hover:bg-spotify-accent"
            }`}
            onClick={togglePlay}
            disabled={hasError}
            title={hasError ? "Video unavailable for playback" : undefined}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 rounded-full text-spotify-muted hover:text-spotify-text hover:bg-spotify-bg/50 p-0"
            onClick={handleOpenFullPlayer}
          >
            <Maximize2 size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
