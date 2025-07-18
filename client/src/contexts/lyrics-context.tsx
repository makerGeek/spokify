import React, { createContext, useContext, useState, useCallback } from 'react';

interface LyricsContextType {
  isLyricsVisible: boolean;
  requestLyricsClose: () => void;
  setLyricsVisible: (visible: boolean) => void;
  onLyricsCloseRequest: (() => void) | null;
  setOnLyricsCloseRequest: (callback: (() => void) | null) => void;
}

const LyricsContext = createContext<LyricsContextType | undefined>(undefined);

export const LyricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [onLyricsCloseRequest, setOnLyricsCloseRequest] = useState<(() => void) | null>(null);

  const setLyricsVisible = useCallback((visible: boolean) => {
    setIsLyricsVisible(visible);
  }, []);

  const requestLyricsClose = useCallback(() => {
    if (onLyricsCloseRequest) {
      onLyricsCloseRequest();
    }
  }, [onLyricsCloseRequest]);

  return (
    <LyricsContext.Provider
      value={{
        isLyricsVisible,
        requestLyricsClose,
        setLyricsVisible,
        onLyricsCloseRequest,
        setOnLyricsCloseRequest,
      }}
    >
      {children}
    </LyricsContext.Provider>
  );
};

export const useLyrics = () => {
  const context = useContext(LyricsContext);
  if (context === undefined) {
    throw new Error('useLyrics must be used within a LyricsProvider');
  }
  return context;
};