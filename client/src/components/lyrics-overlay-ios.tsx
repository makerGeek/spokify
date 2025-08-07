import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Bookmark, BookmarkCheck, Languages, Share2, Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TranslationOverlay from "@/components/translation-overlay";

import { useAudio } from "@/hooks/use-audio";
import { useAuth } from "@/contexts/auth-context";
import { useSongAccess } from "@/hooks/use-song-access";
import { useBookmarks, useBookmarkStatus } from "@/hooks/use-bookmarks";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

interface LyricsOverlayIOSProps {
  songId: number;
  isVisible: boolean;
  onClose: () => void;
}

export default function LyricsOverlayIOS({ songId, isVisible, onClose }: LyricsOverlayIOSProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [showTranslationMode, setShowTranslationMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldSlideUp, setShouldSlideUp] = useState(false);
  const [youtubeContainerId, setYoutubeContainerId] = useState<string | null>(null);

  const { currentSong, setCurrentSong, currentTime, duration, seekTo, isPlaying, isLoading, togglePlay, hasError } = useAudio();
  const { user } = useAuth();
  const { checkSongAccess } = useSongAccess();
  const { toggleBookmark, isToggling } = useBookmarks();
  const { data: bookmarkStatus } = useBookmarkStatus(songId);

  const { data: song, isLoading: isSongLoading } = useQuery<Song>({
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

  // Find and relocate YouTube player to lyrics overlay
  useEffect(() => {
    if (currentSong && (currentSong as any).youtubeId && isVisible) {
      console.log('iOS Lyrics: Looking for YouTube player for song:', currentSong.title);
      
      // Look for YouTube player container with more aggressive searching
      const findAndMovePlayer = () => {
        const containers = document.querySelectorAll('[id^="youtube-player-"]');
        console.log('iOS Lyrics: Found', containers.length, 'YouTube containers');
        
        // Also look for .youtube-player-container class as backup
        const containersByClass = document.querySelectorAll('.youtube-player-container');
        console.log('iOS Lyrics: Found', containersByClass.length, 'containers by class');
        
        const allContainers = Array.from(containers).concat(Array.from(containersByClass));
        
        if (allContainers.length > 0) {
          // Use the first container found
          const container = allContainers[0] as HTMLElement;
          console.log('iOS Lyrics: Using container:', container.id || container.className);
          setYoutubeContainerId(container.id);
          
          // Move the YouTube player to lyrics overlay video container
          const videoContainer = document.getElementById(`lyrics-video-container-${currentSong.id}`);
          console.log('iOS Lyrics: Target container exists:', !!videoContainer);
          console.log('iOS Lyrics: Container parent:', container.parentNode?.nodeName);
          
          if (videoContainer) {
            // Always move the container, even if it seems to be in the right place
            console.log('iOS Lyrics: Moving YouTube player to lyrics overlay');
            
            // Clear the target container first
            videoContainer.innerHTML = '';
            
            // Move the player
            videoContainer.appendChild(container);
            
            // Style for lyrics overlay
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
            
            return true; // Found and moved
          }
        }
        return false; // Not found or not moved
      };
      
      // Try immediately first
      if (findAndMovePlayer()) {
        return;
      }
      
      // If not found immediately, keep trying with interval
      const interval = setInterval(() => {
        if (findAndMovePlayer()) {
          clearInterval(interval);
        }
      }, 300);

      // Clear interval after 15 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
        console.warn('iOS Lyrics: Timeout - could not find YouTube player');
      }, 15000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setYoutubeContainerId(null);
    }
  }, [currentSong, isVisible]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

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

  if (isSongLoading) {
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
                    <div className="flex flex-col items-center">
                      <ArrowUp size={8} className="text-spotify-muted -mb-0.5" />
                      <ArrowDown size={8} className="text-spotify-muted" />
                    </div>
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

      {/* Main Content - Scrollable Content with Video and Lyrics */}
      <div className="w-full max-w-full flex-1">
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain" 
             id="lyrics-container"
             style={{ 
               height: 'calc(100vh - 64px - 140px - 60px)', // Screen minus header (64px) + player controls (140px) + bottom nav (60px)
               WebkitOverflowScrolling: 'touch',
               scrollBehavior: 'smooth',
               touchAction: 'pan-y',
               overflowAnchor: 'none',
               width: '100%'
             }}>
          
          {/* YouTube Video Container - Scrolls with content */}
          {currentSong && (currentSong as any)?.youtubeId && (
            <div className="w-full bg-black mb-4" style={{ height: '30vh' }}>
              <div 
                id={`lyrics-video-container-${currentSong.id}`}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Lyrics */}
          <div className="space-y-1 px-4">
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
      </div>

      {/* Fixed Player Controls at Bottom - Above navigation bar */}
      <div className="sticky z-10 bg-spotify-card/95 backdrop-blur-md border-t border-spotify-card" style={{ bottom: '60px' }}>
        {/* Progress Bar */}
        <div className="px-4 py-2">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={1}
            className="h-1 cursor-pointer spotify-progress-slider"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-spotify-muted">{formatTime(currentTime)}</span>
            <span className="text-xs text-spotify-muted">{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Song Info and Controls */}
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-3">
            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-spotify-text text-sm truncate">{currentSong?.title}</h3>
                {currentSong?.isFree && (
                  <span className="free-badge text-[8px] px-1 py-0.5 rounded-full font-bold text-white flex-shrink-0">
                    FREE
                  </span>
                )}
              </div>
              <p className="text-spotify-muted text-xs truncate">{currentSong?.artist}</p>
            </div>
            
            {/* Play/Pause Button */}
            <Button
              size="sm"
              className={`w-12 h-12 rounded-full transition-colors flex-shrink-0 ${
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
                <Loader2 size={20} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </Button>
          </div>
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