import { PlayerAdapter, PlayerType, PlayerConfig } from './player-adapter';
import { YouTubePlayerAdapter } from './players/youtube-player-adapter';
import { MP3PlayerAdapter } from './players/mp3-player-adapter';

export class PlayerFactory {
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
   * Determines the appropriate player type based on the current page URL
   * If current page URL contains ?try=true, use MP3 player, otherwise use YouTube player
   */
  static getPlayerTypeFromUrl(audioUrl: string): PlayerType {
    // Check current page URL for try=true parameter
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('try=true')) {
      console.log('Using MP3 player due to ?try=true in page URL:', currentUrl);
      return PlayerType.MP3;
    } else {
      console.log('Using YouTube player (no ?try=true in page URL):', currentUrl);
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
   * Gets the actual audio URL to use based on page URL
   * If page has ?try=true, use sample MP3, otherwise use original audioUrl
   */
  static getAudioUrlToPlay(originalAudioUrl: string): string {
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('try=true')) {
      // Use sample MP3 file when try=true is in page URL
      const sampleMp3Url = 'https://scd.dlod.link/?expire=1753399119171&p=Mr_84tbkaADhIblI8rfcgSrQGA5uMTLhwvVNc0DwTTDTPEt7aBq9u0LemAaoZ7zbEI4I8l9q1IhbjbKbQ_vxWJs30G1YVZUf4eF4zb4Lk6iA1wIoh6iZVtnZF34rVxRBPfGiqgGI-J9XcZGzGNqF4w&s=zhqc9PY5p6DOHmgQlQ6mEnOGLA-SArH3rmr0x4NUZ_U';
      console.log('Using sample MP3 file due to ?try=true in page URL');
      return sampleMp3Url;
    } else {
      console.log('Using original audioUrl from database');
      return originalAudioUrl;
    }
  }
}