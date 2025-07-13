import axios from 'axios';
import OpenAI from 'openai';
import { db } from '../server/db';
import { songs } from '../shared/schema';
import { eq } from 'drizzle-orm';

const RAPIDAPI_KEY = '1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateLyrics() {
  try {
    console.log('Fetching 99 Luftballons from Spotify...');
    
    // Search for the track
    const searchResponse = await axios.get('https://spotify-scraper.p.rapidapi.com/v1/search', {
      params: { term: '99 Luftballons Nena', type: 'track' },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
      }
    });

    const trackId = searchResponse.data.tracks.items[0].id;
    console.log(`Track ID: ${trackId}`);

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

    if (!Array.isArray(lyricsResponse.data) || lyricsResponse.data.length === 0) {
      throw new Error('No lyrics found');
    }

    const lyricsData = lyricsResponse.data;
    console.log(`Found ${lyricsData.length} lyrics lines`);

    // Extract text for translation
    const lyricsTexts = lyricsData.map((line: any) => line.text);
    
    console.log('Translating with OpenAI...');
    
    // Translate in smaller chunks to avoid timeout
    const chunkSize = 15;
    const allTranslations: string[] = [];
    
    for (let i = 0; i < lyricsTexts.length; i += chunkSize) {
      const chunk = lyricsTexts.slice(i, i + chunkSize);
      console.log(`Translating chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(lyricsTexts.length/chunkSize)}...`);
      
      const prompt = `Translate these German song lyrics to English. Provide only the translations, one per line, maintaining the same order:

${chunk.join('\n')}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      const translationsText = response.choices[0].message.content;
      if (translationsText) {
        const translations = translationsText.split('\n').filter(line => line.trim());
        allTranslations.push(...translations);
      }
      
      // Wait between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Got ${allTranslations.length} translations total`);

    // Combine with original data
    const finalLyrics = lyricsData.map((line: any, index: number) => ({
      text: line.text,
      timestamp: Math.floor(line.startMs / 1000),
      translation: allTranslations[index] || `[Translation missing for: ${line.text}]`
    }));

    // Update database
    await db
      .update(songs)
      .set({ lyrics: JSON.stringify(finalLyrics) })
      .where(eq(songs.id, 7));

    console.log('✅ Successfully updated 99 Luftballons with translations!');
    
    // Show first few examples
    console.log('\nFirst 5 lines with translations:');
    finalLyrics.slice(0, 5).forEach((line, i) => {
      console.log(`${i+1}. "${line.text}" → "${line.translation}"`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

translateLyrics();