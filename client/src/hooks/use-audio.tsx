import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { type Song } from "@shared/schema";
import { PlayerAdapter, PlayerCallbacks, PlayerState, PlayerType } from "@/lib/player-adapter";
import { PlayerFactory } from "@/lib/player-factory";
import { api } from "@/lib/api-client";
import { trackSongPlay, trackSongComplete } from "@/lib/analytics";

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

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
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


  // Listen for YouTube API ready event (still needed for YouTube adapter)
  useEffect(() => {
    const checkYouTubeReady = () => {
      if (window.YT && window.YT.Player) {
        console.log('YouTube API available');
        setIsYouTubeReady(true);
      }
    };

    checkYouTubeReady();

    const handleYouTubeReady = () => {
      console.log('YouTube API ready event received in audio hook');
      setIsYouTubeReady(true);
    };

    window.addEventListener('youtubeAPIReady', handleYouTubeReady);

    if (window.youTubeAPIReady) {
      console.log('YouTube API already ready according to flag');
      setIsYouTubeReady(true);
    }

    return () => {
      window.removeEventListener('youtubeAPIReady', handleYouTubeReady);
    };
  }, []);

  // Sync interval functions
  const startSyncInterval = () => {
    if (syncIntervalRef.current) return;
    
    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current?.isReady()) {
        try {
          // Sync play state with YouTube player
          const ytPlayer = (playerRef.current as any).player;
          if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
            const ytState = ytPlayer.getPlayerState();
            const shouldBePlaying = ytState === window.YT?.PlayerState?.PLAYING;
            
            if (shouldBePlaying !== isPlaying) {
              console.log('Sync: YouTube state mismatch, correcting...', { ytState, shouldBePlaying, currentIsPlaying: isPlaying });
              setIsPlaying(shouldBePlaying);
              if (!shouldBePlaying) {
                setIsLoading(false);
              }
            }
          }
        } catch (error) {
          console.warn('Sync interval error:', error);
        }
      }
    }, 2000); // Check every 2 seconds
  };

  const stopSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  // Create player when song changes
  useEffect(() => {
    if (!currentSong) {
      console.log('No song');
      return;
    }

    // Check if song has YouTube ID
    const hasYouTubeId = !!(currentSong as any).youtubeId;
    
    if (!hasYouTubeId) {
      console.log('No YouTube ID for song:', currentSong.title);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Wait for YouTube API to be ready
    if (!isYouTubeReady) {
      console.log('YouTube API not ready yet');
      return;
    }

    console.log('Creating YouTube player for:', currentSong.title);

    // Reset state immediately when switching songs
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

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

    // Create YouTube player
    const createPlayer = async () => {
      try {
        const audioUrlToPlay = PlayerFactory.getAudioUrlToPlay({
          audioUrl: null,
          youtubeId: (currentSong as any).youtubeId
        });

        const player = PlayerFactory.createPlayerFromUrl(audioUrlToPlay, { 
          visible: true // Always create visible players for better iOS compatibility
        });
        playerRef.current = player;

        const callbacks: PlayerCallbacks = {
          onStateChange: (state: Partial<PlayerState>) => {
            console.log('Player state change:', state);
            if (state.isPlaying !== undefined) {
              setIsPlaying(state.isPlaying);
              // Clear loading state when playback starts
              if (state.isPlaying) {
                setIsLoading(false);
                // Start sync interval when playing
                startSyncInterval();
              } else {
                // Stop sync interval when not playing
                stopSyncInterval();
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
            console.log('Player ready, duration:', songDuration);
            setDuration(songDuration);
            setHasError(false);
            setIsLoading(false); // Clear loading state when player is ready
            
            // Auto-play if requested
            if (shouldAutoPlay) {
              console.log('Auto-playing song after player ready');
              setShouldAutoPlay(false);
              setTimeout(async () => {
                if (playerRef.current?.isReady()) {
                  try {
                    await playerRef.current.play();
                  } catch (error) {
                    console.error('Auto-play failed:', error);
                    setIsLoading(false); // Clear loading on error
                  }
                }
              }, 500);
            }
          },
          onError: async (error: string) => {
            console.error('Player error:', error);
            setIsPlaying(false);
            setHasError(true);
            setIsLoading(false);
          },
          onTimeUpdate: (time: number) => {
            setCurrentTime(time);
          }
        };

        await player.load(audioUrlToPlay, callbacks);
      } catch (error) {
        console.error('Error creating player:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Use setTimeout to ensure proper cleanup
    const timeoutId = setTimeout(createPlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      stopSyncInterval();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying player in cleanup:', error);
        }
        playerRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    };
  }, [currentSong, isYouTubeReady]);

  const play = async () => {
    console.log('Play requested, player ready:', playerRef.current?.isReady());
    console.log('Current song:', currentSong?.title);
    
    if (playerRef.current?.isReady()) {
      try {
        console.log('Calling play');
        setIsLoading(true);
        setHasError(false); // Clear any previous errors
        
        // Set a timeout to clear loading state if it gets stuck
        const loadingTimeout = setTimeout(() => {
          console.warn('Play loading timeout - checking actual YouTube state');
          try {
            const ytPlayer = (playerRef.current as any)?.player;
            if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
              const ytState = ytPlayer.getPlayerState();
              if (ytState === window.YT?.PlayerState?.PLAYING) {
                console.log('YouTube is actually playing, clearing loading state');
                setIsPlaying(true);
                setIsLoading(false);
              } else if (ytState === window.YT?.PlayerState?.PAUSED) {
                console.log('YouTube is paused, clearing loading state');
                setIsPlaying(false);
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.warn('Error checking YouTube state in timeout:', error);
            setIsLoading(false);
          }
        }, 5000);
        
        await playerRef.current.play();
        
        // Clear the timeout if play completes normally
        clearTimeout(loadingTimeout);
        
        // Track song play when it actually starts
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
        
        // Note: Loading state will be cleared by onStateChange when PLAYING state is received
      } catch (error) {
        console.error('Error calling play:', error);
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      console.error('Player not ready');
      setHasError(true);
      setIsLoading(false);
    }
  };

  const pause = async () => {
    console.log('Pause requested, player ready:', playerRef.current?.isReady());
    if (playerRef.current?.isReady()) {
      try {
        console.log('Calling pause');
        setIsLoading(false);
        await playerRef.current.pause();
      } catch (error) {
        console.error('Error calling pause:', error);
        setIsPlaying(false);
        setIsLoading(false);
      }
    } else {
      console.error('Player not ready');
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await pause();
    } else {
      setIsLoading(true);
      
      // Safety timeout to clear loading state if it gets stuck
      const loadingTimeout = setTimeout(() => {
        console.warn('Loading state timeout - clearing loading');
        setIsLoading(false);
      }, 10000); // 10 seconds timeout
      
      try {
        await play();
      } finally {
        clearTimeout(loadingTimeout);
      }
    }
  };

  const seekTo = async (time: number) => {
    if (playerRef.current?.isReady()) {
      try {
        await playerRef.current.seekTo(time);
        setCurrentTime(time);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const setCurrentSongWrapper = (song: Song | null, autoPlay: boolean = false) => {
    // If it's the same song, don't recreate the player - just handle play state
    if (currentSong && song && currentSong.id === song.id) {
      console.log('Same song requested, handling play state instead of recreating player');
      setShouldAutoPlay(autoPlay);
      
      if (autoPlay && !isPlaying) {
        setIsLoading(true);
        setTimeout(() => play(), 100);
      }
      return;
    }
    
    // Track completion of previous song if it was playing
    if (currentSong && playStartTime && duration > 0) {
      const listenDuration = (Date.now() - playStartTime) / 1000;
      trackSongComplete(currentSong.id, currentSong.title, listenDuration, duration);
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
    setIsLoading(autoPlay);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setPlayStartTime(null); // Reset play start time for new song
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSyncInterval();
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

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}