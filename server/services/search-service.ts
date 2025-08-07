import axios from 'axios';
import { findBestMatches } from './matching-service.js';
import { db } from '../db.js';
import { songs } from '@shared/schema';
import { inArray, eq } from 'drizzle-orm';

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
  songId?: number; // Database song ID if exists
  available?: boolean; // True if song exists in our database
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
  songId?: number; // Database song ID if exists
  available?: boolean; // True if song exists in our database
}

export interface SearchResults {
  results: UnifiedResult[];
}

/**
 * Check if tracks exist in our database by Spotify ID
 */
async function checkExistingTracks(spotifyIds: string[]): Promise<Map<string, number>> {
  if (spotifyIds.length === 0) return new Map();
  
  try {
    const existingSongs = await db
      .select({ id: songs.id, spotifyId: songs.spotifyId })
      .from(songs)
      .where(inArray(songs.spotifyId, spotifyIds));
    
    const songMap = new Map<string, number>();
    existingSongs.forEach(song => {
      if (song.spotifyId) {
        songMap.set(song.spotifyId, song.id);
      }
    });
    
    return songMap;
  } catch (error) {
    console.error('Error checking existing tracks:', error);
    return new Map();
  }
}

/**
 * Add availability information to tracks
 */
async function addAvailabilityInfo<T extends { id: string }>(tracks: T[]): Promise<(T & { songId?: number; available?: boolean })[]> {
  const spotifyIds = tracks.map(track => track.id);
  const existingSongs = await checkExistingTracks(spotifyIds);
  
  return tracks.map(track => ({
    ...track,
    songId: existingSongs.get(track.id),
    available: existingSongs.has(track.id)
  }));
}

/**
 * Comprehensive Spotify search for all content types
 */
export async function searchSpotifyAll(query: string, limit: number = 20): Promise<{
  tracks: SpotifyTrackResult[];
  albums: any[];
  artists: any[];
}> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
    params: {
      term: query,
      type: 'all'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const data = response.data || {};
    
    // Process tracks
    const tracks = (data.tracks?.items || []).slice(0, limit).map((track: any): SpotifyTrackResult => {
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

    // Process albums - filter out invalid albums
    const albums = (data.albums?.items || [])
      .filter((album: any) => {
        // Filter out albums with no name or "Unknown Artist"
        const hasValidName = album.name && album.name.trim().length > 0;
        const hasValidArtist = album.artists?.[0]?.name && album.artists[0].name !== 'Unknown Artist';
        return hasValidName && hasValidArtist;
      })
      .slice(0, limit)
      .map((album: any) => {
        let albumCover = null;
        if (album.cover && album.cover.length > 0) {
          const covers = album.cover;
          const largeCover = covers.find((cover: any) => cover.width === 640);
          const mediumCover = covers.find((cover: any) => cover.width === 300);
          const smallCover = covers.find((cover: any) => cover.width === 64);
          
          albumCover = largeCover?.url || mediumCover?.url || smallCover?.url || null;
        }

        return {
          type: 'album',
          id: album.id,
          name: album.name,
          artist: album.artists?.[0]?.name || 'Unknown Artist',
          date: album.date,
          cover: albumCover,
          shareUrl: album.shareUrl,
          artists: album.artists || []
        };
      });

    // Process artists - only include verified artists
    console.log('Raw artists from Spotify API:', (data.artists?.items || []).map((a: any) => ({ name: a.name, verified: a.verified })));
    
    const artists = (data.artists?.items || [])
      .filter((artist: any) => {
        console.log(`Artist ${artist.name}: verified = ${artist.verified}`);
        return artist.verified === true;
      }) // Only verified artists
      .slice(0, limit)
      .map((artist: any) => {
        let avatar = null;
        if (artist.visuals?.avatar && artist.visuals.avatar.length > 0) {
          const avatars = artist.visuals.avatar;
          const largeAvatar = avatars.find((av: any) => av.width === 640);
          const mediumAvatar = avatars.find((av: any) => av.width === 320);
          const smallAvatar = avatars.find((av: any) => av.width === 160);
          
          avatar = largeAvatar?.url || mediumAvatar?.url || smallAvatar?.url || null;
        }

        return {
          type: 'artist',
          id: artist.id,
          name: artist.name,
          verified: artist.verified || false, // Include for debugging
          avatar,
          shareUrl: artist.shareUrl
        };
      });

    return { tracks, albums, artists };
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return { tracks: [], albums: [], artists: [] };
  }
}

/**
 * Searches Spotify for tracks only (backward compatibility)
 */
export async function searchSpotify(query: string, limit: number = 20): Promise<SpotifyTrackResult[]> {
  const results = await searchSpotifyAll(query, limit);
  return results.tracks;
}

/**
 * Get artist's albums/singles/compilations/appears-on
 */
export async function getArtistAlbums(artistId: string, type: string = 'album'): Promise<any[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  console.log('API Key present:', !!apiKey, 'Length:', apiKey?.length || 0);
  
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/artist/albums',
    params: {
      artistId,
      type
    },
    headers: {
      'x-rapidapi-key': apiKey || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    console.log('Fetching artist albums with options:', options);
    const response = await axios.request(options);
    console.log('Raw artist albums API response:', JSON.stringify(response.data, null, 2));
    
    const albums = response.data?.albums?.items || [];
    console.log(`Found ${albums.length} albums for artist ${artistId}`);
    
    // Filter out invalid albums
    const validAlbums = albums.filter((album: any) => {
      // Filter out albums with no name or "Unknown Artist"
      const hasValidName = album.name && album.name.trim().length > 0;
      const hasValidArtist = album.artists?.[0]?.name && album.artists[0].name !== 'Unknown Artist';
      return hasValidName || hasValidArtist;
    });
    
    console.log(`After filtering: ${validAlbums.length} valid albums`);
    
    return validAlbums.map((album: any) => {
      let albumCover = null;
      // The API response shows covers in a 'cover' array
      if (album.cover && album.cover.length > 0) {
        const covers = album.cover;
        const largeCover = covers.find((cover: any) => cover.width === 640);
        const mediumCover = covers.find((cover: any) => cover.width === 300);
        const smallCover = covers.find((cover: any) => cover.width === 64);
        
        albumCover = largeCover?.url || mediumCover?.url || smallCover?.url || null;
      }

      return {
        type: 'album',
        id: album.id,
        name: album.name,
        artist: album.artists?.[0]?.name || 'Unknown Artist',
        date: album.date, // Keep as date since API shows date field
        cover: albumCover,
        shareUrl: album.shareUrl,
        artists: album.artists || [],
        totalTracks: album.trackCount || 0
      };
    });
  } catch (error: any) {
    console.error('Error fetching artist albums:', error);
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return [];
  }
}

/**
 * Get album tracks
 */
export async function getAlbumTracks(albumId: string): Promise<SpotifyTrackResult[]> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/album/tracks',
    params: {
      albumId
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    console.log('Fetching album tracks with options:', options);
    const response = await axios.request(options);
    console.log('Raw album tracks API response:', JSON.stringify(response.data, null, 2));
    
    const tracks = response.data?.tracks?.items || [];
    console.log(`Found ${tracks.length} tracks for album ${albumId}`);
    
    const mappedTracks = tracks.map((track: any): SpotifyTrackResult => {
      return {
        type: 'spotify',
        id: track.id,
        title: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        duration: Math.round(track.durationMs / 1000),
        durationText: track.durationText,
        albumCover: null, // Album tracks don't include cover, will be inherited from album
        explicit: track.explicit || false,
        shareUrl: track.shareUrl,
        artists: track.artists || []
      };
    });

    // Add availability information
    return await addAvailabilityInfo(mappedTracks);
  } catch (error: any) {
    console.error('Error fetching album tracks:', error);
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
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
 * Comprehensive Spotify search with all content types
 */
export async function comprehensiveSpotifySearch(query: string, limit: number = 20): Promise<{
  tracks: UnifiedResult[];
  albums: any[];
  artists: any[];
}> {
  try {
    const spotifyResults = await searchSpotifyAll(query, limit);
    
    // Add availability info to tracks
    const tracksWithAvailability = await addAvailabilityInfo(spotifyResults.tracks);
    
    // Convert tracks to UnifiedResult format for backward compatibility
    const unifiedTracks: UnifiedResult[] = tracksWithAvailability.map(track => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      spotifyId: track.id,
      albumCover: track.albumCover,
      explicit: track.explicit,
      shareUrl: track.shareUrl,
      confidence: 100, // Always 100% for direct Spotify results
      primarySource: 'spotify' as const,
      songId: track.songId,
      available: track.available
    }));

    return {
      tracks: unifiedTracks,
      albums: spotifyResults.albums,
      artists: spotifyResults.artists
    };
  } catch (error) {
    console.error('Error in comprehensiveSpotifySearch:', error);
    return {
      tracks: [],
      albums: [],
      artists: []
    };
  }
}

/**
 * Simple Spotify-only search (backward compatibility)
 */
export async function simpleSpotifySearch(query: string, limit: number = 20): Promise<SearchResults> {
  const comprehensive = await comprehensiveSpotifySearch(query, limit);
  return {
    results: comprehensive.tracks
  };
}