import { Play, Pause, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { useAudio } from "@/hooks/use-audio";

export default function MiniPlayer() {
  const [, setLocation] = useLocation();
  const { currentSong, isPlaying, togglePlay, currentTime, duration, seekTo } = useAudio();

  if (!currentSong) return null;

  const handleOpenFullPlayer = () => {
    setLocation(`/lyrics/${currentSong.id}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  return (
    <Card className="fixed bottom-20 left-4 right-4 bg-spotify-card border-spotify-card z-40 max-w-md mx-auto">
      <CardContent className="p-3">
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-spotify-muted mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <img
            src={currentSong.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"}
            alt="Now playing"
            className="w-12 h-12 rounded-lg object-cover"
          />
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate text-spotify-text">{currentSong.title}</p>
            <p className="text-spotify-muted text-xs truncate">{currentSong.artist}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className="w-8 h-8 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 bg-spotify-bg rounded-full text-spotify-muted hover:text-spotify-text p-0"
              onClick={handleOpenFullPlayer}
            >
              <Maximize2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
