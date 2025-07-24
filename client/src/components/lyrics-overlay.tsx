import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowDown, Bookmark, BookmarkCheck, Languages, RotateCcw, Share2 } from "lucide-react";
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

interface LyricsOverlayProps {
  songId: number;
  isVisible: boolean;
  onClose: () => void;
}

export default function LyricsOverlay({ songId, isVisible, onClose }: LyricsOverlayProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [showTranslationMode, setShowTranslationMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldSlideUp, setShouldSlideUp] = useState(false);

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

  // Handle slide-up animation when opened from mini-player
  useEffect(() => {
    if (isVisible) {
      // Check if opened from mini-player
      const navigationSource = sessionStorage.getItem('lyricsNavigationSource');
      if (navigationSource === 'mini-player') {
        // Clear the flag and trigger slide animation
        sessionStorage.removeItem('lyricsNavigationSource');
        
        // Start with slide down position, then animate up
        setShouldSlideUp(false);
        const timer = setTimeout(() => {
          setShouldSlideUp(true);
        }, 50); // Small delay to ensure initial position is set
        
        return () => clearTimeout(timer);
      } else {
        // For direct navigation, show immediately
        setShouldSlideUp(true);
      }
    } else {
      setShouldSlideUp(false);
    }
  }, [isVisible]);

  // Listen for close animation event from mini-player
  useEffect(() => {
    const handleCloseWithAnimation = () => {
      // Check if this close was triggered by mini-player
      const closeSource = sessionStorage.getItem('lyricsCloseSource');
      if (closeSource === 'mini-player') {
        sessionStorage.removeItem('lyricsCloseSource');
        
        // Start slide down animation
        setShouldSlideUp(false);
        
        // Wait for animation to complete, then navigate
        setTimeout(() => {
          // Use setLocation to navigate to home
          const event = new CustomEvent('navigateToHome');
          window.dispatchEvent(event);
        }, 300);
      }
    };

    window.addEventListener('closeLyricsWithAnimation', handleCloseWithAnimation);
    
    return () => {
      window.removeEventListener('closeLyricsWithAnimation', handleCloseWithAnimation);
    };
  }, []);

  // Check song access and close overlay if needed
  useEffect(() => {
    if (song) {
      const accessResult = checkSongAccess(song);
      
      if (!accessResult.canAccess) {
        // Store the song info in sessionStorage so Home can show appropriate modal
        sessionStorage.setItem('accessDeniedSong', JSON.stringify({
          song,
          requiresAuth: accessResult.requiresAuth,
          requiresActivation: accessResult.requiresActivation,
          requiresPremium: accessResult.requiresPremium
        }));
        
        // Close overlay instead of redirect
        onClose();
        return;
      }
    }
  }, [song, checkSongAccess, onClose]);

  // Initialize YouTube player for this song when it loads
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      console.log("Lyrics overlay: Setting current song to", song.title);
      setCurrentSong(song, false); // Don't auto-play from lyrics overlay
    }
  }, [song, currentSong, setCurrentSong]);

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (autoScroll && song?.lyrics && currentTime) {
      // Find the active line
      const activeLine = song.lyrics.findIndex((line: any, index: number) => {
        const nextLine = song.lyrics[index + 1];
        return isLineActive(line, nextLine);
      });

      if (activeLine >= 0) {
        const element = document.getElementById(`lyric-line-${activeLine}`);
        const container = document.getElementById('lyrics-container');
        
        if (element && container) {
          const containerHeight = container.clientHeight;
          const elementHeight = element.offsetHeight;
          const elementOffset = element.offsetTop - containerHeight / 2 + elementHeight / 2;
          
          container.scrollTo({
            top: Math.max(0, elementOffset),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, song?.lyrics, autoScroll]);

  const handleCloseLyrics = () => {
    // Start slide down animation
    setShouldSlideUp(false);
    
    // Wait for animation to complete before closing
    setTimeout(() => {
      setIsAnimating(true);
      onClose();
    }, 300);
  };

  const isLineActive = (line: any, nextLine: any) => {
    if (!line.timestamp) return false;
    
    const lineTime = line.timestamp;
    const nextLineTime = nextLine?.timestamp || (duration || 0);
    
    return currentTime >= lineTime && currentTime < nextLineTime;
  };

  const handleLineClick = (line: any) => {
    // Seek to the timestamp of the clicked line
    if (line.timestamp !== undefined) {
      seekTo(line.timestamp);
    }
    setSelectedLine(line);
    setShowTranslation(true);
  };

  const handleBookmarkToggle = async () => {
    if (song && user) {
      await toggleBookmark(song.id);
    }
  };

  const handleShare = () => {
    if (song) {
      const url = `${window.location.origin}/lyrics/${song.id}`;
      if (navigator.share) {
        navigator.share({
          title: `${song.title} by ${song.artist}`,
          url: url,
        });
      } else {
        navigator.clipboard.writeText(url);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-50 bg-spotify-bg flex items-center justify-center transition-transform duration-300 ease-out ${
        isVisible && shouldSlideUp ? 'translate-y-0' : 'translate-y-full'
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
        isVisible && shouldSlideUp ? 'translate-y-0' : 'translate-y-full'
      }`}>
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
    <div className={`fixed inset-0 z-50 bg-spotify-bg flex flex-col transition-transform duration-300 ease-out ${
      isVisible && shouldSlideUp ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Fixed Header with controls */}
      <div className="sticky top-0 z-10 bg-spotify-bg p-3 w-full max-w-full">
        <div className="flex items-center justify-between">
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
                  <div className="flex items-center space-x-2 bg-spotify-card rounded-full px-3 py-1">
                    <Languages size={14} className="text-spotify-muted" />
                    <Switch
                      checked={showTranslationMode}
                      onCheckedChange={setShowTranslationMode}
                      className="data-[state=checked]:bg-spotify-green scale-75"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                  <p className="text-sm">Toggle translations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={700}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-spotify-card rounded-full px-3 py-1">
                    <RotateCcw size={14} className="text-spotify-muted" />
                    <Switch
                      checked={autoScroll}
                      onCheckedChange={setAutoScroll}
                      className="data-[state=checked]:bg-spotify-green scale-75"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                  <p className="text-sm">Auto-scroll to current lyric</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 bg-spotify-card rounded-full p-0"
                onClick={handleBookmarkToggle}
                disabled={isToggling}
              >
                {bookmarkStatus?.isBookmarked ? (
                  <BookmarkCheck className="text-spotify-green" size={16} />
                ) : (
                  <Bookmark className="text-spotify-muted" size={16} />
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 bg-spotify-card rounded-full p-0"
              onClick={handleShare}
            >
              <Share2 className="text-spotify-muted" size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable Linyrics */}
      <div className="px-4 w-full max-w-full">
        <div className="space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain" 
             id="lyrics-container"
             style={{ 
               height: 'calc(100vh - 190px)', // Screen minus header (64px) + bottom bar (60px) + mini player (77px)
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