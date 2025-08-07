import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { translateLyrics, assessLyricsDifficulty } from './gemini.js';
import { db } from '../db.js';
import { songs } from '../../shared/schema.js';
import { eq, and, or } from 'drizzle-orm';

// Initialize S3-compatible client
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT, // e.g., 'https://s3.example.com'
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true // Required for some S3-compatible services
});

export interface LyricsLine {
  startMs: number;
  durMs: number;
  text: string;
}

export interface SpotifyTrackResult {
  spotifyId: string;
  title: string;
  artist: string;
  albumCover: string | null;
}

export interface SoundCloudTrackResult {
  audioUrl: string;
  duration: number;
}

export interface SongImportData {
  title: string;
  artist: string;
  spotifyId: string;
  youtubeId: string | null;
  lyrics: LyricsLine[];
  translatedLyrics: any[] | null;
  difficultyResult: any | null;
  soundcloudData: SoundCloudTrackResult | null;
  s3AudioUrl: string | null;
  albumCover: string | null;
}

export async function checkSongExists(title: string, artist: string, spotifyId?: string, youtubeId?: string): Promise<boolean> {
  try {
    const conditions = [
      and(eq(songs.title, title), eq(songs.artist, artist))
    ];
    
    // Also check by Spotify ID if provided
    if (spotifyId) {
      conditions.push(eq(songs.spotifyId, spotifyId));
    }
    
    // Also check by YouTube ID if provided
    if (youtubeId) {
      conditions.push(eq(songs.youtubeId, youtubeId));
    }
    
    const existingSong = await db.select().from(songs).where(or(...conditions)).limit(1);
    return existingSong.length > 0;
  } catch (error) {
    console.error('Error checking if song exists:', error);
    return false;
  }
}

export async function findSpotifyTrackId(songName: string): Promise<SpotifyTrackResult | null> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
    params: {
      term: songName,
      type: 'track'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const tracks = response.data?.tracks?.items;
    
    if (tracks && tracks.length > 0) {
      const firstTrack = tracks[0];
      const spotifyId = firstTrack.id;
      const title = firstTrack.name;
      const artist = firstTrack.artists?.[0]?.name || 'Unknown Artist';
      
      // Extract album cover - prefer 640x640, fallback to 300x300, then 64x64
      let albumCover = null;
      if (firstTrack.album?.cover && firstTrack.album.cover.length > 0) {
        const covers = firstTrack.album.cover;
        const largeCover = covers.find((cover: any) => cover.width === 640);
        const mediumCover = covers.find((cover: any) => cover.width === 300);
        const smallCover = covers.find((cover: any) => cover.width === 64);
        
        albumCover = largeCover?.url || mediumCover?.url || smallCover?.url || null;
      }
      
      return { spotifyId, title, artist, albumCover };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}

export async function findYouTubeVideoId(searchQuery: string): Promise<string | null> {
  const options = {
    method: 'GET',
    url: 'https://youtube138.p.rapidapi.com/search/',
    params: {
      q: searchQuery,
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
    const contents = response.data?.contents;
    
    if (contents && contents.length > 0) {
      // Find the first video in the results
      const firstVideo = contents.find((item: any) => item.type === 'video');
      
      if (firstVideo && firstVideo.video) {
        const youtubeId = firstVideo.video.videoId;
        return youtubeId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

export async function fetchSpotifyLyrics(trackId: string): Promise<LyricsLine[] | null> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/track/lyrics',
    params: {
      trackId: trackId,
      format: 'json'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const lyrics = response.data;
    
    if (lyrics && Array.isArray(lyrics) && lyrics.length > 0) {
      return lyrics;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}

export async function fetchSoundCloudTrack(title: string, artist: string): Promise<SoundCloudTrackResult | null> {
  const searchTerm = `${title} ${artist}`;
  
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/track/download/soundcloud',
    params: {
      track: searchTerm,
      quality: 'sq'
    },
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const data = response.data;
    
    if (data?.status && data?.soundcloudTrack?.audio) {
      const audio = data.soundcloudTrack.audio;
      
      // Find the SQ MP3 audio
      const mp3Audio = audio.find((item: any) => 
        item.quality === 'sq' && 
        item.format === 'mp3' && 
        item.mimeType === 'audio/mpeg'
      );
      
      if (mp3Audio) {
        return {
          audioUrl: mp3Audio.url,
          duration: Math.round(mp3Audio.durationMs / 1000) // Convert to seconds
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching SoundCloud track:', error);
    return null;
  }
}

export async function uploadAudioToS3(audioUrl: string, title: string, artist: string, maxRetries: number = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait a bit between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Download the audio file with proper headers and follow redirects
      const response = await axios({
        method: 'GET',
        url: audioUrl,
        responseType: 'arraybuffer', // Use arraybuffer instead of stream for better reliability
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'audio/mpeg, audio/*, */*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 60000, // 60 second timeout
        maxRedirects: 5 // Follow up to 5 redirects
      });
      
      // Verify we got actual audio data
      if (response.data.byteLength < 1000) {
        if (attempt < maxRetries) {
          continue; // Retry
        } else {
          return null;
        }
      }

      const audioBuffer = Buffer.from(response.data);
      
      // Check if it's actually an MP3 file by looking at the header
      const header = audioBuffer.subarray(0, 3);
      const isMP3 = (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) || // MP3 frame header
                    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33); // ID3 tag
      
      if (!isMP3) {
        if (attempt < maxRetries) {
          continue; // Retry
        } else {
          return null;
        }
      }

      // Generate a unique filename
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const sanitizedArtist = artist.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const timestamp = Date.now();
      const fileName = `audio/${sanitizedArtist}/${sanitizedTitle}_${timestamp}.mp3`;

      // Upload to S3-compatible storage
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || '',
        Key: fileName,
        Body: audioBuffer,
        ContentType: 'audio/mpeg',
        ContentDisposition: `attachment; filename="${sanitizedTitle}.mp3"`
      });

      await s3Client.send(command);

      // Generate the public URL based on endpoint configuration
      const endpoint = process.env.S3_ENDPOINT || '';
      const bucket = process.env.S3_BUCKET || '';
      
      // Remove protocol from endpoint for URL construction
      const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
      const s3Url = `https://${cleanEndpoint}/${bucket}/${fileName}`;
      
      return s3Url;

    } catch (error) {
      if (attempt < maxRetries) {
        continue; // Retry
      } else {
        console.error('Error uploading audio to S3:', error);
        return null;
      }
    }
  }
  
  return null;
}

export async function saveSongToDatabase(songData: SongImportData) {
  try {
    // Convert lyrics with translations to the format expected by the database
    const formattedLyrics = songData.translatedLyrics || songData.lyrics.map(line => ({
      text: line.text,
      timestamp: Math.round(line.startMs / 1000), // Convert to seconds
      translation: line.text // Default to original text if no translation
    }));

    // Use AI-detected genre and language
    const genre = songData.difficultyResult?.genre || "Pop"; // Use AI-detected genre or default to Pop
    const language = songData.difficultyResult?.language || "en"; // Use detected language or default to English
    
    const songRecord = {
      title: songData.title,
      artist: songData.artist,
      genre,
      language,
      difficulty: songData.difficultyResult?.difficulty || "A1",
      rating: 0,
      albumCover: songData.albumCover || null,
      audioUrl: songData.s3AudioUrl || null, // S3 bucket URL
      sdcldAudioUrl: songData.soundcloudData?.audioUrl || null, // Original SoundCloud URL
      duration: songData.soundcloudData?.duration || 0,
      lyrics: formattedLyrics,
      spotifyId: songData.spotifyId,
      youtubeId: songData.youtubeId,
      keyWords: songData.difficultyResult?.key_words || null
    };

    const [savedSong] = await db.insert(songs).values(songRecord).returning();
    return savedSong;
  } catch (error) {
    console.error('Failed to save song to database:', error);
    throw error;
  }
}

export async function importSpotifySong(spotifyData: {
  spotifyId: string;
  title: string;
  artist: string;
  albumCover: string | null;
}): Promise<{
  success: boolean;
  song?: any;
  error?: string;
  warnings?: string[];
}> {
  const warnings: string[] = [];
  
  try {
    // Check if song already exists in database
    const songExists = await checkSongExists(spotifyData.title, spotifyData.artist, spotifyData.spotifyId);
    
    if (songExists) {
      return { success: false, error: 'Song already exists in database' };
    }
    
    // Fetch lyrics using Spotify track ID
    const lyrics = await fetchSpotifyLyrics(spotifyData.spotifyId);
    
    if (!lyrics || lyrics.length === 0) {
      return { success: false, error: 'No lyrics found for this track' };
    }
    
    // Search YouTube for this specific song
    const youtubeSearchQuery = `${spotifyData.title} ${spotifyData.artist}`;
    console.log(`🔍 Searching YouTube for: "${youtubeSearchQuery}"`);
    
    // Import YouTube search function
    const { searchYouTube } = await import('./search-service.js');
    const youtubeVideos = await searchYouTube(youtubeSearchQuery, 15);
    
    if (youtubeVideos.length === 0) {
      warnings.push('No YouTube videos found');
    }
    
    // Use matching service to find best YouTube match
    let bestYouTubeId = null;
    if (youtubeVideos.length > 0) {
      // Convert Spotify data to the format expected by matching service
      const spotifyTrack = {
        id: spotifyData.spotifyId,
        title: spotifyData.title,
        artist: spotifyData.artist,
        album: '', // Not needed for matching
        duration: 0, // We'll get this from lyrics timing if needed
        type: 'spotify' as const,
        durationText: '',
        albumCover: spotifyData.albumCover,
        explicit: false,
        shareUrl: '',
        artists: []
      };
      
      // Import matching service
      const { findBestMatches } = await import('./matching-service.js');
      const matches = findBestMatches([spotifyTrack], youtubeVideos);
      
      if (matches.length > 0) {
        bestYouTubeId = matches[0].youtubeId!;
        console.log(`✅ Found YouTube match: ${matches[0].youtubeId} (confidence: ${matches[0].confidence.toFixed(1)}%)`);
      } else {
        warnings.push('No good YouTube match found');
      }
    }
    
    // Fetch SoundCloud audio URL and duration
    const soundcloudData = await fetchSoundCloudTrack(spotifyData.title, spotifyData.artist);
    
    if (!soundcloudData) {
      warnings.push('No SoundCloud audio found');
    }
    
    // Upload audio to S3 if SoundCloud data is available
    let s3AudioUrl = null;
    if (soundcloudData) {
      s3AudioUrl = await uploadAudioToS3(soundcloudData.audioUrl, spotifyData.title, spotifyData.artist);
      if (!s3AudioUrl) {
        warnings.push('SoundCloud audio found but S3 upload failed');
      }
    }
    
    let translatedLyrics = null;
    let difficultyResult = null;
    
    // Convert lyrics to string format for translation
    const lyricsString = JSON.stringify(lyrics);
    try {
      translatedLyrics = await translateLyrics(lyricsString, "English");
    } catch (error) {
      warnings.push('Failed to translate lyrics');
      console.error('Translation error:', error);
    }

    try {
      difficultyResult = await assessLyricsDifficulty(lyrics, spotifyData.title, spotifyData.artist);
    } catch (error) {
      warnings.push('Failed to assess difficulty');
      console.error('Difficulty assessment error:', error);
    }
    
    // Save to database
    const savedSong = await saveSongToDatabase({
      title: spotifyData.title,
      artist: spotifyData.artist,
      spotifyId: spotifyData.spotifyId,
      youtubeId: bestYouTubeId,
      lyrics,
      translatedLyrics,
      difficultyResult,
      soundcloudData,
      s3AudioUrl,
      albumCover: spotifyData.albumCover
    });
    
    return {
      success: true,
      song: savedSong,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error) {
    console.error('Song import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function importSong(songName: string): Promise<{
  success: boolean;
  song?: any;
  error?: string;
  warnings?: string[];
}> {
  const warnings: string[] = [];
  
  try {
    // Search Spotify first
    const spotifyResult = await findSpotifyTrackId(songName);
    
    if (!spotifyResult) {
      return { success: false, error: 'No Spotify track found' };
    }

    // Check if song already exists in database
    const songExists = await checkSongExists(spotifyResult.title, spotifyResult.artist, spotifyResult.spotifyId);
    
    if (songExists) {
      return { success: false, error: 'Song already exists in database' };
    }
    
    // Use Spotify track info for YouTube search to get better results
    const youtubeSearchQuery = `${spotifyResult.title} ${spotifyResult.artist} lyrics`;
    const youtubeId = await findYouTubeVideoId(youtubeSearchQuery);

    if (!youtubeId) {
      warnings.push('No YouTube video found');
    }

    // Check again if song exists with YouTube ID
    if (youtubeId) {
      const songExistsWithYouTube = await checkSongExists(spotifyResult.title, spotifyResult.artist, spotifyResult.spotifyId, youtubeId);
      
      if (songExistsWithYouTube) {
        return { success: false, error: 'Song already exists in database with YouTube ID' };
      }
    }
    
    // Fetch lyrics using Spotify track ID
    const lyrics = await fetchSpotifyLyrics(spotifyResult.spotifyId);
    
    if (!lyrics || lyrics.length === 0) {
      return { success: false, error: 'No lyrics found for this track' };
    }
    
    // Fetch SoundCloud audio URL and duration
    const soundcloudData = await fetchSoundCloudTrack(spotifyResult.title, spotifyResult.artist);
    
    if (!soundcloudData) {
      warnings.push('No SoundCloud audio found');
    }
    
    // Upload audio to S3 if SoundCloud data is available
    let s3AudioUrl = null;
    if (soundcloudData) {
      s3AudioUrl = await uploadAudioToS3(soundcloudData.audioUrl, spotifyResult.title, spotifyResult.artist);
      if (!s3AudioUrl) {
        warnings.push('SoundCloud audio found but S3 upload failed');
      }
    }
    
    let translatedLyrics = null;
    let difficultyResult = null;
    
    // Convert lyrics to string format for translation
    const lyricsString = JSON.stringify(lyrics);
    try {
      translatedLyrics = await translateLyrics(lyricsString, "English");
    } catch (error) {
      warnings.push('Failed to translate lyrics');
      console.error('Translation error:', error);
    }

    try {
      difficultyResult = await assessLyricsDifficulty(lyrics, spotifyResult.title, spotifyResult.artist);
    } catch (error) {
      warnings.push('Failed to assess difficulty');
      console.error('Difficulty assessment error:', error);
    }
    
    // Save to database
    const savedSong = await saveSongToDatabase({
      title: spotifyResult.title,
      artist: spotifyResult.artist,
      spotifyId: spotifyResult.spotifyId,
      youtubeId,
      lyrics,
      translatedLyrics,
      difficultyResult,
      soundcloudData,
      s3AudioUrl,
      albumCover: spotifyResult.albumCover
    });
    
    return {
      success: true,
      song: savedSong,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error) {
    console.error('Song import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}