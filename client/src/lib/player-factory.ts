import { PlayerAdapter, PlayerType, PlayerConfig } from './player-adapter';
import { YouTubePlayerAdapter } from './players/youtube-player-adapter';
import { MP3PlayerAdapter } from './players/mp3-player-adapter';

export class PlayerFactory {
  /**
   * Detects if the current device is iOS
   */
  static isIOS(): boolean {
    // Check for iOS-specific properties
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  static createPlayer(config: PlayerConfig): PlayerAdapter {
    switch (config.type) {
      case PlayerType.YOUTUBE:
        return new YouTubePlayerAdapter();
      case PlayerType.MP3:
        return new MP3PlayerAdapter();
      default:
        throw new Error(`Unsupported player type: ${config.type}`);
    }
  }

  /**
   * Determines the appropriate player type based on device detection
   * If device is iOS, use MP3 player, otherwise use YouTube player
   */
  static getPlayerTypeFromUrl(audioUrl: string): PlayerType {
    if (this.isIOS()) {
      console.log('Using MP3 player for iOS device');
      return PlayerType.MP3;
    } else {
      console.log('Using YouTube player for non-iOS device');
      return PlayerType.YOUTUBE;
    }
  }

  /**
   * Creates a player based on the current page URL and audio URL
   */
  static createPlayerFromUrl(audioUrl: string, config?: Partial<PlayerConfig>): PlayerAdapter {
    const playerType = this.getPlayerTypeFromUrl(audioUrl);
    
    const finalConfig: PlayerConfig = {
      type: playerType,
      autoplay: false,
      volume: 1.0,
      ...config
    };
    
    return this.createPlayer(finalConfig);
  }

  /**
   * Gets the actual audio URL to use based on device and player type
   * If device is iOS, use audioUrl (MP3), otherwise use appropriate field for player type
   */
  static getAudioUrlToPlay(song: { audioUrl: string | null; youtubeId: string | null }): string {
    const playerType = this.getPlayerTypeFromUrl('');
    
    if (playerType === PlayerType.MP3 || this.isIOS()) {
      console.log('Using audioUrl for MP3 player (iOS or MP3 player selected)');
      return song.audioUrl || '';
    } else {
      console.log('Using youtubeId for YouTube player');
      return song.youtubeId || '';
    }
  }
}