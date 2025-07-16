import axios from 'axios';
import { db } from '../server/db';
import { songs } from '../shared/schema';
import { eq } from 'drizzle-orm';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'spotify-scraper.p.rapidapi.com';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    name: string;
  }>;
}

interface SpotifySearchResponse {
  status: boolean;
  tracks: {
    items: SpotifyTrack[];
  };
}

interface LyricsLine {
  startMs: number;
  durMs: number;
  text: string;
}

interface LyricsResponse {
  status?: boolean;
  lyrics?: LyricsLine[];
  error?: string;
}

async function searchSpotifyTrack(title: string, artist: string): Promise<string | null> {
  try {
    const searchTerm = `${title} ${artist}`.toLowerCase();
    console.log(`Searching for: ${searchTerm}`);
    
    const options = {
      method: 'GET',
      url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
      params: {
        term: searchTerm,
        type: 'track'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const response = await axios.request<SpotifySearchResponse>(options);
    
    if (response.data.status && response.data.tracks.items.length > 0) {
      // Find the best match by comparing title and artist
      for (const track of response.data.tracks.items) {
        const trackTitle = track.name.toLowerCase();
        const trackArtist = track.artists[0]?.name.toLowerCase() || '';
        
        // Check if this is a good match
        if (trackTitle.includes(title.toLowerCase()) && 
            trackArtist.includes(artist.toLowerCase())) {
          console.log(`Found match: ${track.name} by ${track.artists[0]?.name} (ID: ${track.id})`);
          return track.id;
        }
      }
      
      // If no exact match, return the first result
      const firstTrack = response.data.tracks.items[0];
      console.log(`Using first result: ${firstTrack.name} by ${firstTrack.artists[0]?.name} (ID: ${firstTrack.id})`);
      return firstTrack.id;
    }
    
    console.log('No tracks found in search results');
    return null;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}

async function fetchTrackLyrics(trackId: string): Promise<LyricsLine[] | null> {
  try {
    console.log(`Fetching lyrics for track ID: ${trackId}`);
    
    const options = {
      method: 'GET',
      url: 'https://spotify-scraper.p.rapidapi.com/v1/track/lyrics',
      params: {
        trackId: trackId,
        format: 'json'
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const response = await axios.request<LyricsLine[]>(options);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log(`Found ${response.data.length} lyrics lines`);
      return response.data;
    }
    
    console.log('No lyrics found for this track');
    return null;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}

function convertSpotifyLyricsToOurFormat(spotifyLyrics: LyricsLine[]): Array<{text: string, timestamp: number, translation: string}> {
  return spotifyLyrics.map((line, index) => ({
    text: line.text,
    timestamp: Math.floor(line.startMs / 1000), // Convert milliseconds to seconds
    translation: `Translation for: ${line.text}` // Placeholder - would need AI translation
  }));
}

async function updateSongLyrics(songId: number, lyrics: Array<{text: string, timestamp: number, translation: string}>) {
  try {
    await db
      .update(songs)
      .set({ lyrics: JSON.stringify(lyrics) })
      .where(eq(songs.id, songId));
    
    console.log(`Updated lyrics for song ID: ${songId}`);
  } catch (error) {
    console.error('Error updating song lyrics:', error);
  }
}

async function processSong(song: any) {
  console.log(`\n--- Processing: ${song.title} by ${song.artist} ---`);
  
  // Check if song already has detailed lyrics (more than our basic samples)
  const currentLyrics = Array.isArray(song.lyrics) ? song.lyrics : JSON.parse(song.lyrics || '[]');
  if (currentLyrics.length > 10) {
    console.log('Song already has detailed lyrics, skipping...');
    return;
  }
  
  // Search for the track on Spotify
  const spotifyTrackId = await searchSpotifyTrack(song.title, song.artist);
  if (!spotifyTrackId) {
    console.log('Could not find track on Spotify');
    return;
  }
  
  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Fetch lyrics
  const spotifyLyrics = await fetchTrackLyrics(spotifyTrackId);
  if (!spotifyLyrics) {
    console.log('Could not fetch lyrics for this track');
    return;
  }
  
  // Convert to our format
  const ourLyrics = convertSpotifyLyricsToOurFormat(spotifyLyrics);
  
  // Update the database
  await updateSongLyrics(song.id, ourLyrics);
  
  console.log(`Successfully updated lyrics for: ${song.title}`);
}

async function main() {
  try {
    // Check if a specific song ID was provided as command line argument
    const targetSongId = process.argv[2] ? parseInt(process.argv[2]) : null;
    
    if (targetSongId) {
      console.log(`Fetching lyrics for song ID: ${targetSongId}\n`);
      
      // Get specific song
      const [song] = await db.select().from(songs).where(eq(songs.id, targetSongId));
      
      if (!song) {
        console.log(`Song with ID ${targetSongId} not found`);
        return;
      }
      
      await processSong(song);
    } else {
      console.log('Starting lyrics fetching process for all songs...\n');
      
      // Get all songs from database
      const allSongs = await db.select().from(songs);
      console.log(`Found ${allSongs.length} songs in database`);
      
      for (const song of allSongs) {
        await processSong(song);
        
        // Add delay between songs to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n--- Lyrics fetching completed! ---');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the script
main().catch(console.error);