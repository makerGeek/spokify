import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, Languages, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TranslationOverlay from "@/components/translation-overlay";

import MiniPlayer from "@/components/mini-player";
import { useAudio } from "@/hooks/use-audio";
import { useAuth } from "@/contexts/auth-context";
import { useSongAccess } from "@/hooks/use-song-access";
import { useBookmarks, useBookmarkStatus } from "@/hooks/use-bookmarks";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

export default function LyricsPlayer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const songId = parseInt(params.id || "0");
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [showTranslationMode, setShowTranslationMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const { currentSong, setCurrentSong, currentTime, duration, seekTo } = useAudio();
  const { user } = useAuth();
  const { checkSongAccess } = useSongAccess();
  const { toggleBookmark, isToggling } = useBookmarks();
  const { data: bookmarkStatus } = useBookmarkStatus(songId);

  const { data: song, isLoading } = useQuery<Song>({
    queryKey: ["/api/songs", songId],
    queryFn: async () => {
      return api.songs.getById(songId);
    }
  });

  // Check song access and redirect if needed
  useEffect(() => {
    if (song) {
      const accessResult = checkSongAccess(song);
      
      if (!accessResult.canAccess) {
        // User doesn't have access - redirect to home
        // The home component will handle showing appropriate modals
        setLocation("/home");
        return;
      }
    }
  }, [song, checkSongAccess, setLocation]);

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

  const handleShare = () => {
    if (!song) return;
    
    const shareData = {
      title: `${song.title} - ${song.artist}`,
      text: `Learn ${song.language} with this song on LyricLingo!`,
      url: `${window.location.origin}/lyrics/${song.id}`
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback for browsers without native share
      navigator.clipboard.writeText(shareData.url).then(() => {
        // You could add a toast notification here
        console.log('Link copied to clipboard!');
      }).catch(console.error);
    }
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
    <div className="min-h-screen bg-spotify-bg pb-32 overflow-x-hidden">
      {/* Main Content - Full Height Lyrics */}
      <div className="p-4 w-full max-w-full">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-spotify-card rounded-full p-0"
            onClick={handleCloseLyrics}
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
            <TooltipProvider delayDuration={700}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-spotify-card rounded-full px-3 py-1 cursor-pointer">
                    <Languages size={14} className={showTranslationMode ? "text-spotify-green" : "text-spotify-muted"} />
                    <Switch
                      checked={showTranslationMode}
                      onCheckedChange={setShowTranslationMode}
                      className="data-[state=checked]:bg-spotify-green"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  className="bg-black text-white border-gray-700 text-sm px-3 py-2 max-w-xs"
                  sideOffset={8}
                >
                  <p>Show translations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="difficulty-badge text-xs px-2 py-1 rounded-full font-medium text-white">
              {song.difficulty}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 bg-spotify-card rounded-full p-0"
              onClick={() => toggleBookmark(songId)}
              disabled={isToggling}
            >
              <Bookmark 
                className={bookmarkStatus?.isBookmarked ? "text-spotify-green" : "text-spotify-muted"} 
                size={20} 
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 bg-spotify-card rounded-full p-0"
              onClick={handleShare}
            >
              <Share2 className="text-spotify-muted hover:text-spotify-text" size={20} />
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

      {/* Mini Player Component */}
      <MiniPlayer />

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
