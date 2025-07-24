import { PlayerAdapter, PlayerCallbacks, PlayerState } from '../player-adapter';

export class MP3PlayerAdapter implements PlayerAdapter {
  private audio: HTMLAudioElement | null = null;
  private callbacks: PlayerCallbacks | null = null;
  private timeUpdateInterval: NodeJS.Timeout | null = null;
  private isPlayerReady = false;

  constructor() {
    // Create audio element
    this.audio = new Audio();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('loadedmetadata', () => {
      this.isPlayerReady = true;
      const duration = this.audio?.duration || 0;
      this.callbacks?.onReady(duration);
      this.callbacks?.onStateChange({ hasError: false });
    });

    this.audio.addEventListener('play', () => {
      this.callbacks?.onStateChange({ 
        isPlaying: true, 
        isLoading: false 
      });
      this.startTimeUpdate();
    });

    this.audio.addEventListener('pause', () => {
      this.callbacks?.onStateChange({ 
        isPlaying: false, 
        isLoading: false 
      });
      this.stopTimeUpdate();
    });

    this.audio.addEventListener('ended', () => {
      this.callbacks?.onStateChange({ 
        isPlaying: false, 
        isLoading: false 
      });
      this.stopTimeUpdate();
    });

    this.audio.addEventListener('waiting', () => {
      this.callbacks?.onStateChange({ 
        isLoading: true 
      });
    });

    this.audio.addEventListener('canplay', () => {
      this.callbacks?.onStateChange({ 
        isLoading: false 
      });
    });

    this.audio.addEventListener('error', (event) => {
      const error = this.audio?.error;
      let errorMessage = 'Unknown audio error';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            break;
        }
      }

      this.callbacks?.onError(errorMessage);
      this.callbacks?.onStateChange({ 
        isPlaying: false, 
        hasError: true,
        isLoading: false 
      });
      this.stopTimeUpdate();
    });

    this.audio.addEventListener('loadstart', () => {
      this.callbacks?.onStateChange({ 
        isLoading: true 
      });
    });

    this.audio.addEventListener('progress', () => {
      // Update loading state based on buffering
      if (this.audio && this.audio.readyState >= 2) {
        this.callbacks?.onStateChange({ 
          isLoading: false 
        });
      }
    });
  }

  async load(audioUrl: string, callbacks: PlayerCallbacks): Promise<void> {
    this.callbacks = callbacks;
    
    return new Promise((resolve, reject) => {
      if (!this.audio) {
        reject(new Error('Audio element not available'));
        return;
      }

      this.stopTimeUpdate();
      this.isPlayerReady = false;

      // Set up one-time listeners for this load
      const handleLoadedMetadata = () => {
        this.audio?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        this.audio?.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        this.audio?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        this.audio?.removeEventListener('error', handleError);
        reject(new Error('Failed to load audio'));
      };

      this.audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      this.audio.addEventListener('error', handleError);

      // Load the audio
      try {
        this.audio.src = audioUrl;
        this.audio.load();
      } catch (error) {
        this.audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        this.audio.removeEventListener('error', handleError);
        reject(error);
      }
    });
  }

  private startTimeUpdate() {
    if (this.timeUpdateInterval) return;
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.audio && !this.audio.paused) {
        const time = this.audio.currentTime;
        if (!isNaN(time)) {
          this.callbacks?.onTimeUpdate(Math.floor(time));
        }
      }
    }, 1000);
  }

  private stopTimeUpdate() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  async play(): Promise<void> {
    if (!this.audio || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      this.callbacks?.onStateChange({ isLoading: true });
      await this.audio.play();
    } catch (error) {
      this.callbacks?.onStateChange({ isLoading: false, hasError: true });
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (!this.audio || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      this.callbacks?.onStateChange({ isLoading: false });
      this.audio.pause();
    } catch (error) {
      this.callbacks?.onStateChange({ isLoading: false, hasError: true });
      throw error;
    }
  }

  async seekTo(time: number): Promise<void> {
    if (!this.audio || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      this.audio.currentTime = time;
      this.callbacks?.onTimeUpdate(time);
    } catch (error) {
      throw error;
    }
  }

  getCurrentTime(): number {
    if (!this.audio || !this.isPlayerReady) return 0;
    return this.audio.currentTime || 0;
  }

  getDuration(): number {
    if (!this.audio || !this.isPlayerReady) return 0;
    return this.audio.duration || 0;
  }

  isReady(): boolean {
    return this.isPlayerReady && !!this.audio;
  }

  destroy(): void {
    this.stopTimeUpdate();
    
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load(); // This helps free up resources
      this.audio = null;
    }

    this.isPlayerReady = false;
    this.callbacks = null;
  }
}