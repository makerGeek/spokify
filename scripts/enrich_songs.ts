// Load environment variables from .env file FIRST, before any other imports
import 'dotenv/config';

import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../server/db.js';
import { songs } from '../shared/schema.js';
import { isNull, or, eq } from 'drizzle-orm';

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

interface SongToEnrich {
  id: number;
  title: string;
  artist: string;
  audioUrl: string | null;
  sdcldAudioUrl: string | null;
  duration: number;
  albumCover: string | null;
  spotifyId: string | null;
}

async function fetchSoundCloudTrack(title: string, artist: string): Promise<{ audioUrl: string; duration: number } | null> {
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
    console.log(`Searching SoundCloud for: "${searchTerm}"`);
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
        console.log(`✓ Found SoundCloud MP3: ${data.soundcloudTrack.title}`);
        console.log(`  Duration: ${mp3Audio.durationText} (${mp3Audio.durationMs}ms)`);
        console.log(`  URL: ${mp3Audio.url.substring(0, 50)}...`);
        
        return {
          audioUrl: mp3Audio.url,
          duration: Math.round(mp3Audio.durationMs / 1000) // Convert to seconds
        };
      } else {
        console.log('No SQ MP3 audio found in SoundCloud response');
        return null;
      }
    } else {
      console.log('No SoundCloud track found or invalid response');
      return null;
    }
  } catch (error) {
    console.error('Error fetching SoundCloud track:', error);
    return null;
  }
}

async function uploadAudioToS3(audioUrl: string, title: string, artist: string, maxRetries: number = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries} for audio download...`);
        // Wait a bit between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`Downloading audio from: ${audioUrl.substring(0, 50)}...`);
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

      console.log(`Downloaded ${response.data.byteLength} bytes`);
      
      // Verify we got actual audio data
      if (response.data.byteLength < 1000) {
        const errorMsg = `Downloaded file too small (${response.data.byteLength} bytes), likely not a valid MP3`;
        if (attempt < maxRetries) {
          console.error(`${errorMsg} - will retry...`);
          continue; // Retry
        } else {
          console.error(`${errorMsg} - no more retries left`);
          return null;
        }
      }

      const audioBuffer = Buffer.from(response.data);
      
      // Check if it's actually an MP3 file by looking at the header
      const header = audioBuffer.subarray(0, 3);
      const isMP3 = (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) || // MP3 frame header
                    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33); // ID3 tag
      
      if (!isMP3) {
        const errorMsg = 'Downloaded file does not appear to be a valid MP3';
        console.log('First 10 bytes:', audioBuffer.subarray(0, 10));
        if (attempt < maxRetries) {
          console.error(`${errorMsg} - will retry...`);
          continue; // Retry
        } else {
          console.error(`${errorMsg} - no more retries left`);
          return null;
        }
      }

      // Generate a unique filename
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const sanitizedArtist = artist.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const timestamp = Date.now();
      const fileName = `audio/${sanitizedArtist}/${sanitizedTitle}_${timestamp}.mp3`;

      console.log(`Uploading ${audioBuffer.length} bytes to S3: ${fileName}`);

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
      
      console.log(`✓ Audio uploaded to S3-compatible storage: ${s3Url}`);
      return s3Url;

    } catch (error) {
      const errorMsg = `Error downloading/uploading audio (attempt ${attempt + 1}/${maxRetries + 1}): ${error}`;
      if (attempt < maxRetries) {
        console.error(`${errorMsg} - will retry...`);
        continue; // Retry
      } else {
        console.error(`${errorMsg} - no more retries left`);
        return null;
      }
    }
  }
  
  // This should never be reached due to the logic above, but just in case
  return null;
}

async function findSpotifyAlbumCover(title: string, artist: string): Promise<string | null> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
    params: {
      term: `${title} ${artist}`,
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
      
      // Extract album cover - prefer 640x640, fallback to 300x300, then 64x64
      if (firstTrack.album?.cover && firstTrack.album.cover.length > 0) {
        const covers = firstTrack.album.cover;
        const largeCover = covers.find((cover: any) => cover.width === 640);
        const mediumCover = covers.find((cover: any) => cover.width === 300);
        const smallCover = covers.find((cover: any) => cover.width === 64);
        
        return largeCover?.url || mediumCover?.url || smallCover?.url || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching Spotify for album cover:', error);
    return null;
  }
}

async function enrichSong(song: SongToEnrich): Promise<void> {
  console.log(`\n=== ENRICHING: ${song.title} by ${song.artist} ===`);
  console.log(`Current state:`);
  console.log(`  - audioUrl: ${song.audioUrl ? 'Present' : 'Missing'}`);
  console.log(`  - sdcldAudioUrl: ${song.sdcldAudioUrl ? 'Present' : 'Missing'}`);
  console.log(`  - duration: ${song.duration || 'Missing'}`);
  console.log(`  - albumCover: ${song.albumCover ? 'Present' : 'Missing'}`);

  let needsUpdate = false;
  let updateData: any = {};

  // Check if we need SoundCloud data
  if (!song.sdcldAudioUrl || !song.duration) {
    console.log(`Fetching SoundCloud data...`);
    const soundcloudData = await fetchSoundCloudTrack(song.title, song.artist);
    
    if (soundcloudData) {
      if (!song.sdcldAudioUrl) {
        updateData.sdcldAudioUrl = soundcloudData.audioUrl;
        needsUpdate = true;
        console.log(`✓ Added SoundCloud URL`);
      }
      if (!song.duration) {
        updateData.duration = soundcloudData.duration;
        needsUpdate = true;
        console.log(`✓ Added duration: ${soundcloudData.duration}s`);
      }

      // Check if we need S3 upload
      if (!song.audioUrl) {
        console.log(`Uploading to S3...`);
        const s3Url = await uploadAudioToS3(soundcloudData.audioUrl, song.title, song.artist);
        if (s3Url) {
          updateData.audioUrl = s3Url;
          needsUpdate = true;
          console.log(`✓ Added S3 audio URL`);
        } else {
          console.log(`✗ Failed to upload to S3`);
        }
      }
    } else {
      console.log(`✗ Could not find SoundCloud track`);
    }
  } else {
    console.log(`Song already has SoundCloud data`);
    
    // Even if we have SoundCloud data, check if we need S3 upload
    if (!song.audioUrl && song.sdcldAudioUrl) {
      console.log(`Uploading existing SoundCloud URL to S3...`);
      const s3Url = await uploadAudioToS3(song.sdcldAudioUrl, song.title, song.artist);
      if (s3Url) {
        updateData.audioUrl = s3Url;
        needsUpdate = true;
        console.log(`✓ Added S3 audio URL from existing SoundCloud data`);
      } else {
        console.log(`✗ Failed to upload existing SoundCloud URL to S3`);
      }
    }
  }

  // Check if we need album cover
  if (!song.albumCover) {
    console.log(`Fetching album cover from Spotify...`);
    const albumCover = await findSpotifyAlbumCover(song.title, song.artist);
    
    if (albumCover) {
      updateData.albumCover = albumCover;
      needsUpdate = true;
      console.log(`✓ Added album cover`);
    } else {
      console.log(`✗ Could not find album cover`);
    }
  } else {
    console.log(`Song already has album cover`);
  }

  // Update database if needed
  if (needsUpdate) {
    try {
      await db.update(songs)
        .set(updateData)
        .where(eq(songs.id, song.id));
      
      console.log(`✓ Updated database for song ID ${song.id}`);
      console.log(`Updated fields:`, Object.keys(updateData).join(', '));
    } catch (error) {
      console.error(`✗ Failed to update database:`, error);
    }
  } else {
    console.log(`No updates needed for this song`);
  }
}

async function getSongsToEnrich(limit?: number): Promise<SongToEnrich[]> {
  console.log('Fetching songs that need enrichment...');
  
  let query = db.select({
    id: songs.id,
    title: songs.title,
    artist: songs.artist,
    audioUrl: songs.audioUrl,
    sdcldAudioUrl: songs.sdcldAudioUrl,
    duration: songs.duration,
    albumCover: songs.albumCover,
    spotifyId: songs.spotifyId
  })
  .from(songs)
  .where(
    or(
      isNull(songs.audioUrl),
      isNull(songs.sdcldAudioUrl),
      eq(songs.duration, 0),
      isNull(songs.albumCover)
    )
  );

  if (limit) {
    query = query.limit(limit);
  }

  const songsToEnrich = await query;
  
  console.log(`Found ${songsToEnrich.length} songs that need enrichment`);
  return songsToEnrich;
}

// Main function to run the script
async function main() {
  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;
  
  if (limitArg && isNaN(limit!)) {
    console.log('Usage: npx tsx scripts/enrich_songs.ts [limit]');
    console.log('Example: npx tsx scripts/enrich_songs.ts 10  # Process only 10 songs');
    console.log('Example: npx tsx scripts/enrich_songs.ts     # Process all songs');
    process.exit(1);
  }
  
  console.log(`\n=== SONG ENRICHMENT SCRIPT ===`);
  if (limit) {
    console.log(`Processing up to ${limit} songs...`);
  } else {
    console.log(`Processing all songs that need enrichment...`);
  }
  
  try {
    const songsToEnrich = await getSongsToEnrich(limit);
    
    if (songsToEnrich.length === 0) {
      console.log('\n✓ No songs found that need enrichment. All songs are up to date!');
      process.exit(0);
    }
    
    console.log(`\nStarting enrichment process for ${songsToEnrich.length} songs...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < songsToEnrich.length; i++) {
      const song = songsToEnrich[i];
      console.log(`\n[${i + 1}/${songsToEnrich.length}]`);
      
      try {
        await enrichSong(song);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to enrich song "${song.title}" by ${song.artist}:`, error);
        errorCount++;
      }
      
      // Add a small delay between requests to be nice to APIs
      if (i < songsToEnrich.length - 1) {
        console.log('Waiting 2 seconds before next song...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n=== ENRICHMENT COMPLETE ===`);
    console.log(`Successfully processed: ${successCount} songs`);
    console.log(`Failed to process: ${errorCount} songs`);
    console.log(`Total processed: ${successCount + errorCount} songs`);
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
  
  // Force exit to close database connection pool
  process.exit(0);
}

// Run the script if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const currentFile = resolve(process.argv[1]);

if (__filename === currentFile) {
  main().catch(console.error);
}

export { enrichSong, getSongsToEnrich };