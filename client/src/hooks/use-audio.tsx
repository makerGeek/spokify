import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { type Song } from "@shared/schema";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  setCurrentSong: (song: Song | null, autoPlay?: boolean) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
  hasError: boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const playerRef = useRef<any>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerId = useRef(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);

  // Listen for YouTube API ready event
  useEffect(() => {
    const checkYouTubeReady = () => {
      if (window.YT && window.YT.Player) {
        console.log('YouTube API available');
        setIsYouTubeReady(true);
      }
    };

    // Check immediately
    checkYouTubeReady();

    // Listen for the custom event from main.tsx
    const handleYouTubeReady = () => {
      console.log('YouTube API ready event received in audio hook');
      setIsYouTubeReady(true);
    };

    window.addEventListener('youtubeAPIReady', handleYouTubeReady);

    // Also check window.youTubeAPIReady flag
    if (window.youTubeAPIReady) {
      console.log('YouTube API already ready according to flag');
      setIsYouTubeReady(true);
    }

    return () => {
      window.removeEventListener('youtubeAPIReady', handleYouTubeReady);
    };
  }, []);

  // Create YouTube player when song changes
  useEffect(() => {
    if (!isYouTubeReady || !currentSong?.audioUrl) {
      console.log('YouTube not ready or no song:', { isYouTubeReady, audioUrl: currentSong?.audioUrl });
      return;
    }

    console.log('Creating YouTube player for:', currentSong.title, 'Video ID:', currentSong.audioUrl);
    console.log('YouTube API ready state:', window.YT && window.YT.Player ? 'Available' : 'Not available');
    console.log('Player container ID:', playerContainerId.current);

    // Reset state immediately when switching songs
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    stopTimeUpdate();

    // Clean up existing player
    if (playerRef.current) {
      console.log('Destroying existing player');
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying player:', error);
      }
      playerRef.current = null;
    }

    // Small delay to ensure proper cleanup before creating new player
    const createPlayer = () => {
      try {
        playerRef.current = new window.YT.Player(playerContainerId.current, {
          height: '0',
          width: '0',
          videoId: currentSong.audioUrl,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
              const duration = event.target.getDuration();
              console.log('Song duration:', duration);
              setDuration(duration);
              setHasError(false);
              
              // Auto-play if requested
              if (shouldAutoPlay) {
                console.log('Auto-playing song after player ready');
                setShouldAutoPlay(false);
                setTimeout(() => {
                  if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                    playerRef.current.playVideo();
                  }
                }, 500);
              }
            },
            onStateChange: (event: any) => {
              console.log('Player state changed:', event.data);
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsLoading(false); // Clear loading state when actually playing
                startTimeUpdate();
              } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setIsLoading(false); // Clear loading state when paused/ended
                stopTimeUpdate();
              } else if (event.data === window.YT.PlayerState.BUFFERING) {
                setIsLoading(true); // Show loading during buffering
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              const errorMessages: { [key: number]: string } = {
                2: 'Invalid video ID',
                5: 'HTML5 player error',
                100: 'Video not found or private',
                101: 'Video owner has disallowed embedding',
                150: 'Video owner has disallowed embedding'
              };
              const errorMessage = errorMessages[event.data] || 'Unknown error';
              console.error(`YouTube Error ${event.data}: ${errorMessage} for video ${currentSong?.audioUrl}`);
              setIsPlaying(false);
              setHasError(true);
              stopTimeUpdate();
            },
          },
        });
      } catch (error) {
        console.error('Error creating YouTube player:', error);
      }
    };

    // Use setTimeout to ensure cleanup is complete
    const timeoutId = setTimeout(createPlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying player in cleanup:', error);
        }
        playerRef.current = null;
      }
      stopTimeUpdate();
      setIsPlaying(false);
    };
  }, [currentSong, isYouTubeReady]);

  const startTimeUpdate = () => {
    if (timeUpdateIntervalRef.current) return;
    
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (time && !isNaN(time)) {
          setCurrentTime(Math.floor(time));
        }
      }
    }, 1000);
  };

  const stopTimeUpdate = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  };

  const play = () => {
    console.log('Play requested, player:', !!playerRef.current);
    console.log('Current song:', currentSong?.title);
    console.log('YouTube ready:', isYouTubeReady);
    
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        console.log('Calling playVideo');
        setIsLoading(true); // Set loading state when play is requested
        playerRef.current.playVideo();
      } catch (error) {
        console.error('Error calling playVideo:', error);
        setHasError(true);
        setIsLoading(false); // Clear loading state on error
      }
    } else {
      console.error('Player not ready or playVideo not available');
      setHasError(true);
      setIsLoading(false); // Clear loading state on error
    }
  };

  const pause = () => {
    console.log('Pause requested, player:', !!playerRef.current);
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      try {
        console.log('Calling pauseVideo');
        setIsLoading(false); // Clear loading state when pausing
        playerRef.current.pauseVideo();
      } catch (error) {
        console.error('Error calling pauseVideo:', error);
        setIsPlaying(false);
        setIsLoading(false); // Clear loading state on error
      }
    } else {
      console.error('Player not ready or pauseVideo not available');
      setIsLoading(false); // Clear loading state if player not ready
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      // Set loading immediately for responsive UI
      setIsLoading(true);
      play();
    }
  };

  const seekTo = (time: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      // Remember the current playing state
      const wasPlaying = isPlaying;
      
      // Seek to the time
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
      
      // If the video wasn't playing before, pause it after seeking
      if (!wasPlaying) {
        // Use a small timeout to ensure the seek operation completes first
        setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
          }
        }, 100);
      }
    }
  };

  const setCurrentSongWrapper = (song: Song | null, autoPlay: boolean = false) => {
    // If it's the same song, don't recreate the player - just handle play state
    if (currentSong && song && currentSong.id === song.id) {
      console.log('Same song requested, handling play state instead of recreating player');
      setShouldAutoPlay(autoPlay);
      
      if (autoPlay && !isPlaying) {
        // Set loading immediately for responsive UI
        setIsLoading(true);
        // If auto-play is requested and not currently playing, start playing
        setTimeout(() => play(), 100);
      }
      return;
    }
    
    // Different song or null - destroy existing player and create new one
    if (playerRef.current) {
      console.log('Destroying existing player for new song');
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying existing player:', error);
      }
      playerRef.current = null;
    }
    
    setCurrentSong(song);
    setShouldAutoPlay(autoPlay);
    setIsPlaying(false);
    // Set loading immediately if auto-play is requested for responsive UI
    setIsLoading(autoPlay);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false); // Reset error state when setting new song
  };

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoading,
        setCurrentSong: setCurrentSongWrapper,
        togglePlay,
        play,
        pause,
        currentTime,
        duration,
        seekTo,
        hasError,
      }}
    >
      {children}
      {/* Hidden YouTube player */}
      <div id={playerContainerId.current} style={{ display: 'none' }}></div>
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}