import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { type Song } from "@shared/schema";
import { PlayerAdapter, PlayerCallbacks, PlayerState, PlayerType } from "@/lib/player-adapter";
import { PlayerFactory } from "@/lib/player-factory";
import { api } from "@/lib/api-client";
import { trackSongPlay, trackSongComplete } from "@/lib/analytics";
import { AudioContext } from "@/hooks/use-audio";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    youTubeAPIReady: boolean;
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


export function AudioIOSProvider({ children }: { children: ReactNode }) {
  // State hooks
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  
  // Ref hooks
  const playerRef = useRef<PlayerAdapter | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const directYTPlayerRef = useRef<any>(null); // Direct reference to YT player for iOS sync

  // Listen for YouTube API ready event
  useEffect(() => {
    const checkYouTubeReady = () => {
      if (window.YT && window.YT.Player) {
        console.log('iOS Audio: YouTube API available');
        setIsYouTubeReady(true);
      }
    };

    checkYouTubeReady();

    const handleYouTubeReady = () => {
      console.log('iOS Audio: YouTube API ready event received');
      setIsYouTubeReady(true);
    };

    window.addEventListener('youtubeAPIReady', handleYouTubeReady);

    if (window.youTubeAPIReady) {
      console.log('iOS Audio: YouTube API already ready according to flag');
      setIsYouTubeReady(true);
    }

    return () => {
      window.removeEventListener('youtubeAPIReady', handleYouTubeReady);
    };
  }, []);

  // Enhanced sync interval functions for iOS with aggressive failsafes
  const startSyncInterval = () => {
    if (syncIntervalRef.current) return;
    
    console.log('iOS Audio: Starting enhanced sync interval');
    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current?.isReady()) {
        try {
          // Get direct reference to YouTube player
          const ytPlayer = (playerRef.current as any).player || directYTPlayerRef.current;
          
          if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
            const ytState = ytPlayer.getPlayerState();
            const ytCurrentTime = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
            const ytDuration = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
            const shouldBePlaying = ytState === window.YT?.PlayerState?.PLAYING;
            const shouldBePaused = ytState === window.YT?.PlayerState?.PAUSED;
            const isBuffering = ytState === window.YT?.PlayerState?.BUFFERING;
            
            // Aggressive sync for play state
            if (shouldBePlaying && (!isPlaying || isLoading)) {
              console.log('iOS Audio: AGGRESSIVE SYNC - YouTube playing but controls not synced');
              setIsPlaying(true);
              setIsLoading(false);
              setHasError(false);
            }
            
            // Handle buffering state
            if (isBuffering && !isLoading && isPlaying) {
              console.log('iOS Audio: YouTube buffering, updating loading state');
              setIsLoading(true);
            }
            
            // Handle paused state
            if (shouldBePaused && (isPlaying || isLoading)) {
              console.log('iOS Audio: YouTube paused, syncing controls');
              setIsPlaying(false);
              setIsLoading(false);
            }
            
            // Force clear loading if YouTube is in a definitive state
            if ((shouldBePlaying || shouldBePaused) && isLoading) {
              console.log('iOS Audio: Force clearing loading - YouTube in definitive state:', shouldBePlaying ? 'PLAYING' : 'PAUSED');
              setIsLoading(false);
            }
            
            // Sync current time (with tolerance to avoid constant updates)
            if (Math.abs(ytCurrentTime - currentTime) > 1) {
              console.log('iOS Audio: Time sync - YT:', ytCurrentTime, 'State:', currentTime);
              setCurrentTime(Math.floor(ytCurrentTime));
            }
            
            // Sync duration
            if (ytDuration && Math.abs(ytDuration - duration) > 1) {
              console.log('iOS Audio: Duration sync - YT:', ytDuration, 'State:', duration);
              setDuration(Math.floor(ytDuration));
            }
          }
        } catch (error) {
          console.warn('iOS Audio: Sync interval error:', error);
        }
      }
      
      // Also try to find and sync with any YouTube player in the DOM
      try {
        const ytContainers = document.querySelectorAll('[id^="youtube-player-"]');
        if (ytContainers.length > 0) {
          const firstContainer = ytContainers[0];
          const iframe = firstContainer.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            // Store reference for direct access if needed
            const ytPlayer = (window as any).YT?.get?.(iframe.id);
            if (ytPlayer && ytPlayer !== directYTPlayerRef.current) {
              console.log('iOS Audio: Found DOM YouTube player, storing reference');
              directYTPlayerRef.current = ytPlayer;
              
              // Immediately check state of newly found player
              try {
                const ytState = ytPlayer.getPlayerState();
                const shouldBePlaying = ytState === window.YT?.PlayerState?.PLAYING;
                if (shouldBePlaying && (!isPlaying || isLoading)) {
                  console.log('iOS Audio: Newly found player is playing, force sync');
                  setIsPlaying(true);
                  setIsLoading(false);
                }
              } catch (syncError) {
                console.warn('iOS Audio: Error syncing newly found player:', syncError);
              }
            }
          }
        }
      } catch (error) {
        console.warn('iOS Audio: DOM sync error:', error);
      }
    }, 500); // More frequent checking for better responsiveness
  };

  const stopSyncInterval = () => {
    if (syncIntervalRef.current) {
      console.log('iOS Audio: Stopping sync interval');
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  // Health check interval - runs independently to catch sync issues
  const startHealthCheck = () => {
    if (healthCheckIntervalRef.current) return;
    
    console.log('iOS Audio: Starting health check interval');
    healthCheckIntervalRef.current = setInterval(() => {
      if (currentSong && playerRef.current?.isReady()) {
        try {
          const ytPlayer = directYTPlayerRef.current || (playerRef.current as any)?.player;
          if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
            const ytState = ytPlayer.getPlayerState();
            const shouldBePlaying = ytState === window.YT?.PlayerState?.PLAYING;
            
            // Health check: If YouTube is playing but we think we're loading, force sync
            if (shouldBePlaying && isLoading && !isPlaying) {
              console.log('iOS Audio: HEALTH CHECK RECOVERY - YouTube playing but controls stuck in loading');
              setIsPlaying(true);
              setIsLoading(false);
              setHasError(false);
              startSyncInterval();
            }
            
            // Health check: If we think we're playing but YouTube is not, sync
            if (!shouldBePlaying && isPlaying && ytState !== window.YT?.PlayerState?.BUFFERING) {
              console.log('iOS Audio: HEALTH CHECK RECOVERY - Controls think playing but YouTube is not');
              setIsPlaying(false);
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.warn('iOS Audio: Health check error:', error);
        }
      }
    }, 3000); // Check every 3 seconds
  };

  const stopHealthCheck = () => {
    if (healthCheckIntervalRef.current) {
      console.log('iOS Audio: Stopping health check');
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  };

  // Create player when song changes
  useEffect(() => {
    if (!currentSong) {
      console.log('iOS Audio: No song');
      return;
    }

    // Check if song has YouTube ID
    const hasYouTubeId = !!(currentSong as any).youtubeId;
    
    if (!hasYouTubeId) {
      console.log('iOS Audio: No YouTube ID for song:', currentSong.title);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Wait for YouTube API to be ready
    if (!isYouTubeReady) {
      console.log('iOS Audio: YouTube API not ready yet');
      return;
    }

    console.log('iOS Audio: Creating YouTube player for:', currentSong.title);

    // Reset state immediately when switching songs
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Clean up existing player
    if (playerRef.current) {
      console.log('iOS Audio: Destroying existing player');
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('iOS Audio: Error destroying player:', error);
      }
      playerRef.current = null;
    }

    // Reset direct YT player reference
    directYTPlayerRef.current = null;

    // Create YouTube player
    const createPlayer = async () => {
      try {
        const audioUrlToPlay = PlayerFactory.getAudioUrlToPlay({
          audioUrl: null,
          youtubeId: (currentSong as any).youtubeId
        });

        const player = PlayerFactory.createPlayerFromUrl(audioUrlToPlay, { 
          visible: true // Always create visible players for iOS
        });
        playerRef.current = player;

        const callbacks: PlayerCallbacks = {
          onStateChange: (state: Partial<PlayerState>) => {
            console.log('iOS Audio: Player state change:', state);
            if (state.isPlaying !== undefined) {
              setIsPlaying(state.isPlaying);
              if (state.isPlaying) {
                setIsLoading(false);
                startSyncInterval();
              } else {
                // Don't stop sync interval immediately, let it handle final sync
                setTimeout(stopSyncInterval, 2000);
              }
            }
            if (state.isLoading !== undefined) {
              setIsLoading(state.isLoading);
            }
            if (state.hasError !== undefined) {
              setHasError(state.hasError);
              if (state.hasError) {
                setIsLoading(false);
                stopSyncInterval();
              }
            }
          },
          onReady: (songDuration: number) => {
            console.log('iOS Audio: Player ready, duration:', songDuration);
            setDuration(songDuration);
            setHasError(false);
            setIsLoading(false);
            
            // Store direct reference to YT player for enhanced sync
            try {
              const ytPlayer = (playerRef.current as any)?.player;
              if (ytPlayer) {
                directYTPlayerRef.current = ytPlayer;
                console.log('iOS Audio: Stored direct YT player reference');
              }
            } catch (error) {
              console.warn('iOS Audio: Could not store YT player reference:', error);
            }
            
            // Start health check when player is ready
            startHealthCheck();
            
            // Auto-play if requested
            if (shouldAutoPlay) {
              console.log('iOS Audio: Auto-playing song after player ready');
              setShouldAutoPlay(false);
              setTimeout(async () => {
                if (playerRef.current?.isReady()) {
                  try {
                    await playerRef.current.play();
                  } catch (error) {
                    console.error('iOS Audio: Auto-play failed:', error);
                    setIsLoading(false);
                  }
                }
              }, 500);
            }
          },
          onError: async (error: string) => {
            console.error('iOS Audio: Player error:', error);
            setIsPlaying(false);
            setHasError(true);
            setIsLoading(false);
            stopSyncInterval();
            stopHealthCheck();
          },
          onTimeUpdate: (time: number) => {
            setCurrentTime(time);
          }
        };

        await player.load(audioUrlToPlay, callbacks);
      } catch (error) {
        console.error('iOS Audio: Error creating player:', error);
        setHasError(true);
        setIsLoading(false);
        stopSyncInterval();
        stopHealthCheck();
      }
    };

    // Use setTimeout to ensure proper cleanup
    const timeoutId = setTimeout(createPlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      stopSyncInterval();
      stopHealthCheck();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('iOS Audio: Error destroying player in cleanup:', error);
        }
        playerRef.current = null;
      }
      directYTPlayerRef.current = null;
      setIsPlaying(false);
      setIsLoading(false);
    };
  }, [currentSong, isYouTubeReady]);

  const play = async () => {
    console.log('iOS Audio: Play requested, player ready:', playerRef.current?.isReady());
    console.log('iOS Audio: Current song:', currentSong?.title);
    
    if (playerRef.current?.isReady()) {
      try {
        console.log('iOS Audio: Calling play');
        setIsLoading(true);
        setHasError(false);
        
        // Enhanced loading timeout with aggressive YT player check
        const loadingTimeout = setTimeout(() => {
          console.warn('iOS Audio: Play loading timeout - AGGRESSIVE YouTube state check');
          try {
            const ytPlayer = directYTPlayerRef.current || (playerRef.current as any)?.player;
            if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
              const ytState = ytPlayer.getPlayerState();
              console.log('iOS Audio: Timeout check - YT state:', ytState);
              
              if (ytState === window.YT?.PlayerState?.PLAYING) {
                console.log('iOS Audio: TIMEOUT RECOVERY - YouTube is playing, force sync');
                setIsPlaying(true);
                setIsLoading(false);
                setHasError(false);
                startSyncInterval();
              } else if (ytState === window.YT?.PlayerState?.PAUSED) {
                console.log('iOS Audio: TIMEOUT RECOVERY - YouTube is paused');
                setIsPlaying(false);
                setIsLoading(false);
              } else if (ytState === window.YT?.PlayerState?.BUFFERING) {
                console.log('iOS Audio: TIMEOUT RECOVERY - YouTube still buffering, keep loading');
                // Keep loading state for buffering
              } else {
                console.log('iOS Audio: TIMEOUT RECOVERY - Unknown YouTube state, clearing loading');
                setIsLoading(false);
              }
            } else {
              // Try to find any YouTube player in DOM as last resort
              console.log('iOS Audio: TIMEOUT RECOVERY - Searching DOM for YouTube player');
              const ytContainers = document.querySelectorAll('[id^="youtube-player-"]');
              let foundPlayer = false;
              
              for (const container of ytContainers) {
                const iframe = container.querySelector('iframe');
                if (iframe) {
                  const domYTPlayer = (window as any).YT?.get?.(iframe.id);
                  if (domYTPlayer && typeof domYTPlayer.getPlayerState === 'function') {
                    const domYTState = domYTPlayer.getPlayerState();
                    console.log('iOS Audio: Found DOM player with state:', domYTState);
                    
                    if (domYTState === window.YT?.PlayerState?.PLAYING) {
                      console.log('iOS Audio: DOM RECOVERY - YouTube is playing, force sync');
                      directYTPlayerRef.current = domYTPlayer;
                      setIsPlaying(true);
                      setIsLoading(false);
                      setHasError(false);
                      startSyncInterval();
                      foundPlayer = true;
                      break;
                    }
                  }
                }
              }
              
              if (!foundPlayer) {
                console.log('iOS Audio: No YouTube player found anywhere, clearing loading');
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.warn('iOS Audio: Error in timeout recovery:', error);
            setIsLoading(false);
          }
        }, 2000); // Even shorter timeout for faster recovery
        
        await playerRef.current.play();
        clearTimeout(loadingTimeout);
        
        // Track song play
        if (currentSong && !playStartTime) {
          setPlayStartTime(Date.now());
          trackSongPlay(
            currentSong.id,
            currentSong.title,
            currentSong.artist,
            currentSong.genre,
            currentSong.language,
            duration
          );
        }
      } catch (error) {
        console.error('iOS Audio: Error calling play:', error);
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      console.error('iOS Audio: Player not ready');
      setHasError(true);
      setIsLoading(false);
    }
  };

  const pause = async () => {
    console.log('iOS Audio: Pause requested, player ready:', playerRef.current?.isReady());
    if (playerRef.current?.isReady()) {
      try {
        console.log('iOS Audio: Calling pause');
        setIsLoading(false);
        await playerRef.current.pause();
      } catch (error) {
        console.error('iOS Audio: Error calling pause:', error);
        setIsPlaying(false);
        setIsLoading(false);
      }
    } else {
      console.error('iOS Audio: Player not ready for pause');
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    console.log('iOS Audio: Toggle play - current state:', isPlaying);
    if (isPlaying) {
      await pause();
    } else {
      setIsLoading(true);
      
      const loadingTimeout = setTimeout(() => {
        console.warn('iOS Audio: Toggle loading timeout');
        setIsLoading(false);
      }, 5000);
      
      try {
        await play();
      } finally {
        clearTimeout(loadingTimeout);
      }
    }
  };

  const seekTo = async (time: number) => {
    console.log('iOS Audio: Seek to:', time);
    if (playerRef.current?.isReady()) {
      try {
        await playerRef.current.seekTo(time);
        setCurrentTime(time);
        
        // Force sync after seeking
        setTimeout(() => {
          try {
            const ytPlayer = directYTPlayerRef.current || (playerRef.current as any)?.player;
            if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
              const actualTime = ytPlayer.getCurrentTime();
              if (Math.abs(actualTime - time) > 2) {
                console.log('iOS Audio: Seek sync correction:', actualTime);
                setCurrentTime(Math.floor(actualTime));
              }
            }
          } catch (error) {
            console.warn('iOS Audio: Seek sync error:', error);
          }
        }, 1000);
      } catch (error) {
        console.error('iOS Audio: Error seeking:', error);
      }
    }
  };

  const setCurrentSongWrapper = (song: Song | null, autoPlay: boolean = false) => {
    // If it's the same song, don't recreate the player
    if (currentSong && song && currentSong.id === song.id) {
      console.log('iOS Audio: Same song requested, handling play state');
      setShouldAutoPlay(autoPlay);
      
      if (autoPlay && !isPlaying) {
        setIsLoading(true);
        setTimeout(() => play(), 100);
      }
      return;
    }
    
    // Track completion of previous song
    if (currentSong && playStartTime && duration > 0) {
      const listenDuration = (Date.now() - playStartTime) / 1000;
      trackSongComplete(currentSong.id, currentSong.title, listenDuration, duration);
    }
    
    // Different song - destroy existing player and create new one
    if (playerRef.current) {
      console.log('iOS Audio: Destroying existing player for new song');
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('iOS Audio: Error destroying existing player:', error);
      }
      playerRef.current = null;
    }
    
    stopSyncInterval();
    stopHealthCheck();
    directYTPlayerRef.current = null;
    
    setCurrentSong(song);
    setShouldAutoPlay(autoPlay);
    setIsPlaying(false);
    setIsLoading(autoPlay);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setPlayStartTime(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSyncInterval();
      stopHealthCheck();
    };
  }, []);

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
    </AudioContext.Provider>
  );
}