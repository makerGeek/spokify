import axios from 'axios';
import { db } from '../server/db';
import { songs } from '../shared/schema';
import { eq } from 'drizzle-orm';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// Process just a few specific songs to avoid rate limits
const TARGET_SONGS = [
  { id: 3, title: "La Vie en Rose", artist: "Édith Piaf" },
  { id: 4, title: "Alors on Danse", artist: "Stromae" },
  { id: 9, title: "Shape of You", artist: "Ed Sheeran" }
];

async function searchAndFetchLyrics(title: string, artist: string) {
  try {
    // Search for track
    console.log(`Searching for: ${title} by ${artist}`);
    const searchResponse = await axios.get('https://spotify-scraper.p.rapidapi.com/v1/search', {
      params: { term: `${title} ${artist}`, type: 'track' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
      }
    });

    if (!searchResponse.data.status || !searchResponse.data.tracks.items.length) {
      console.log('No tracks found');
      return null;
    }

    const trackId = searchResponse.data.tracks.items[0].id;
    console.log(`Found track ID: ${trackId}`);

    // Wait before fetching lyrics
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch lyrics
    const lyricsResponse = await axios.get('https://spotify-scraper.p.rapidapi.com/v1/track/lyrics', {
      params: { trackId, format: 'json' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
      }
    });

    if (Array.isArray(lyricsResponse.data) && lyricsResponse.data.length > 0) {
      console.log(`Found ${lyricsResponse.data.length} lyrics lines`);
      return lyricsResponse.data.map((line: any) => ({
        text: line.text,
        timestamp: Math.floor(line.startMs / 1000),
        translation: "" // We'll add translations later with AI
      }));
    }

    return null;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('Starting targeted lyrics fetching...\n');

  for (const song of TARGET_SONGS) {
    console.log(`\n--- Processing: ${song.title} ---`);
    
    const lyrics = await searchAndFetchLyrics(song.title, song.artist);
    
    if (lyrics) {
      await db
        .update(songs)
        .set({ lyrics: JSON.stringify(lyrics) })
        .where(eq(songs.id, song.id));
      
      console.log(`✅ Updated lyrics for: ${song.title}`);
    } else {
      console.log(`❌ Could not fetch lyrics for: ${song.title}`);
    }

    // Wait between songs
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n--- Completed! ---');
}

main().catch(console.error);