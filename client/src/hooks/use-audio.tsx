import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { type Song } from "@shared/schema";
import { PlayerAdapter, PlayerCallbacks, PlayerState } from "@/lib/player-adapter";
import { PlayerFactory } from "@/lib/player-factory";

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
  
  // Ref hooks
  const playerRef = useRef<PlayerAdapter | null>(null);

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

  // Create player when song changes
  useEffect(() => {
    if (!currentSong?.audioUrl) {
      console.log('No song or audio URL');
      return;
    }

    // For YouTube players, wait for API to be ready
    const needsYouTubeAPI = PlayerFactory.getPlayerTypeFromUrl(currentSong.audioUrl) === 'youtube';
    if (needsYouTubeAPI && !isYouTubeReady) {
      console.log('YouTube API not ready yet');
      return;
    }

    console.log('Creating player for:', currentSong.title, 'Audio URL:', currentSong.audioUrl);

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

    // Create player based on URL
    const createPlayer = async () => {
      try {
        const player = PlayerFactory.createPlayerFromUrl(currentSong.audioUrl || '');
        playerRef.current = player;

        const callbacks: PlayerCallbacks = {
          onStateChange: (state: Partial<PlayerState>) => {
            if (state.isPlaying !== undefined) setIsPlaying(state.isPlaying);
            if (state.isLoading !== undefined) setIsLoading(state.isLoading);
            if (state.hasError !== undefined) setHasError(state.hasError);
          },
          onReady: (songDuration: number) => {
            console.log('Player ready, duration:', songDuration);
            setDuration(songDuration);
            setHasError(false);
            
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
                  }
                }
              }, 500);
            }
          },
          onError: (error: string) => {
            console.error('Player error:', error);
            setIsPlaying(false);
            setHasError(true);
            setIsLoading(false);
          },
          onTimeUpdate: (time: number) => {
            setCurrentTime(time);
          }
        };

        // Only get the audio URL when we're about to load it - this prevents unnecessary downloads
        const audioUrlToPlay = PlayerFactory.getAudioUrlToPlay({
          audioUrl: currentSong.audioUrl,
          youtubeId: (currentSong as any).youtubeId || null
        });

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
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying player in cleanup:', error);
        }
        playerRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [currentSong, isYouTubeReady]);

  const play = async () => {
    console.log('Play requested, player ready:', playerRef.current?.isReady());
    console.log('Current song:', currentSong?.title);
    
    if (playerRef.current?.isReady()) {
      try {
        console.log('Calling play');
        setIsLoading(true);
        await playerRef.current.play();
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
      await play();
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