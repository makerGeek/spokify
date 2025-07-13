import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import TranslationOverlay from "@/components/translation-overlay";
import { useAudio } from "@/hooks/use-audio";
import { type Song } from "@shared/schema";

export default function LyricsPlayer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const songId = parseInt(params.id || "0");
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentTime, setCurrentTime] = useState(83); // 1:23 in seconds
  const [showTranslationMode, setShowTranslationMode] = useState(false);

  const { isPlaying, togglePlay, currentSong, setCurrentSong } = useAudio();

  const { data: song, isLoading } = useQuery<Song>({
    queryKey: ["/api/songs", songId],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${songId}`);
      if (!response.ok) throw new Error("Failed to fetch song");
      return response.json();
    }
  });

  // Set current song when data is available
  useEffect(() => {
    if (song) {
      setCurrentSong(song);
    }
  }, [song, setCurrentSong]);

  const handleCloseLyrics = () => {
    setLocation("/home");
  };

  const handleLineClick = (line: any) => {
    setSelectedLine(line);
    setShowTranslation(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
        <div className="text-center">
          <h3 className="font-semibold text-spotify-text">{song.title}</h3>
          <p className="text-spotify-muted text-sm">{song.artist}</p>
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

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-80 h-80 max-w-full max-h-full rounded-lg shadow-2xl overflow-hidden">
          <img
            src={song.albumCover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=800"}
            alt="Album cover"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Lyrics Section */}
      <Card className="bg-spotify-card border-spotify-card rounded-t-3xl">
        <CardContent className="p-6">
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
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(() => {
              try {
                const lyricsArray = typeof song.lyrics === 'string' ? JSON.parse(song.lyrics) : song.lyrics;
                if (Array.isArray(lyricsArray)) {
                  return lyricsArray.map((line: any, index: number) => (
                    <div
                      key={index}
                      className={`cursor-pointer hover:bg-spotify-bg rounded p-2 transition-colors ${
                        index === 0 ? "lyrics-highlight" : "text-spotify-muted"
                      }`}
                      onClick={() => handleLineClick(line)}
                    >
                      <span>{line.text}</span>
                      {showTranslationMode && line.translation && (
                        <div className="text-xs text-spotify-muted mt-1 italic">
                          {line.translation}
                        </div>
                      )}
                    </div>
                  ));
                } else {
                  return (
                    <div className="text-spotify-muted text-center py-4">
                      No lyrics available
                    </div>
                  );
                }
              } catch (error) {
                console.error('Error parsing lyrics:', error);
                return (
                  <div className="text-spotify-muted text-center py-4">
                    Error loading lyrics
                  </div>
                );
              }
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls */}
      <Card className="bg-spotify-card border-spotify-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-spotify-muted">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              onValueChange={(value) => setCurrentTime(value[0])}
              max={song.duration}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-spotify-muted">{formatTime(song.duration)}</span>
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
