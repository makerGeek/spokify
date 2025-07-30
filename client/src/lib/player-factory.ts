import { PlayerAdapter, PlayerType, PlayerConfig } from './player-adapter';
import { YouTubePlayerAdapter } from './players/youtube-player-adapter';

export class PlayerFactory {
  static createPlayer(config: PlayerConfig): PlayerAdapter {
    switch (config.type) {
      case PlayerType.YOUTUBE:
        return new YouTubePlayerAdapter({ 
          visible: (config as any).visible ?? false 
        });
      default:
        throw new Error(`Unsupported player type: ${config.type}`);
    }
  }

  /**
   * Creates a YouTube player
   */
  static createPlayerFromUrl(audioUrl: string, config?: Partial<PlayerConfig>): PlayerAdapter {
    const finalConfig: PlayerConfig = {
      type: PlayerType.YOUTUBE,
      autoplay: false,
      volume: 1.0,
      ...config
    };
    
    return this.createPlayer(finalConfig);
  }

  /**
   * Gets the YouTube ID from the song
   */
  static getAudioUrlToPlay(song: { audioUrl: string | null; youtubeId: string | null }): string {
    console.log('Using youtubeId for YouTube player');
    return song.youtubeId || '';
  }
}