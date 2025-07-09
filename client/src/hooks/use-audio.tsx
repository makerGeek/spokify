import { createContext, useContext, useState, ReactNode } from "react";
import { type Song } from "@shared/schema";

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const play = () => {
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  return (
    <AudioContext.Provider value={{
      currentSong,
      isPlaying,
      setCurrentSong,
      togglePlay,
      play,
      pause
    }}>
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
