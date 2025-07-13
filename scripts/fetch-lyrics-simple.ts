import axios from 'axios';
import OpenAI from 'openai';
import { db } from '../server/db';
import { songs } from '../shared/schema';
import { eq } from 'drizzle-orm';

const RAPIDAPI_KEY = '1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Process specific song for testing
const TARGET_SONGS = [
  { id: 7, title: "99 Luftballons", artist: "Nena", language: "de" }
];

async function translateLyricsWithAI(lyrics: string[], language: string): Promise<string[]> {
  try {
    console.log(`Translating ${lyrics.length} lyrics lines from ${language} to English...`);
    
    const prompt = `Translate these song lyrics from ${language} to English. Provide only the translations, one per line, maintaining the same order. Keep translations natural and poetic when appropriate:

${lyrics.join('\n')}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const translationsText = response.choices[0].message.content;
    if (!translationsText) {
      throw new Error('No translation received from OpenAI');
    }

    const translations = translationsText.split('\n').filter(line => line.trim());
    console.log(`Received ${translations.length} translations`);
    
    return translations;
  } catch (error) {
    console.error('Error translating lyrics:', error);
    return lyrics.map(lyric => `[Translation needed: ${lyric}]`);
  }
}

async function searchAndFetchLyrics(title: string, artist: string, language: string) {
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
      
      // Extract just the text for translation
      const lyricsTexts = lyricsResponse.data.map((line: any) => line.text);
      
      // Get AI translations
      const translations = await translateLyricsWithAI(lyricsTexts, language);
      
      // Combine lyrics with translations
      return lyricsResponse.data.map((line: any, index: number) => ({
        text: line.text,
        timestamp: Math.floor(line.startMs / 1000),
        translation: translations[index] || `[Translation needed: ${line.text}]`
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
    
    const lyrics = await searchAndFetchLyrics(song.title, song.artist, song.language);
    
    if (lyrics) {
      await db
        .update(songs)
        .set({ lyrics: JSON.stringify(lyrics) })
        .where(eq(songs.id, song.id));
      
      console.log(`✅ Updated lyrics with AI translations for: ${song.title}`);
      console.log(`First few lines:`)
      lyrics.slice(0, 3).forEach((line, i) => {
        console.log(`  ${i+1}. "${line.text}" → "${line.translation}"`);
      });
    } else {
      console.log(`❌ Could not fetch lyrics for: ${song.title}`);
    }

    // Wait between songs
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n--- Completed! ---');
}

main().catch(console.error);