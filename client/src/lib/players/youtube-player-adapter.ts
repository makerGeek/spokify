import { PlayerAdapter, PlayerCallbacks, PlayerState } from '../player-adapter';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export class YouTubePlayerAdapter implements PlayerAdapter {
  private player: any = null;
  private callbacks: PlayerCallbacks | null = null;
  private containerId: string;
  private timeUpdateInterval: NodeJS.Timeout | null = null;
  private isPlayerReady = false;
  private isVisible: boolean;

  constructor(options?: { visible?: boolean; targetElementId?: string }) {
    this.containerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.isVisible = options?.visible ?? false;
    this.createContainer(options?.targetElementId);
  }

  private createContainer(targetElementId?: string) {
    // Create container for YouTube player
    const container = document.createElement('div');
    container.id = this.containerId;
    container.className = 'youtube-player-container';
    
    // Set container dimensions and styling
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = '#000';
    container.style.borderRadius = '8px';
    container.style.overflow = 'hidden';
    
    if (!this.isVisible) {
      container.style.display = 'none';
    }
    
    // If target element is specified, append there, otherwise to body (hidden)
    if (targetElementId) {
      const targetElement = document.getElementById(targetElementId);
      if (targetElement) {
        targetElement.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    } else {
      document.body.appendChild(container);
    }
  }

  async load(audioUrl: string, callbacks: PlayerCallbacks): Promise<void> {
    this.callbacks = callbacks;
    
    return new Promise((resolve, reject) => {
      // Wait for YouTube API to be ready
      if (!window.YT || !window.YT.Player) {
        reject(new Error('YouTube API not available'));
        return;
      }

      // Clean up existing player
      if (this.player) {
        try {
          this.player.destroy();
        } catch (error) {
          console.warn('Error destroying existing YouTube player:', error);
        }
      }

      this.stopTimeUpdate();
      this.isPlayerReady = false;

      try {
        this.player = new window.YT.Player(this.containerId, {
          height: '100%',
          width: '100%',
          videoId: audioUrl,
          playerVars: {
            autoplay: 0,
            controls: this.isVisible ? 1 : 0,
            disablekb: this.isVisible ? 0 : 1,
            fs: this.isVisible ? 1 : 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: this.isVisible ? 1 : 0,
          },
          events: {
            onReady: (event: any) => {
              this.isPlayerReady = true;
              const duration = event.target.getDuration();
              this.callbacks?.onReady(duration);
              this.callbacks?.onStateChange({ hasError: false });
              resolve();
            },
            onStateChange: (event: any) => {
              this.handleStateChange(event.data);
            },
            onError: (event: any) => {
              this.handleError(event.data);
              reject(new Error(`YouTube Error: ${event.data}`));
            },
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleStateChange(state: number) {
    if (!this.callbacks) return;

    switch (state) {
      case window.YT.PlayerState.PLAYING:
        this.callbacks.onStateChange({ 
          isPlaying: true, 
          isLoading: false 
        });
        this.startTimeUpdate();
        break;
      case window.YT.PlayerState.PAUSED:
      case window.YT.PlayerState.ENDED:
        this.callbacks.onStateChange({ 
          isPlaying: false, 
          isLoading: false 
        });
        this.stopTimeUpdate();
        break;
      case window.YT.PlayerState.BUFFERING:
        this.callbacks.onStateChange({ 
          isLoading: true 
        });
        break;
    }
  }

  private handleError(errorCode: number) {
    const errorMessages: { [key: number]: string } = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Video owner has disallowed embedding',
      150: 'Video owner has disallowed embedding'
    };
    
    const errorMessage = errorMessages[errorCode] || 'Unknown error';
    this.callbacks?.onError(errorMessage);
    this.callbacks?.onStateChange({ 
      isPlaying: false, 
      hasError: true,
      isLoading: false 
    });
    this.stopTimeUpdate();
  }

  private startTimeUpdate() {
    if (this.timeUpdateInterval) return;
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        const time = this.player.getCurrentTime();
        if (time && !isNaN(time)) {
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
    if (!this.player || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      this.callbacks?.onStateChange({ isLoading: true });
      this.player.playVideo();
    } catch (error) {
      this.callbacks?.onStateChange({ isLoading: false, hasError: true });
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (!this.player || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      this.callbacks?.onStateChange({ isLoading: false });
      this.player.pauseVideo();
    } catch (error) {
      this.callbacks?.onStateChange({ isLoading: false, hasError: true });
      throw error;
    }
  }

  async seekTo(time: number): Promise<void> {
    if (!this.player || !this.isPlayerReady) {
      throw new Error('Player not ready');
    }

    try {
      const wasPlaying = this.player.getPlayerState() === window.YT.PlayerState.PLAYING;
      this.player.seekTo(time, true);
      this.callbacks?.onTimeUpdate(time);
      
      if (!wasPlaying) {
        // Pause after seeking if wasn't playing before
        setTimeout(() => {
          if (this.player && typeof this.player.pauseVideo === 'function') {
            this.player.pauseVideo();
          }
        }, 100);
      }
    } catch (error) {
      throw error;
    }
  }

  getCurrentTime(): number {
    if (!this.player || !this.isPlayerReady) return 0;
    try {
      return this.player.getCurrentTime() || 0;
    } catch {
      return 0;
    }
  }

  getDuration(): number {
    if (!this.player || !this.isPlayerReady) return 0;
    try {
      return this.player.getDuration() || 0;
    } catch {
      return 0;
    }
  }

  isReady(): boolean {
    return this.isPlayerReady && !!this.player;
  }

  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    const container = document.getElementById(this.containerId);
    
    if (container) {
      container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  setVisibility(visible: boolean): void {
    this.isVisible = visible;
    const container = document.getElementById(this.containerId);
    
    if (container) {
      container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  getContainerId(): string {
    return this.containerId;
  }

  isVideoVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.stopTimeUpdate();
    
    if (this.player) {
      try {
        this.player.destroy();
      } catch (error) {
        console.warn('Error destroying YouTube player:', error);
      }
      this.player = null;
    }

    // Remove container
    const container = document.getElementById(this.containerId);
    if (container) {
      container.remove();
    }

    this.isPlayerReady = false;
    this.callbacks = null;
  }
}