import axios from 'axios';
import { findBestMatches } from './matching-service.js';

export interface SpotifyTrackResult {
  type: 'spotify';
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  durationText: string;
  albumCover: string | null;
  explicit: boolean;
  shareUrl: string;
  artists: Array<{
    id: string;
    name: string;
    shareUrl: string;
  }>;
}

export interface YouTubeVideoResult {
  type: 'youtube';
  id: string;
  title: string;
  channel: string;
  channelId: string;
  duration: number; // in seconds
  views: number;
  publishedTime: string;
  thumbnail: string;
  description: string;
  badges: string[];
  isLive: boolean;
}

export interface UnifiedResult {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  spotifyId?: string;
  youtubeId?: string;
  albumCover?: string | null;
  thumbnail?: string;
  explicit?: boolean;
  shareUrl?: string;
  channel?: string;
  views?: number;
  publishedTime?: string;
  badges?: string[];
  isLive?: boolean;
  confidence: number;
  primarySource: 'spotify' | 'youtube';
}

export interface SearchResults {
  results: UnifiedResult[];
}

/**
 * Searches Spotify for tracks matching the given query
 */
export async function searchSpotify(query: string, limit: number = 20): Promise<SpotifyTrackResult[]> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
    params: {
      term: query,
      type: 'track'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const tracks = response.data?.tracks?.items || [];
    
    return tracks.slice(0, limit).map((track: any): SpotifyTrackResult => {
      // Extract album cover - prefer 640x640, fallback to 300x300, then 64x64
      let albumCover = null;
      if (track.album?.cover && track.album.cover.length > 0) {
        const covers = track.album.cover;
        const largeCover = covers.find((cover: any) => cover.width === 640);
        const mediumCover = covers.find((cover: any) => cover.width === 300);
        const smallCover = covers.find((cover: any) => cover.width === 64);
        
        albumCover = largeCover?.url || mediumCover?.url || smallCover?.url || null;
      }

      return {
        type: 'spotify',
        id: track.id,
        title: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        duration: Math.round(track.durationMs / 1000),
        durationText: track.durationText,
        albumCover,
        explicit: track.explicit || false,
        shareUrl: track.shareUrl,
        artists: track.artists || []
      };
    });
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
}

/**
 * Searches YouTube for videos matching the given query
 */
export async function searchYouTube(query: string, limit: number = 20): Promise<YouTubeVideoResult[]> {
  const options = {
    method: 'GET',
    url: 'https://youtube138.p.rapidapi.com/search/',
    params: {
      q: query,
      hl: 'en',
      gl: 'US'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'youtube138.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const contents = response.data?.contents || [];
    
    // Filter only video content and limit results
    const videos = contents
      .filter((item: any) => item.type === 'video' && item.video)
      .slice(0, limit);
    
    return videos.map((item: any): YouTubeVideoResult => {
      const video = item.video;
      
      // Get the best available thumbnail
      const thumbnail = video.thumbnails?.[0]?.url || '';
      
      // Extract view count
      const views = video.stats?.views || 0;
      
      // Get channel info
      const channel = video.author?.title || 'Unknown Channel';
      const channelId = video.author?.channelId || '';
      
      // Get badges
      const badges = video.badges || [];
      
      return {
        type: 'youtube',
        id: video.videoId,
        title: video.title,
        channel,
        channelId,
        duration: video.lengthSeconds || 0,
        views,
        publishedTime: video.publishedTimeText || '',
        thumbnail,
        description: video.descriptionSnippet || '',
        badges,
        isLive: video.isLiveNow || false
      };
    });
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

/**
 * Searches both Spotify and YouTube and returns merged results
 */
export async function searchBoth(
  query: string, 
  spotifyLimit: number = 10, 
  youtubeLimit: number = 10
): Promise<SearchResults> {
  try {
    // Execute both searches in parallel for better performance
    const [spotifyResults, youtubeResults] = await Promise.all([
      searchSpotify(query, spotifyLimit),
      searchYouTube(query, youtubeLimit)
    ]);

    // Use matching algorithm to create unified results
    const unifiedResults = findBestMatches(spotifyResults, youtubeResults);

    return {
      results: unifiedResults
    };
  } catch (error) {
    console.error('Error in searchBoth:', error);
    
    // Return empty results on error
    return {
      results: []
    };
  }
}

/**
 * Simple Spotify-only search
 */
export async function simpleSpotifySearch(query: string, limit: number = 20): Promise<SearchResults> {
  try {
    const spotifyResults = await searchSpotify(query, limit);
    
    // Convert Spotify results to UnifiedResult format
    const unifiedResults: UnifiedResult[] = spotifyResults.map(track => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      spotifyId: track.id,
      albumCover: track.albumCover,
      explicit: track.explicit,
      shareUrl: track.shareUrl,
      confidence: 100, // Always 100% for direct Spotify results
      primarySource: 'spotify' as const
    }));

    return {
      results: unifiedResults
    };
  } catch (error) {
    console.error('Error in simpleSpotifySearch:', error);
    return {
      results: []
    };
  }
}