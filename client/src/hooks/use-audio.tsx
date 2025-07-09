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
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const playerRef = useRef<any>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerId = useRef(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);

  // Initialize YouTube API
  useEffect(() => {
    const initializeYouTube = () => {
      if (window.YT && window.YT.Player) {
        console.log('YouTube API already loaded');
        setIsYouTubeReady(true);
      } else {
        console.log('Waiting for YouTube API to load...');
        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube API ready');
          setIsYouTubeReady(true);
        };
      }
    };

    // Check if script is already loaded
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      initializeYouTube();
    } else {
      // Load the script if not present
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
      initializeYouTube();
    }
  }, []);

  // Create YouTube player when song changes
  useEffect(() => {
    if (!isYouTubeReady || !currentSong?.audioUrl) {
      console.log('YouTube not ready or no song:', { isYouTubeReady, audioUrl: currentSong?.audioUrl });
      return;
    }

    console.log('Creating YouTube player for:', currentSong.title, 'Video ID:', currentSong.audioUrl);

    // Clean up existing player
    if (playerRef.current) {
      console.log('Destroying existing player');
      playerRef.current.destroy();
    }

    // Create new player
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
          },
          onStateChange: (event: any) => {
            console.log('Player state changed:', event.data);
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startTimeUpdate();
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopTimeUpdate();
            }
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
          },
        },
      });
    } catch (error) {
      console.error('Error creating YouTube player:', error);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      stopTimeUpdate();
    };
  }, [currentSong, isYouTubeReady]);

  const startTimeUpdate = () => {
    if (timeUpdateIntervalRef.current) return;
    
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        setCurrentTime(playerRef.current.getCurrentTime());
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
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      console.log('Calling playVideo');
      playerRef.current.playVideo();
    } else {
      console.error('Player not ready or playVideo not available');
    }
  };

  const pause = () => {
    console.log('Pause requested, player:', !!playerRef.current);
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      console.log('Calling pauseVideo');
      playerRef.current.pauseVideo();
    } else {
      console.error('Player not ready or pauseVideo not available');
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seekTo = (time: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        setCurrentSong,
        togglePlay,
        play,
        pause,
        currentTime,
        duration,
        seekTo,
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