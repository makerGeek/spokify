export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  hasError: boolean;
}

export interface PlayerCallbacks {
  onStateChange: (state: Partial<PlayerState>) => void;
  onReady: (duration: number) => void;
  onError: (error: string) => void;
  onTimeUpdate: (currentTime: number) => void;
}

export interface PlayerAdapter {
  load(audioUrl: string, callbacks: PlayerCallbacks): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(time: number): Promise<void>;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
  isReady(): boolean;
}

export enum PlayerType {
  YOUTUBE = 'youtube',
  MP3 = 'mp3'
}

export interface PlayerConfig {
  type: PlayerType;
  autoplay?: boolean;
  volume?: number;
}