import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import TranslationOverlay from "@/components/translation-overlay";
import { useAudio } from "@/hooks/use-audio";
import { useQuery } from "@tanstack/react-query";
import { type Song } from "@shared/schema";

interface LyricsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
  const { currentSong, isPlaying, togglePlay, currentTime, duration, seekTo } = useAudio();
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showTranslationMode, setShowTranslationMode] = useState(false);

  const { data: song } = useQuery<Song>({
    queryKey: ["/api/songs", currentSong?.id],
    queryFn: async () => {
      if (!currentSong?.id) return null;
      const response = await fetch(`/api/songs/${currentSong.id}`);
      if (!response.ok) throw new Error("Failed to fetch song");
      return response.json();
    },
    enabled: !!currentSong?.id
  });

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLineClick = (line: any) => {
    if (line.timestamp !== undefined) {
      seekTo(line.timestamp);
    }
    setSelectedLine(line);
    setShowTranslation(true);
  };

  const isLineActive = (line: any, nextLine: any) => {
    if (!line.timestamp) return false;
    const lineTime = line.timestamp;
    const nextLineTime = nextLine?.timestamp || (duration || 0);
    return currentTime >= lineTime && currentTime < nextLineTime;
  };

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (!song?.lyrics || !Array.isArray(song.lyrics) || !isOpen) return;
    
    const activeLyricIndex = song.lyrics.findIndex((line: any, index: number) => {
      const nextLine = song.lyrics[index + 1];
      return isLineActive(line, nextLine);
    });

    if (activeLyricIndex !== -1) {
      const activeElement = document.getElementById(`lyric-line-${activeLyricIndex}`);
      const container = document.getElementById('lyrics-container');
      
      if (activeElement && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();
        
        if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  }, [currentTime, song?.lyrics, isOpen]);

  if (!currentSong) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div className={`fixed inset-x-0 bottom-0 bg-spotify-bg z-50 transition-transform duration-300 ease-out ${
        isOpen ? 'transform translate-y-0' : 'transform translate-y-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-spotify-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-spotify-muted hover:text-spotify-text"
          >
            <ArrowDown size={20} />
          </Button>
          
          <div className="text-center flex-1">
            <h2 className="font-semibold text-spotify-text">{currentSong.title}</h2>
            <p className="text-sm text-spotify-muted">{currentSong.artist}</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className={`${isBookmarked ? "text-spotify-green" : "text-spotify-muted hover:text-spotify-text"}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
          >
            <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} />
          </Button>
        </div>

        {/* Album Cover and Controls */}
        <div className="p-6">
          <div className="max-w-sm mx-auto">
            <div className="relative mb-6">
              <img
                src={currentSong.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"}
                alt="Album cover"
                className="w-full aspect-square rounded-lg object-cover shadow-2xl"
              />
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                  size="sm"
                  className={`${showTranslationMode ? "bg-spotify-green" : "bg-spotify-card border-spotify-muted"} text-white`}
                  onClick={() => setShowTranslationMode(!showTranslationMode)}
                >
                  <Languages size={16} className="mr-1" />
                  Translate
                </Button>
                <div className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
                  {currentSong.difficulty}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2 mb-6">
              <Slider
                value={[currentTime]}
                onValueChange={(value) => seekTo(value[0])}
                max={duration || 100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-spotify-muted">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Play Controls */}
            <div className="flex items-center justify-center space-x-6 mb-6">
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
          </div>
        </div>

        {/* Lyrics */}
        <div className="px-4 pb-20">
          <h3 className="text-lg font-semibold mb-4 text-center">Lyrics</h3>
          <div 
            className="space-y-3 overflow-y-auto" 
            id="lyrics-container"
            style={{ 
              height: 'calc(100vh - 500px)',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              touchAction: 'pan-y',
              overflowAnchor: 'none'
            }}
          >
            {song && Array.isArray(song.lyrics) ? song.lyrics.map((line: any, index: number) => {
              const nextLine = song.lyrics[index + 1];
              const isActive = isLineActive(line, nextLine);
              
              return (
                <div
                  key={index}
                  id={`lyric-line-${index}`}
                  className={`cursor-pointer hover:bg-spotify-card active:bg-spotify-card rounded p-3 transition-all duration-300 touch-manipulation text-center ${
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

        {/* Translation Overlay */}
        {showTranslation && selectedLine && (
          <TranslationOverlay
            line={selectedLine}
            onClose={() => setShowTranslation(false)}
            songId={currentSong.id}
          />
        )}
      </div>
    </>
  );
}