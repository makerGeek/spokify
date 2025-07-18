import axios from 'axios';
import { translateLyrics, assessLyricsDifficulty } from '../server/services/gemini.js';
import { db } from '../server/db.js';
import { songs } from '../shared/schema.js';
import { eq, and, or } from 'drizzle-orm';

interface TrackInfo {
  spotifyId: string | null;
  youtubeId: string | null;
  title: string;
  artist: string;
  lyrics: any[] | null;
}

interface LyricsLine {
  startMs: number;
  durMs: number;
  text: string;
}

async function checkSongExists(title: string, artist: string, spotifyId?: string): Promise<boolean> {
  try {
    const conditions = [
      and(eq(songs.title, title), eq(songs.artist, artist))
    ];
    
    // Also check by Spotify ID if provided
    if (spotifyId) {
      conditions.push(eq(songs.spotifyId, spotifyId));
    }
    
    const existingSong = await db.select().from(songs).where(or(...conditions)).limit(1);
    return existingSong.length > 0;
  } catch (error) {
    console.error('Error checking if song exists:', error);
    return false;
  }
}

async function findSpotifyTrackId(songName: string): Promise<{ spotifyId: string; title: string; artist: string } | null> {
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
      
      console.log(`Found Spotify track: ${title} by ${artist}`);
      console.log(`Spotify ID: ${spotifyId}`);
      
      return { spotifyId, title, artist };
    } else {
      console.log(`No Spotify tracks found for: ${songName}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}

async function findYouTubeVideoId(searchQuery: string): Promise<string | null> {
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
        const title = firstVideo.video.title;
        const channel = firstVideo.video.author?.title;
        
        console.log(`Found YouTube video: ${title} by ${channel}`);
        console.log(`YouTube ID: ${youtubeId}`);
        
        return youtubeId;
      } else {
        console.log(`No YouTube videos found for: ${searchQuery}`);
        return null;
      }
    } else {
      console.log(`No YouTube results found for: ${searchQuery}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

async function fetchSpotifyLyrics(trackId: string): Promise<LyricsLine[] | null> {
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
      console.log(`Found ${lyrics.length} lyric lines`);
      console.log('Lyrics preview:');
      console.log(JSON.stringify(lyrics.slice(0, 3), null, 2)); // Show first 3 lines as preview
      
      return lyrics;
    } else {
      console.log('No lyrics found for this track');
      return null;
    }
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}

async function saveSongToDatabase(songData: {
  title: string;
  artist: string;
  spotifyId: string;
  youtubeId: string | null;
  lyrics: LyricsLine[];
  translatedLyrics: any[] | null;
  difficultyResult: any | null;
}) {
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
      albumCover: null,
      audioUrl: songData.youtubeId || null,
      duration: 0, // Could be calculated from lyrics
      lyrics: formattedLyrics,
      spotifyId: songData.spotifyId,
      youtubeId: songData.youtubeId,
      keyWords: songData.difficultyResult?.key_words || null
    };

    const [savedSong] = await db.insert(songs).values(songRecord).returning();
    console.log(`\n✓ Song saved to database with ID: ${savedSong.id}`);
    return savedSong;
  } catch (error) {
    console.error('Failed to save song to database:', error);
    throw error;
  }
}

// Main function to run the script
async function main() {
  const songName = process.argv[2];
  
  if (!songName) {
    console.log('Usage: npx tsx scripts/import_song.ts "Song Name"');
    console.log('Example: npx tsx scripts/import_song.ts "Despacito"');
    process.exit(1);
  }
  
  console.log(`Searching for: "${songName}"\n`);
  
  // Search Spotify first
  const spotifyResult = await findSpotifyTrackId(songName);
  
  if (!spotifyResult) {
    console.log('No Spotify track found, skipping YouTube search');
    process.exit(1);
  }

  // Check if song already exists in database
  console.log(`\nChecking if song already exists in database...`);
  const songExists = await checkSongExists(spotifyResult.title, spotifyResult.artist, spotifyResult.spotifyId);
  
  if (songExists) {
    console.log(`✓ Song "${spotifyResult.title}" by ${spotifyResult.artist} already exists in database`);
    console.log('Skipping import to avoid duplicates');
    process.exit(0);
  }
  
  console.log(`✓ Song not found in database, proceeding with import...`);
  
  // Use Spotify track info for YouTube search to get better results
  const youtubeSearchQuery = `${spotifyResult.title} ${spotifyResult.artist}`;
  console.log(`\nSearching YouTube for: "${youtubeSearchQuery}"`);
  
  const youtubeId = await findYouTubeVideoId(youtubeSearchQuery);
  
  // Fetch lyrics using Spotify track ID
  console.log(`\nFetching lyrics for Spotify track: ${spotifyResult.spotifyId}`);
  const lyrics = await fetchSpotifyLyrics(spotifyResult.spotifyId);
  
  let translatedLyrics = null;
  let difficultyResult = null;
  
  if (lyrics && lyrics.length > 0) {
    // Convert lyrics to string format for translation
    const lyricsString = JSON.stringify(lyrics);
    try {
      translatedLyrics = await translateLyrics(lyricsString, "English");
      console.log(`\nTranslation complete: ${translatedLyrics.length} lines translated`);
      console.log('Translation preview:');
      console.log(JSON.stringify(translatedLyrics.slice(0, 3), null, 2));
    } catch (error) {
      console.error('Failed to translate lyrics:', error);
    }

    try {
      difficultyResult = await assessLyricsDifficulty(lyrics, spotifyResult.title, spotifyResult.artist);
      console.log(`\nDifficulty assessment: ${difficultyResult.difficulty} level`);
      console.log(`Language detected: ${difficultyResult.language || 'unknown'}`);
      console.log(`Genre detected: ${difficultyResult.genre || 'unknown'}`);
      console.log(`Key words found: ${Object.keys(difficultyResult.key_words).length} words`);
    } catch (error) {
      console.error('Failed to assess difficulty:', error);
    }
  }
  
  // Save to database if we have all the required data
  if (lyrics && lyrics.length > 0) {
    console.log(`\n=== SAVING TO DATABASE ===`);
    try {
      await saveSongToDatabase({
        title: spotifyResult.title,
        artist: spotifyResult.artist,
        spotifyId: spotifyResult.spotifyId,
        youtubeId,
        lyrics,
        translatedLyrics,
        difficultyResult
      });
    } catch (error) {
      console.error('Failed to save to database:', error);
    }
  }
  
  // Display final results
  console.log('\n=== RESULTS ===');
  console.log(`Song: ${spotifyResult.title}`);
  console.log(`Artist: ${spotifyResult.artist}`);
  console.log(`Spotify ID: ${spotifyResult.spotifyId}`);
  console.log(`YouTube ID: ${youtubeId || 'Not found'}`);
  console.log(`Lyrics Found: ${lyrics ? 'Yes (' + lyrics.length + ' lines)' : 'No'}`);
  console.log(`Translated Lyrics: ${translatedLyrics ? 'Yes (' + translatedLyrics.length + ' lines)' : 'No'}`);
  console.log(`Language Detected: ${difficultyResult?.language || 'Not detected'}`);
  console.log(`Genre Detected: ${difficultyResult?.genre || 'Not detected'}`);
  console.log(`Difficulty Level: ${difficultyResult ? difficultyResult.difficulty : 'Not assessed'}`);
  console.log(`Key Words: ${difficultyResult ? Object.keys(difficultyResult.key_words).length : 0} found`);
  
  if (!youtubeId) {
    console.log('\nWarning: No YouTube video found');
  }
  
  if (!lyrics) {
    console.log('Warning: No lyrics found');
  } else {
    console.log('\n=== ORIGINAL LYRICS SAMPLE ===');
    console.log('First 3 lines:');
    console.log(JSON.stringify(lyrics.slice(0, 3), null, 2));
  }
  
  if (difficultyResult && Object.keys(difficultyResult.key_words).length > 0) {
    console.log('\n=== DIFFICULTY ASSESSMENT ===');
    console.log(`CEFR Level: ${difficultyResult.difficulty}`);
    console.log(`Genre: ${difficultyResult.genre}`);
    console.log(`Language: ${difficultyResult.language}`);
    console.log('Key vocabulary sample:');
    const keyWordsSample = Object.entries(difficultyResult.key_words).slice(0, 5);
    keyWordsSample.forEach(([word, translation]) => {
      console.log(`  ${word} → ${translation}`);
    });
  }
  
  if (translatedLyrics && translatedLyrics.length > 0) {
    console.log('\n=== TRANSLATED LYRICS SAMPLE ===');
    console.log('First 5 lines with translations:');
    console.log(JSON.stringify(translatedLyrics.slice(0, 5), null, 2));
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { findSpotifyTrackId, findYouTubeVideoId, fetchSpotifyLyrics, translateLyrics };